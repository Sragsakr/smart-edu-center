import "server-only";

import type { SqlExecutor } from "@/lib/database/sql-executor";
import { defaultEntitlementsForLevel } from "@/lib/entitlements/default-entitlements";
import type { WorkspaceRequest } from "@/lib/auth/account-access";

type WorkspaceRequestRow = WorkspaceRequest & { user_id: string };

type ApprovedWorkspace = { tenantId: string };

export async function listPostgresWorkspaceRequests(
  sql: SqlExecutor,
): Promise<WorkspaceRequest[]> {
  const result = await sql.query<WorkspaceRequest>(
    `select id, email::text as email, tenant_type::text as tenant_type,
            requested_product_level::text as requested_product_level,
            workspace_name, slug::text as slug, mobile_phone,
            whatsapp_phone, status::text as status, rejection_reason,
            created_at::text as created_at, reviewed_at::text as reviewed_at
     from public.workspace_requests
     where status = 'pending_approval'
     order by created_at asc`,
  );
  return result.rows;
}

export async function approvePostgresWorkspaceRequest(
  sql: SqlExecutor,
  requestId: string,
  reviewerId: string,
): Promise<ApprovedWorkspace> {
  // لا معاملة متداخلة: المستدعي يفتح معاملة واحدة بنطاق المنصة، وهي التي تضمن
  // ذرية الموافقة كاملة. تكرار BEGIN هنا كان سيكسر الضمان لا يقوّيه.
  return (async (transaction: SqlExecutor) => {
    const request = await lockPendingWorkspaceRequest(transaction, requestId);
    const tenant = await createTenant(transaction, request, reviewerId);
    await grantPlanEntitlements(transaction, tenant.tenantId, request);
    await transaction.query(
      `insert into public.memberships (tenant_id, user_id, role, active)
       values ($1, $2, 'owner', true)`,
      [tenant.tenantId, request.user_id],
    );
    await transaction.query(
      `update public.workspace_requests
       set status = 'approved', reviewed_by = $1, reviewed_at = now(), tenant_id = $2
       where id = $3`,
      [reviewerId, tenant.tenantId, request.id],
    );
    await transaction.query(
      `insert into public.platform_audit_logs
         (actor_user_id, action, entity_type, entity_id, details)
       values ($1, 'workspace_request.approved', 'workspace_request', $2, $3::jsonb)`,
      [
        reviewerId,
        request.id,
        JSON.stringify({
          tenantId: tenant.tenantId,
          ownerId: request.user_id,
          tenantType: request.tenant_type,
          productLevel: request.requested_product_level,
        }),
      ],
    );
    return tenant;
  })(sql)
}

/**
 * منح قدرات المستوى المطلوب عند الموافقة.
 *
 * `defaultEntitlementsForLevel` هو الاشتقاق الوحيد لقدرات المستوى، فلا تُكرَّر القائمة هنا.
 * المنح بلا `source_ref` لأن المصدر `plan`.
 */
async function grantPlanEntitlements(
  sql: SqlExecutor,
  tenantId: string,
  request: WorkspaceRequestRow,
): Promise<void> {
  const capabilityKeys = defaultEntitlementsForLevel(request.requested_product_level);
  if (capabilityKeys.length === 0) return;
  await sql.query(
    `insert into public.tenant_entitlements (tenant_id, capability_key, state, source, source_ref)
     select $1, catalog.key, 'active', 'plan', null
     from unnest($2::text[]) as catalog(key)
     on conflict (tenant_id, capability_key) do nothing`,
    [tenantId, capabilityKeys],
  );
}

async function lockPendingWorkspaceRequest(
  sql: SqlExecutor,
  requestId: string,
): Promise<WorkspaceRequestRow> {
  const result = await sql.query<WorkspaceRequestRow>(
    `select id, user_id, email::text as email, tenant_type::text as tenant_type,
            requested_product_level::text as requested_product_level,
            workspace_name, slug::text as slug,
            mobile_phone, whatsapp_phone, status::text as status, rejection_reason,
            created_at::text as created_at, reviewed_at::text as reviewed_at
     from public.workspace_requests
     where id = $1
     for update`,
    [requestId],
  );
  const request = result.rows[0];
  if (!request || request.status !== "pending_approval") {
    throw new Error("workspace request is no longer pending");
  }
  return request;
}

async function createTenant(
  sql: SqlExecutor,
  request: WorkspaceRequestRow,
  reviewerId: string,
): Promise<ApprovedWorkspace> {
  const result = await sql.query<ApprovedWorkspace>(
    `insert into public.tenants (name, slug, tenant_type, product_level, status, created_by)
     values ($1, $2, $3, $4, 'active', $5)
     returning id as "tenantId"`,
    [
      request.workspace_name,
      request.slug,
      request.tenant_type,
      request.requested_product_level,
      request.user_id,
    ],
  );
  const tenant = result.rows[0];
  if (!tenant) throw new Error(`tenant creation failed for reviewer ${reviewerId}`);
  return tenant;
}

export async function rejectPostgresWorkspaceRequest(
  sql: SqlExecutor,
  requestId: string,
  reviewerId: string,
  reason: string,
): Promise<void> {
  const result = await sql.query(
    `update public.workspace_requests
     set status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = now()
     where id = $3 and status = 'pending_approval'`,
    [reason, reviewerId, requestId],
  );
  if (result.rowCount !== 1) throw new Error("workspace request is no longer pending");
  await sql.query(
    `insert into public.platform_audit_logs
       (actor_user_id, action, entity_type, entity_id, details)
     values ($1, 'workspace_request.rejected', 'workspace_request', $2, $3::jsonb)`,
    [reviewerId, requestId, JSON.stringify({ reason })],
  );
}
