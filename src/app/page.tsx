import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard";
import { getCurrentAccountAccess, getPortalCount } from "@/lib/auth/account-access";

export default async function HomePage() {
  const access = await getCurrentAccountAccess();
  if (!access.user) return <LandingPage />;
  if (access.isPlatformAdmin && getPortalCount(access) === 0) redirect("/platform-admin");
  if (getPortalCount(access) > 1) redirect("/choose-context");
  if (access.membership) return <><Dashboard /><Link href="/team" className="fixed bottom-5 left-5 z-30 rounded-xl bg-[#17152b] px-4 py-3 text-xs font-bold text-white shadow-lg">إدارة الفريق والدعوات</Link></>;
  if (access.student) redirect("/student");
  if (access.guardian) redirect("/parent");
  if (access.request) redirect("/account-status");
  redirect("/onboarding");
}
