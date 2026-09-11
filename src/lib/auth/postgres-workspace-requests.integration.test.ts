import { afterEach, describe, expect, it } from "vitest";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { createUser, uniqueSlug } from "@/test/postgres/fixtures";
import { defaultEntitlementsForLevel } from "@/lib/entitlements/default-entitlements";
import {
  approvePostgresWorkspaceRequest,
  listPostgresWorkspaceRequests,
  rejectPostgresWorkspaceRequest,
} from "@/lib/auth/postgres-workspace-requests";

const sql = testSqlExecutor();

afterEach(async () => {
  await truncateAllTenantData();
});

async function createWorkspaceRequest(
  applicantId: string,
  overrides: { slug?: string; workspaceName?: string; productLevel?: string } = {},
) {
  const result = await sql.query<{ id: string }>(
    `insert into public.workspace_requests
       (user_id, email, tenant_type, requested_product_level, workspace_name, slug, mobile_phone, whatsapp_phone)
     select $1, u.email, 'center', $2::public.product_level, $3, $4, '+201000000001', '+201000000001'
     from public.app_users u where u.id = $1
     returning id`,
    [
      applicantId,
      overrides.productLevel ?? "operations",
      overrides.workspaceName ?? "Applicant Center",
      overrides.slug ?? uniqueSlug("workspace"),
    ],
  );
  return result.rows[0]!.id;
}

describe("Workspace request approval (real database)", () => {
  it("lists only pending requests", async () => {
    const applicant = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id);
    const requests = await listPostgresWorkspaceRequests(sql);
    expect(requests.map((r) => r.id)).toContain(requestId);
  });

  it("approving a request transactionally creates a tenant, owner membership, and updates the request", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id);

    const approved = await approvePostgresWorkspaceRequest(sql, requestId, reviewer.id);

    const tenant = await sql.query("select 1 from public.tenants where id = $1", [approved.tenantId]);
    expect(tenant.rowCount).toBe(1);

    const membership = await sql.query<{ role: string }>(
      "select role::text as role from public.memberships where tenant_id = $1 and user_id = $2",
      [approved.tenantId, applicant.id],
    );
    expect(membership.rows[0]?.role).toBe("owner");

    const request = await sql.query<{ status: string; tenant_id: string }>(
      "select status::text as status, tenant_id from public.workspace_requests where id = $1",
      [requestId],
    );
    expect(request.rows[0]?.status).toBe("approved");
    expect(request.rows[0]?.tenant_id).toBe(approved.tenantId);

    const audit = await sql.query("select 1 from public.platform_audit_logs where entity_id = $1 and action = 'workspace_request.approved'", [requestId]);
    expect(audit.rowCount).toBe(1);
  });

  it("rejects double approval of the same request", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id);

    await approvePostgresWorkspaceRequest(sql, requestId, reviewer.id);
    await expect(approvePostgresWorkspaceRequest(sql, requestId, reviewer.id)).rejects.toThrow();
  });

  it("rejecting a request does not create a tenant and records rejection audit", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id);

    await rejectPostgresWorkspaceRequest(sql, requestId, reviewer.id, "بيانات غير مكتملة");

    const request = await sql.query<{ status: string; tenant_id: string | null }>(
      "select status::text as status, tenant_id from public.workspace_requests where id = $1",
      [requestId],
    );
    expect(request.rows[0]?.status).toBe("rejected");
    expect(request.rows[0]?.tenant_id).toBeNull();

    const tenants = await sql.query("select count(*)::int as count from public.tenants");
    expect(tenants.rows[0]?.count).toBe(0);

    const audit = await sql.query("select 1 from public.platform_audit_logs where entity_id = $1 and action = 'workspace_request.rejected'", [requestId]);
    expect(audit.rowCount).toBe(1);
  });

  it("a failed approval step leaves no partial tenant or membership behind", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id, { slug: "duplicate-slug-race" });

    await sql.query(
      `insert into public.tenants (name, slug, tenant_type, product_level, status, created_by) values ('Existing', 'duplicate-slug-race', 'center', 'operations', 'active', $1)`,
      [reviewer.id],
    );

    await expect(approvePostgresWorkspaceRequest(sql, requestId, reviewer.id)).rejects.toThrow();

    const tenants = await sql.query("select count(*)::int as count from public.tenants");
    expect(tenants.rows[0]?.count).toBe(1);
    const memberships = await sql.query("select count(*)::int as count from public.memberships");
    expect(memberships.rows[0]?.count).toBe(0);
    const request = await sql.query<{ status: string }>("select status::text as status from public.workspace_requests where id = $1", [requestId]);
    expect(request.rows[0]?.status).toBe("pending_approval");
  });

  it("creates the tenant on the requested customer type and product level", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id);

    const approved = await approvePostgresWorkspaceRequest(sql, requestId, reviewer.id);

    const tenant = await sql.query<{ tenant_type: string; product_level: string }>(
      "select tenant_type::text as tenant_type, product_level::text as product_level from public.tenants where id = $1",
      [approved.tenantId],
    );
    expect(tenant.rows[0]?.tenant_type).toBe("center");
    expect(tenant.rows[0]?.product_level).toBe("operations");
  });

  it("grants exactly the capabilities of the requested level and nothing above it", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id, { productLevel: "management_platform" });

    const approved = await approvePostgresWorkspaceRequest(sql, requestId, reviewer.id);

    const granted = await sql.query<{ capability_key: string; source: string; state: string }>(
      "select capability_key, source::text as source, state::text as state from public.tenant_entitlements where tenant_id = $1 order by capability_key",
      [approved.tenantId],
    );

    const expected = defaultEntitlementsForLevel("management_platform").slice().sort();
    expect(granted.rows.map((row) => row.capability_key)).toEqual(expected);
    expect(expected).toContain("ops.core");
    expect(expected).toContain("platform.portal.student");
    expect(granted.rows.map((row) => row.capability_key)).not.toContain("learning.courses");
    for (const row of granted.rows) {
      expect(row.source).toBe("plan");
      expect(row.state).toBe("active");
    }
  });

  it("grants the full learning capability set for a learning platform request", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id, { productLevel: "learning_platform" });

    const approved = await approvePostgresWorkspaceRequest(sql, requestId, reviewer.id);

    const granted = await sql.query<{ capability_key: string }>(
      "select capability_key from public.tenant_entitlements where tenant_id = $1",
      [approved.tenantId],
    );
    const keys = granted.rows.map((row) => row.capability_key);
    expect(keys).toContain("ops.core");
    expect(keys).toContain("platform.exams");
    expect(keys).toContain("learning.video");
    expect(keys).toEqual(defaultEntitlementsForLevel("learning_platform"));
  });

  it("records the customer type and product level decision in the platform audit log", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id, { productLevel: "learning_platform" });

    const approved = await approvePostgresWorkspaceRequest(sql, requestId, reviewer.id);

    const audit = await sql.query<{ details: { productLevel?: string; tenantType?: string } }>(
      "select details from public.platform_audit_logs where entity_id = $1 and action = 'workspace_request.approved'",
      [requestId],
    );
    expect(audit.rows[0]?.details.productLevel).toBe("learning_platform");
    expect(audit.rows[0]?.details.tenantType).toBe("center");
    expect(approved.tenantId).toBeTruthy();
  });

  it("grants no entitlement when a request is rejected", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id);

    await rejectPostgresWorkspaceRequest(sql, requestId, reviewer.id, "بيانات غير مكتملة");

    const entitlements = await sql.query("select count(*)::int as count from public.tenant_entitlements");
    expect(entitlements.rows[0]?.count).toBe(0);
  });

  it("refuses to remove a catalog capability that a tenant still holds", async () => {
    const applicant = await createUser(sql);
    const reviewer = await createUser(sql);
    const requestId = await createWorkspaceRequest(applicant.id);
    await approvePostgresWorkspaceRequest(sql, requestId, reviewer.id);

    await expect(
      sql.query("delete from public.capability_catalog where key = 'ops.core'"),
    ).rejects.toThrow();
  });
});
