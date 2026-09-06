import { Dashboard } from "@/components/dashboard";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships").select("tenant_id").eq("user_id", user.id).eq("active", true).limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");
  return <Dashboard />;
}
