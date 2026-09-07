import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard";
import { getCurrentAccountAccess, getPortalCount } from "@/lib/auth/account-access";

export default async function HomePage() {
  const access = await getCurrentAccountAccess();
  if (!access.user) return <LandingPage />;
  if (access.isPlatformAdmin && getPortalCount(access) === 0) redirect("/platform-admin");
  if (getPortalCount(access) > 1) redirect("/choose-context");
  if (access.membership) return <Dashboard />;
  if (access.student) redirect("/student");
  if (access.guardian) redirect("/parent");
  if (access.request) redirect("/account-status");
  redirect("/onboarding");
}
