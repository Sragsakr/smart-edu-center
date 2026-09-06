import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";

export default async function HomePage() {
  const access = await getCurrentAccountAccess();
  if (!access.user) return <LandingPage />;
  if (access.isPlatformAdmin) redirect("/platform-admin/requests");
  if (access.membership) return <Dashboard />;
  if (access.request) redirect("/account-status");
  redirect("/onboarding");
}