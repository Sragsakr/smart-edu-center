import { redirect } from "next/navigation";
import { PlatformAdminShell } from "@/components/platform-admin-shell";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const access = await getCurrentAccountAccess();
  if (!access.user) redirect("/platform-control/login");
  if (!access.isPlatformAdmin) redirect("/");
  return <PlatformAdminShell>{children}</PlatformAdminShell>;
}
