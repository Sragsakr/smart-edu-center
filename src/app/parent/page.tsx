import Link from "next/link";
import { CalendarDays, CheckCircle2, LogOut, MessageCircle, ReceiptText, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { getCurrentAccountAccess, getPortalCount } from "@/lib/auth/account-access";
import { getParentPortalData } from "@/lib/portal-data";

const attendanceLabel: Record<string,string> = { present:"حاضر", absent:"غائب", late:"متأخر", excused:"بعذر" };

export default async function ParentPage() {
  const access = await getCurrentAccountAccess();
  if (!access.user) redirect("/login");
  if (!access.guardian) redirect("/");
  const data = await getParentPortalData();
  if (!data) redirect("/");

  const now = new Date();
  const upcoming = data.sessions.filter((session) => new Date(session.starts_at) >= now).slice(0,6);
  const dueTotal = data.invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "void").reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <main dir="rtl" className="min-h-dvh bg-[#f6f5fb] text-[#17152b]">
      <header className="border-b border-[#e8e5ef] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#6547d9] text-white"><UsersRound /></span><div><b className="block">بوابة ولي الأمر</b><span className="text-xs text-[#6f6a80]">{data.guardian.full_name}</span></div></div>
          <div className="flex items-center gap-2">
            {getPortalCount(access) > 1 ? <Link href="/choose-context" className="rounded-xl border border-[#ddd8e9] px-3 py-2 text-xs font-bold">تغيير الواجهة</Link> : null}
            <form action={signOut}><button className="rounded-xl border border-[#ddd8e9] p-2.5 text-[#6f6a80]" aria-label="تسجيل الخروج"><LogOut className="size-4" /></button></form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <section className="rounded-3xl bg-[#17152b] p-6 text-white md:p-8">
          <p className="text-sm text-white/70">مرحبًا، {data.guardian.full_name}</p>
          <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">تابع كل ما يخص أبناءك من مكان واحد</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">الحضور، المواعيد، الاشتراكات والمستحقات، ومع تطور النظام ستضاف النتائج والواجبات والرسائل المباشرة مع المعلم.</p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card p-5"><UsersRound className="size-5 text-[#6547d9]" /><p className="mt-4 text-xs text-[#6f6a80]">الأبناء المرتبطون</p><b className="mt-1 block text-2xl">{data.children.length}</b></article>
          <article className="card p-5"><CalendarDays className="size-5 text-[#6547d9]" /><p className="mt-4 text-xs text-[#6f6a80]">الحصص القادمة</p><b className="mt-1 block text-2xl">{upcoming.length}</b></article>
          <article className="card p-5"><CheckCircle2 className="size-5 text-emerald-600" /><p className="mt-4 text-xs text-[#6f6a80]">سجلات الحضور</p><b className="mt-1 block text-2xl">{data.attendance.length}</b></article>
          <article className="card p-5"><ReceiptText className="size-5 text-amber-600" /><p className="mt-4 text-xs text-[#6f6a80]">إجمالي المستحقات</p><b className="mt-1 block text-2xl">{dueTotal.toLocaleString("ar-EG")} ج</b></article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="card p-5 md:p-6"><h2 className="font-extrabold">أبنائي</h2><div className="mt-4 space-y-3">{data.children.map((child)=><div key={child.id} className="rounded-xl border border-[#eeeaf6] p-4"><div className="flex items-center justify-between gap-3"><div><b className="text-sm">{child.full_name}</b><span className="mt-1 block text-xs text-[#6f6a80]">{child.grade ?? "المرحلة غير محددة"} · {child.code}</span></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">نشط</span></div></div>)}</div></article>
          <article className="card p-5 md:p-6"><h2 className="font-extrabold">الحضور الأخير</h2>{data.attendance.length ? <ul className="mt-4 space-y-3">{data.attendance.slice(0,8).map((row)=><li key={`${row.student_id}-${row.session_id}`} className="flex items-center justify-between rounded-xl border border-[#eeeaf6] p-4 text-sm"><span>{new Date(row.marked_at).toLocaleDateString("ar-EG")}</span><b>{attendanceLabel[row.status] ?? row.status}</b></li>)}</ul> : <p className="mt-4 text-sm text-[#6f6a80]">لا توجد سجلات حضور بعد.</p>}</article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="card p-5 md:p-6"><h2 className="font-extrabold">المستحقات والاشتراكات</h2><ul className="mt-4 space-y-3">{data.invoices.map((invoice)=><li key={invoice.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#eeeaf6] p-4"><div><b className="text-sm">{invoice.title}</b><span className="mt-1 block text-xs text-[#6f6a80]">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("ar-EG") : "بدون تاريخ"}</span></div><b>{Number(invoice.amount).toLocaleString("ar-EG")} ج</b></li>)}</ul></article>
          <article className="card border-2 border-dashed border-[#cfc7f5] p-5 md:p-6"><div className="flex items-center gap-2"><MessageCircle className="size-5 text-[#6547d9]" /><h2 className="font-extrabold">الرسائل مع المعلم</h2></div><span className="mt-4 inline-flex rounded-full bg-[#eeeaff] px-3 py-1 text-xs font-bold text-[#6547d9]">الواجهة جاهزة للموديول القادم</span><p className="mt-3 text-sm leading-7 text-[#6f6a80]">سيكون لولي الأمر صندوق رسائل مرتبط بالطالب والمعلم/الإدارة، مع سجل محادثة منفصل عن واتساب وبصلاحيات Tenant واضحة.</p></article>
        </section>
      </div>
    </main>
  );
}
