import "server-only";

import { createClient } from "@/lib/supabase/server";

export type WorkspaceRequestStatus = "pending_approval" | "approved" | "rejected";

export type WorkspaceRequest = {
  id: string;
  email: string;
  account_type: "center" | "independent_teacher";
  workspace_name: string;
  slug: string;
  mobile_phone: string | null;
  whatsapp_phone: string | null;
  status: WorkspaceRequestStatus;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const workspaceRequestFields =
  "id,email,account_type,workspace_name,slug,mobile_phone,whatsapp_phone,status,rejection_reason,created_at,reviewed_at";

export async function getCurrentAccountAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, membership: null, request: null, isPlatformAdmin: false };

  const [membershipLookup, requestLookup, adminLookup] = await Promise.all([
    supabase
      .from("memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workspace_requests")
      .select(workspaceRequestFields)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const lookupError = membershipLookup.error ?? requestLookup.error ?? adminLookup.error;
  if (lookupError) throw new Error("تعذر التحقق من صلاحية الحساب");

  return {
    user,
    membership: membershipLookup.data,
    request: requestLookup.data as WorkspaceRequest | null,
    isPlatformAdmin: Boolean(adminLookup.data),
  };
}

export type PasswordResetRequest = {
  id: string;
  requested_email: string;
  whatsapp_phone: string;
  status: "pending" | "code_ready" | "rejected" | "consumed" | "expired";
  created_at: string;
};

export async function listPendingPasswordResetRequests(): Promise<PasswordResetRequest[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError) throw new Error("تعذر التحقق من صلاحية إدارة المنصة");
  if (!admin) return null;

  const { data: pendingRequests, error: requestsError } = await supabase
    .from("password_reset_requests")
    .select("id,requested_email,whatsapp_phone,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (requestsError) throw new Error("تعذر تحميل طلبات استعادة كلمة المرور");
  return pendingRequests as PasswordResetRequest[];
}

export async function listPendingWorkspaceRequests(): Promise<WorkspaceRequest[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError) throw new Error("تعذر التحقق من صلاحية إدارة المنصة");
  if (!admin) return null;

  const { data: pendingRequests, error: requestsError } = await supabase
    .from("workspace_requests")
    .select(workspaceRequestFields)
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  if (requestsError) throw new Error("تعذر تحميل طلبات الحسابات");
  return pendingRequests as WorkspaceRequest[];
}
