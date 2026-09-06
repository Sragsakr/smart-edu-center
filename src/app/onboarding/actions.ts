"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCenter(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const accountType = formData.get("account_type") === "independent_teacher" ? "independent_teacher" : "center";
  const { data: tenant, error } = await supabase.from("tenants").insert({ name, slug, account_type: accountType, created_by: user.id }).select("id").single();
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  const { error: memberError } = await supabase.from("memberships").insert({ tenant_id: tenant.id, user_id: user.id, role: "owner" });
  if (memberError) redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);
  redirect("/");
}
