import Link from "next/link";
import { BookOpen, CalendarDays, CheckCircle2, Clock3, GraduationCap, LogOut, ReceiptText, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { getCurrentAccountAccess, getPortalCount } from "@/lib/auth/account-access";
import { getStudentPortalData } from "@/lib/portal-data";

const attendanceLabel: Record<string,string> = { present:"حاضر", absent:"غائب", late:"متأخر", excused:"بعذر" };

export default async function StudentPage() {
  const access = await getCurrentAccountAccess();
  if (!access.user) redirect("/login");
  if (!access.student) redirect("/");
  const data = await getStudentPortalData();
  if (!data) redirect("/");

  const now = new Date();
  const upcoming = data.sessions.filter((session) => new Date(session.starts_at) >= now).slice(0,4);
  const dueTotal = data.invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "void").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const paidTotal = data.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <main dir="rtl" className="min-h-dvh bg-[#f6f5fb] text-[#17152b]">
      <header className="border-b border-[#e8e5ef] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#6547d9] text-white"><GraduationCap /></span><div><b className="block">بوابة الطالب</b><span className="text-xs text-[#6f6a80]">{data.student.full_name} · {data.student.code}</span></div></div>
          <div className="flex items-center gap-2">
            {getPortalCount(access) > 1 ? <Link href="/choose-context" className="rounded-xl border border-[#ddd8e9] px-3 py-2 text-xs font-bold">تغيير الواجهة</Link> : null}
            <form action={signOut}><button className="rounded-xl border border-[#ddd8e9] p-2.5 text-[#6f6a80]" aria-label="تسجيل الخروج"><LogOut className="size-4" /></button></form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <section className="rounded-3xl bg-[#17152b] p-6 text-white md:p-8">
          <p className="text-sm text-white/70">مرحبًا، {data.student.full_name}</p>
          <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">كل رحلتك الدراسية في مكان واحد</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">الحصص، الحضور، الاشتراكات والمدفوعات. وعند تفعيل منصة الكورسات من السنتر ستظهر كورساتك هنا تلقائيًا.</p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card p-5"><CalendarDays className="size-5 text-[#6547d9]" /><p className="mt-4 text-xs text-[#6f6a80]">الحصص القادمة</p><b className="mt-1 block text-2xl">{upcoming.length}</b></article>
          <article className="card p-5"><CheckCircle2 className="size-5 text-emerald-600" /><p className="mt-4 text-xs text-[#6f6a80]">مرات الحضور المسجلة</p><b className="mt-1 block text-2xl">{data.attendance.length}</b></article>
          <article className="card p-5"><Wallet className="size-5 text-amber-600" /><p className="mt-4 text-xs text-[#6f6a80]">إجمالي المستحق</p><b className="mt-1 block text-2xl">{dueTotal.toLocaleString("ar-EG")} ج</b></article>
          <article className="card p-5"><ReceiptText className="size-5 text-[#6547d9]" /><p className="mt-4 text-xs text-[#6f6a80]">المدفوع المسجل</p><b className="mt-1 block text-2xl">{paidTotal.toLocaleString("ar-EG")} ج</b></article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="card p-5 md:p-6"><div className="flex items-center gap-2"><Clock3 className="size-5 text-[#6547d9]" /><h2 className="font-extrabold">الحصص القادمة</h2></div>{upcoming.length ? <ul className="mt-4 space-y-3">{upcoming.map((session)=><li key={session.id} className="rounded-xl border border-[#eeeaf6] p-4"><b className="text-sm">{new Date(session.starts_at).toLocaleDateString("ar-EG",{weekday:"long",day:"numeric",month:"short"})}</b><span className="mt-1 block text-xs text-[#6f6a80]">{new Date(session.starts_at).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})} · {session.notes ?? "حصة دراسية"}</span></li>)}</ul> : <p className="mt-4 text-sm text-[#6f6a80]">لا توجد حصص قادمة مسجلة.</p>}</article>
          <article className="card p-5 md:p-6"><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-[#6547d9]" /><h2 className="font-extrabold">آخر الحضور</h2></div>{data.attendance.length ? <ul className="mt-4 space-y-3">{data.attendance.slice(0,6).map((row)=><li key={`${row.session_id}-${row.marked_at}`} className="flex items-center justify-between rounded-xl border border-[#eeeaf6] p-4 text-sm"><span>{new Date(row.marked_at).toLocaleDateString("ar-EG")}</span><b>{attendanceLabel[row.status] ?? row.status}</b></li>)}</ul> : <p className="mt-4 text-sm text-[#6f6a80]">لا يوجد سجل حضور بعد.</p>}</article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="card p-5 md:p-6"><div className="flex items-center gap-2"><ReceiptText className="size-5 text-[#6547d9]" /><h2 className="font-extrabold">اشتراكاتي ومستحقاتي</h2></div><ul className="mt-4 space-y-3">{data.invoices.map((invoice)=><li key={invoice.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#eeeaf6] p-4"><div><b className="text-sm">{invoice.title}</b><span className="mt-1 block text-xs text-[#6f6a80]">{invoice.due_date ? `الاستحقاق ${new Date(invoice.due_date).toLocaleDateString("ar-EG")}` : "بدون تاريخ استحقاق"}</span></div><b className="shrink-0">{Number(invoice.amount).toLocaleString("ar-EG")} ج</b></li>)}</ul></article>
          <article className="card border-2 border-dashed border-[#cfc7f5] p-5 md:p-6"><div className="flex items-center gap-2"><BookOpen className="size-5 text-[#6547d9]" /><h2 className="font-extrabold">كورساتي Online</h2></div><span className="mt-4 inline-flex rounded-full bg-[#eeeaff] px-3 py-1 text-xs font-bold text-[#6547d9]">تظهر عند تفعيل LMS</span><p className="mt-3 text-sm leading-7 text-[#6f6a80]">عند اشتراك السنتر أو المدرس في منصة الكورسات، ستظهر هنا الكورسات المفعلة لهذا الطالب والتقدم والاختبارات دون خلطها مع اشتراك السنتر الحضوري.</p></article>
        </section>
      </div>
    </main>
  );
}
