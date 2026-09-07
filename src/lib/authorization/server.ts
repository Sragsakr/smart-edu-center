import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  capabilityDecision,
  type MemberRole,
  type TenantCapability,
} from "@/lib/authorization/policy";

export type AuthorizedTenantContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string | null };
  tenantId: string;
  role: MemberRole;
};

export class AuthorizationError extends Error {
  constructor(message = "ليس لديك صلاحية لتنفيذ هذه العملية") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getTenantAuthorizationContext(tenantId: string): Promise<AuthorizedTenantContext> {
  if (!tenantId) throw new AuthorizationError("مساحة العمل غير محددة");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership, error } = await supabase
    .from("memberships")
    .select("role,active")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) throw new Error("تعذر التحقق من صلاحيات مساحة العمل");
  if (!membership) throw new AuthorizationError("ليس لديك وصول إلى مساحة العمل المطلوبة");

  return {
    supabase,
    user: { id: user.id, email: user.email },
    tenantId,
    role: membership.role as MemberRole,
  };
}

export async function requireTenantCapability(
  tenantId: string,
  capability: TenantCapability,
): Promise<AuthorizedTenantContext> {
  const context = await getTenantAuthorizationContext(tenantId);
  const decision = capabilityDecision(context.role, capability);

  if (decision === "deny") throw new AuthorizationError();
  if (decision === "scoped") {
    throw new AuthorizationError("هذه الصلاحية تحتاج تحققًا إضافيًا من نطاق المورد");
  }

  return context;
}

export async function requireTenantCapabilityWithScope(
  tenantId: string,
  capability: TenantCapability,
  scopeCheck: (context: AuthorizedTenantContext) => Promise<boolean>,
): Promise<AuthorizedTenantContext> {
  const context = await getTenantAuthorizationContext(tenantId);
  const decision = capabilityDecision(context.role, capability);

  if (decision === "deny") throw new AuthorizationError();
  if (decision === "allow") return context;

  const allowed = await scopeCheck(context);
  if (!allowed) throw new AuthorizationError("المورد المطلوب خارج نطاق صلاحيتك");
  return context;
}
