"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bell, BookOpen, CalendarCheck, ChevronDown, GraduationCap, LayoutDashboard, Menu, MessageCircle, MoreHorizontal, Settings, Users, UsersRound, Wallet, X } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { ActionSubmitButton } from "@/app/team/team-client";

const items = [
  { label: "الرئيسية", icon: LayoutDashboard, href: "/" },
  { label: "الطلاب", icon: Users, href: "/" },
  { label: "المجموعات", icon: GraduationCap, href: "/" },
  { label: "الحضور", icon: CalendarCheck, href: "/" },
  { label: "التحصيل", icon: Wallet, href: "/" },
  { label: "المحتوى", icon: BookOpen, href: "/" },
  { label: "الرسائل", icon: MessageCircle, href: "/" },
  { label: "الإعدادات", icon: Settings, href: "/" },
  { label: "الفريق والدعوات", icon: UsersRound, href: "/team" },
] as const;

function Logo() {
  return <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200"><GraduationCap size={25}/></span><div><b className="block text-[15px]">Smart Edu</b><span className="text-[11px] text-[#858197]">Center Management</span></div></div>;
}

export function ManagementRouteShell({ activeLabel, children }: { activeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div dir="rtl" className="min-h-dvh bg-[#f6f5fb] text-[#17152b] lg:flex">
    <button aria-label="إغلاق القائمة" onClick={()=>setOpen(false)} className={`fixed inset-0 z-30 bg-slate-950/30 transition lg:hidden ${open?"opacity-100":"pointer-events-none opacity-0"}`}/>
    <aside className={`fixed right-0 top-0 z-40 flex h-dvh w-[272px] flex-col border-l border-[#e9e6f2] bg-white px-5 py-7 transition-transform lg:sticky lg:translate-x-0 ${open?"translate-x-0":"translate-x-full"}`}>
      <div className="mb-8 flex items-center justify-between"><Logo/><button aria-label="إغلاق" onClick={()=>setOpen(false)} className="lg:hidden"><X/></button></div>
      <nav className="space-y-1.5" aria-label="القائمة الرئيسية">
        {items.map(({label, icon:Icon, href}) => <Link key={label} href={href} onClick={()=>setOpen(false)} className={`focus-ring flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${activeLabel===label?"bg-[#eeeaff] text-[#6042d3]":"text-[#74718a] hover:bg-[#f8f7fb] hover:text-[#29263d]"}`}><Icon size={19}/>{label}</Link>)}
      </nav>
      <div className="mt-auto rounded-2xl bg-[#f5f2ff] p-4"><p className="text-xs font-bold text-[#5e45bd]">تحتاج مساعدة؟</p><p className="mt-1 text-[11px] leading-5 text-[#817a9a]">فريقنا جاهز لمساعدتك في إعداد السنتر.</p><button className="mt-3 w-full rounded-lg bg-white py-2 text-xs font-bold text-[#6042d3]">تواصل معنا</button></div>
      <div className="mt-5 flex items-center gap-3 border-t border-[#ece9f3] pt-5"><span className="grid size-10 place-items-center rounded-full bg-[#231f3d] text-xs font-bold text-white">أم</span><div className="min-w-0 flex-1"><b className="block truncate text-xs">أحمد محمود</b><span className="text-[10px] text-[#9692a5]">مدير السنتر</span></div><MoreHorizontal size={17} className="text-[#9994a8]"/></div>
      <form action={signOut} className="mt-4 border-t border-[#ece9f3] pt-4"><ActionSubmitButton idleLabel="تسجيل الخروج" pendingLabel="جارٍ تسجيل الخروج..." className="focus-ring flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#d95567] transition hover:bg-[#fff0f1]" /></form>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e8e5ef] bg-[#f6f5fb]/90 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3"><button aria-label="فتح القائمة" onClick={()=>setOpen(true)} className="grid size-10 place-items-center rounded-xl bg-white lg:hidden"><Menu size={20}/></button><div><h1 className="text-lg font-extrabold">{activeLabel}</h1><p className="hidden text-[11px] text-[#8c889a] sm:block">إدارة مساحة العمل من نفس لوحة التحكم</p></div></div>
        <div className="flex items-center gap-2"><button aria-label="الإشعارات" className="relative grid size-10 place-items-center rounded-xl border border-[#e5e2eb] bg-white text-[#6f6a80]"><Bell size={18}/><span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-[#ee6376]"/></button><button className="hidden items-center gap-2 rounded-xl border border-[#e5e2eb] bg-white px-3 py-2 text-xs md:flex"><span className="size-2 rounded-full bg-[#2eb486]"/> فرع مدينة نصر <ChevronDown size={14}/></button></div>
      </header>
      <div className="mx-auto max-w-[1500px] p-4 md:p-8">{children}</div>
    </main>
  </div>;
}
