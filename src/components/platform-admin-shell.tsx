"use client";

import {
  BarChart3,
  Building2,
  FileKey2,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";

const navigationItems = [
  { href: "/platform-admin", label: "نظرة عامة", Icon: LayoutDashboard },
  { href: "/platform-admin/requests", label: "طلبات الحسابات", Icon: UserRoundCheck },
  { href: "/platform-admin/password-resets", label: "استعادة كلمة المرور", Icon: FileKey2 },
  { href: "/platform-admin/tenants", label: "السناتر والمدرسون", Icon: Building2 },
  { href: "/platform-admin/users", label: "المستخدمون", Icon: Users },
  { href: "/platform-admin/reports", label: "التقارير", Icon: BarChart3 },
  { href: "/platform-admin/audit", label: "سجل التدقيق", Icon: ScrollText },
] as const;

function isCurrentRoute(pathname: string, href: string) {
  return href === "/platform-admin" ? pathname === href : pathname.startsWith(href);
}

function SidebarContents({ pathname, closeSidebar }: { pathname: string; closeSidebar?: () => void }) {
  return (
    <>
      <Link href="/platform-admin" onClick={closeSidebar} className="focus-ring flex items-center gap-3 rounded-xl">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200">
          <ShieldCheck size={23} aria-hidden="true" />
        </span>
        <span>
          <b className="block text-sm">إدارة المنصة</b>
          <span className="text-[11px] text-[#6f6a80]">Smart Edu Control</span>
        </span>
      </Link>

      <nav aria-label="قائمة إدارة المنصة" className="mt-6 space-y-1.5 border-t border-[#efedf4] pt-6">
        {navigationItems.map(({ href, label, Icon }) => {
          const active = isCurrentRoute(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={closeSidebar}
              className={`focus-ring flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-[#eeeaff] text-[#6042d3]"
                  : "text-[#74718a] hover:bg-[#f8f7fb] hover:text-[#29263d]"
              }`}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-auto border-t border-[#efedf4] pt-5">
        <button
          type="submit"
          className="focus-ring flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          <LogOut size={19} aria-hidden="true" />
          تسجيل الخروج
        </button>
      </form>
    </>
  );
}

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#f6f5fb] lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[286px] shrink-0 flex-col border-l border-[#e8e5f1] bg-white px-5 py-6 lg:flex">
        <SidebarContents pathname={pathname} />
      </aside>

      {sidebarOpen ? (
        <>
          <button
            type="button"
            aria-label="إغلاق قائمة إدارة المنصة"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
          />
          <aside
            id="platform-admin-sidebar"
            className="fixed inset-y-0 right-0 z-50 flex w-[286px] flex-col border-l border-[#e8e5f1] bg-white px-5 py-6 shadow-2xl lg:hidden"
          >
            <div className="mb-[-44px] flex justify-end">
              <button
                type="button"
                aria-label="إغلاق القائمة"
                onClick={() => setSidebarOpen(false)}
                className="focus-ring z-10 rounded-lg p-2 text-[#777386]"
              >
                <X size={21} aria-hidden="true" />
              </button>
            </div>
            <SidebarContents pathname={pathname} closeSidebar={() => setSidebarOpen(false)} />
          </aside>
        </>
      ) : null}

      <div className="min-w-0 flex-1" inert={sidebarOpen ? true : undefined}>
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#e8e5f1] bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="فتح قائمة إدارة المنصة"
            aria-controls="platform-admin-sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
            className="focus-ring rounded-xl border border-[#e5e2ec] p-2.5 text-[#29263d]"
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <span className="mr-3 text-sm font-extrabold">إدارة المنصة</span>
        </header>
        {children}
      </div>
    </div>
  );
}
