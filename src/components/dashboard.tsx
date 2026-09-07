"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, BookOpen, CalendarCheck, ChevronDown, CircleDollarSign, GraduationCap, LayoutDashboard, LogOut, Menu, MessageCircle, MoreHorizontal, Plus, Search, Settings, TrendingUp, UserCheck, Users, UsersRound, Wallet, X } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { ActionSubmitButton } from "@/app/team/team-client";

const nav = [
  ["الرئيسية", LayoutDashboard], ["الطلاب", Users], ["المجموعات", GraduationCap], ["الحضور", CalendarCheck],
  ["التحصيل", Wallet], ["المحتوى", BookOpen], ["الرسائل", MessageCircle], ["الإعدادات", Settings],
] as const;

const students = [
  { name:"عمر أحمد", code:"ST-1024", group:"الصف الثالث الثانوي", paid:true, color:"#6c4ee3" },
  { name:"مريم محمد", code:"ST-1023", group:"الصف الثاني الثانوي", paid:true, color:"#ef7c8e" },
  { name:"يوسف علي", code:"ST-1022", group:"الصف الثالث الثانوي", paid:false, color:"#2faf8f" },
  { name:"سارة محمود", code:"ST-1021", group:"الصف الأول الثانوي", paid:true, color:"#e6a235" },
];

function Logo() { return <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200"><GraduationCap size={25}/></span><div><b className="block text-[15px]">Smart Edu</b><span className="text-[11px] text-[#858197]">Center Management</span></div></div>; }

function Sidebar({active,setActive,open,setOpen}:{active:string;setActive:(x:string)=>void;open:boolean;setOpen:(x:boolean)=>void}) {
  return <><button aria-label="إغلاق القائمة" onClick={()=>setOpen(false)} className={`fixed inset-0 z-30 bg-slate-950/30 transition lg:hidden ${open?"opacity-100":"pointer-events-none opacity-0"}`}/>
    <aside className={`fixed right-0 top-0 z-40 flex h-dvh w-[272px] flex-col border-l border-[#e9e6f2] bg-white px-5 py-7 transition-transform lg:sticky lg:translate-x-0 ${open?"translate-x-0":"translate-x-full"}`}>
      <div className="mb-8 flex items-center justify-between"><Logo/><button aria-label="إغلاق" onClick={()=>setOpen(false)} className="lg:hidden"><X/></button></div>
      <nav className="space-y-1.5" aria-label="القائمة الرئيسية">
        {nav.map(([label,Icon])=><button key={label} onClick={()=>{setActive(label);setOpen(false)}} className={`focus-ring flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active===label?"bg-[#eeeaff] text-[#6042d3]":"text-[#74718a] hover:bg-[#f8f7fb] hover:text-[#29263d]"}`}><Icon size={19}/>{label}</button>)}
        <Link href="/team" onClick={()=>setOpen(false)} className="focus-ring flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#74718a] transition hover:bg-[#f8f7fb] hover:text-[#29263d]"><UsersRound size={19}/>الفريق والدعوات</Link>
      </nav>
      <div className="mt-auto rounded-2xl bg-[#f5f2ff] p-4"><p className="text-xs font-bold text-[#5e45bd]">تحتاج مساعدة؟</p><p className="mt-1 text-[11px] leading-5 text-[#817a9a]">فريقنا جاهز لمساعدتك في إعداد السنتر.</p><button className="mt-3 w-full rounded-lg bg-white py-2 text-xs font-bold text-[#6042d3]">تواصل معنا</button></div>
      <div className="mt-5 flex items-center gap-3 border-t border-[#ece9f3] pt-5"><span className="grid size-10 place-items-center rounded-full bg-[#231f3d] text-xs font-bold text-white">أم</span><div className="min-w-0 flex-1"><b className="block truncate text-xs">أحمد محمود</b><span className="text-[10px] text-[#9692a5]">مدير السنتر</span></div><MoreHorizontal size={17} className="text-[#9994a8]"/></div>
      <form action={signOut} className="mt-4 border-t border-[#ece9f3] pt-4"><ActionSubmitButton idleLabel="تسجيل الخروج" pendingLabel="جارٍ تسجيل الخروج..." className="focus-ring flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#d95567] transition hover:bg-[#fff0f1]" /></form>
    </aside></>;
}

function Stat({title,value,delta,Icon,tone}:{title:string;value:string;delta:string;Icon:typeof Users;tone:string}) { return <article className="card p-5"><div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-2xl" style={{background:`${tone}16`,color:tone}}><Icon size={21}/></span><span className="flex items-center gap-1 rounded-full bg-[#eaf8f1] px-2 py-1 text-[10px] font-bold text-[#299b70]"><TrendingUp size={11}/>{delta}</span></div><p className="mt-5 text-xs text-[#837f94]">{title}</p><strong className="mt-1 block text-2xl font-extrabold tracking-tight">{value}</strong></article>; }

function DashboardHome() {
  const bars=[46,70,55,86,62,78,94];
  return <div className="enter space-y-5">
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Stat title="إجمالي الطلاب" value="1,248" delta="12%" Icon={Users} tone="#6547d9"/><Stat title="حضور اليوم" value="892" delta="8%" Icon={UserCheck} tone="#2fab88"/><Stat title="تحصيل الشهر" value="84,250 ج" delta="18%" Icon={CircleDollarSign} tone="#e09d36"/><Stat title="المبالغ المتأخرة" value="12,800 ج" delta="3%" Icon={Wallet} tone="#e96b7a"/></section>
    <section className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
      <article className="card p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold">نظرة على الحضور</h2><p className="mt-1 text-[11px] text-[#918da0]">نسبة الحضور خلال آخر 7 أيام</p></div><button className="flex items-center gap-2 rounded-lg border border-[#e7e4ed] px-3 py-2 text-[11px]">هذا الأسبوع <ChevronDown size={13}/></button></div><div className="mt-7 flex h-52 items-end gap-3 border-b border-[#ebe8f1] px-2">{bars.map((h,i)=><div key={i} className="group flex h-full flex-1 items-end"><div className="w-full rounded-t-lg bg-[#dcd5ff] transition hover:bg-[#6547d9]" style={{height:`${h}%`}}><span className="sr-only">{h}%</span></div></div>)}</div><div className="mt-3 flex justify-between px-2 text-[10px] text-[#918da0]">{["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"].map(x=><span key={x}>{x}</span>)}</div></article>
      <article className="card p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="font-bold">تحصيل الرسوم</h2><p className="mt-1 text-[11px] text-[#918da0]">سبتمبر 2026</p></div><button><MoreHorizontal size={18}/></button></div><div className="mx-auto mt-7 grid size-40 place-items-center rounded-full" style={{background:"conic-gradient(#6547d9 0 76%,#ebe7f7 76% 100%)"}}><div className="grid size-28 place-items-center rounded-full bg-white text-center"><div><strong className="text-xl">76%</strong><span className="block text-[10px] text-[#918da0]">تم التحصيل</span></div></div></div><div className="mt-6 grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-[#f6f4ff] p-3"><b className="text-sm">84,250 ج</b><span className="block text-[10px] text-[#918da0]">تم التحصيل</span></div><div className="rounded-xl bg-[#fff4f5] p-3"><b className="text-sm">12,800 ج</b><span className="block text-[10px] text-[#918da0]">متأخر</span></div></div></article>
    </section>
    <StudentsTable compact/>
  </div>;
}

function StudentsTable({compact=false}:{compact?:boolean}) {
  const [query,setQuery]=useState(""); const filtered=useMemo(()=>students.filter(s=>s.name.includes(query)||s.code.toLowerCase().includes(query.toLowerCase())),[query]);
  return <article className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 p-5 md:px-6"><div><h2 className="font-bold">{compact?"أحدث الطلاب":"إدارة الطلاب"}</h2><p className="mt-1 text-[11px] text-[#918da0]">بيانات الطلاب وحالة الاشتراك</p></div><div className="flex gap-2"><label className="flex items-center gap-2 rounded-xl border border-[#e5e2ec] bg-white px-3 py-2 text-xs text-[#918da0]"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن طالب" className="w-28 bg-transparent outline-none"/></label><button className="focus-ring flex items-center gap-2 rounded-xl bg-[#6547d9] px-4 py-2 text-xs font-bold text-white"><Plus size={16}/>إضافة</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-right text-xs"><thead className="bg-[#faf9fc] text-[#8b8799]"><tr><th className="px-6 py-3 font-medium">الطالب</th><th className="px-4 py-3 font-medium">الكود</th><th className="px-4 py-3 font-medium">المجموعة</th><th className="px-4 py-3 font-medium">حالة الدفع</th><th className="px-6 py-3"></th></tr></thead><tbody>{filtered.map(s=><tr key={s.code} className="border-t border-[#efedf3]"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full text-[11px] font-bold text-white" style={{background:s.color}}>{s.name.split(" ").map(x=>x[0]).join("")}</span><b>{s.name}</b></div></td><td className="px-4 py-4 text-[#777386]">{s.code}</td><td className="px-4 py-4 text-[#777386]">{s.group}</td><td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-[10px] font-bold ${s.paid?"bg-[#eaf8f1] text-[#26956b]":"bg-[#fff0f1] text-[#d95567]"}`}>{s.paid?"تم الدفع":"متأخر"}</span></td><td className="px-6 py-4"><button aria-label={`خيارات ${s.name}`}><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div></article>;
}

function Placeholder({active}:{active:string}) { const item=nav.find(x=>x[0]===active); const Icon=item?.[1]||BookOpen; return <div className="enter card grid min-h-[520px] place-items-center p-8 text-center"><div><span className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#eeeaff] text-[#6547d9]"><Icon size={34}/></span><h2 className="mt-5 text-xl font-extrabold">{active}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#7f7b8f]">هذه الوحدة ضمن هيكل الـMVP وجاهزة للربط ببيانات Supabase في المرحلة التالية.</p><button className="mt-6 rounded-xl bg-[#6547d9] px-5 py-3 text-xs font-bold text-white">ابدأ الإعداد</button></div></div>; }

export function Dashboard() {
  const [active,setActive]=useState("الرئيسية"),[open,setOpen]=useState(false);
  return <div className="min-h-dvh lg:flex"><Sidebar active={active} setActive={setActive} open={open} setOpen={setOpen}/><main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e8e5ef] bg-[#f6f5fb]/90 px-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button aria-label="فتح القائمة" onClick={()=>setOpen(true)} className="grid size-10 place-items-center rounded-xl bg-white lg:hidden"><Menu size={20}/></button><div><h1 className="text-lg font-extrabold">{active}</h1><p className="hidden text-[11px] text-[#8c889a] sm:block">مرحبًا أحمد، إليك ملخص السنتر اليوم</p></div></div><div className="flex items-center gap-2"><button aria-label="الإشعارات" className="relative grid size-10 place-items-center rounded-xl border border-[#e5e2eb] bg-white text-[#6f6a80]"><Bell size={18}/><span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-[#ee6376]"/></button><button className="hidden items-center gap-2 rounded-xl border border-[#e5e2eb] bg-white px-3 py-2 text-xs md:flex"><span className="size-2 rounded-full bg-[#2eb486]"/> فرع مدينة نصر <ChevronDown size={14}/></button></div></header><div className="mx-auto max-w-[1500px] p-4 md:p-8">{active==="الرئيسية"?<DashboardHome/>:active==="الطلاب"?<StudentsTable/>:<Placeholder active={active}/>}</div></main></div>;
}
