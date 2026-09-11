import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronDown, LogOut, MessageCircle, ReceiptText, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { PortalNotEntitled } from "@/components/portal-not-entitled";
import { getCurrentAccountAccess, getPortalCount } from "@/lib/auth/account-access";
import { getParentPortalData } from "@/lib/portal-data";

const attendanceLabel: Record<string,string> = { present:"حاضر", absent:"غائب", late:"متأخر", excused:"بعذر" };

export default async function ParentPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const access = await getCurrentAccountAccess();
  if (!access.user) redirect("/login");
  if (!access.guardian) redirect("/");
  const data = await getParentPortalData();
  if (!data) redirect("/");

  // غياب الاشتراك حالة واجهة مقصودة، ولا تُقرأ بيانات أي ابن قبل التأكد من الاستحقاق.
  if (!data.entitled) {
    return <PortalNotEntitled portal="guardian" audienceName={data.guardian.full_name} />;
  }

  const params = await searchParams;
  const selectedChild = data.children.find((child) => child.id === params.child) ?? data.children[0] ?? null;
  const selectedChildId = selectedChild?.id ?? null;
  const selectedCohortIds = new Set(
    data.cohortMemberships.filter((row) => row.student_id === selectedChildId).map((row) => row.cohort_id),
  );
  const selectedAttendance = selectedChildId ? data.attendance.filter((row) => row.student_id === selectedChildId) : [];
  const selectedInvoices = selectedChildId ? data.invoices.filter((invoice) => invoice.student_id === selectedChildId) : [];
  const selectedSessions = selectedChildId ? data.sessions.filter((session) => selectedCohortIds.has(session.cohort_id)) : [];

  const now = new Date();
  const upcoming = selectedSessions.filter((session) => new Date(session.starts_at) >= now).slice(0,6);
  const selectedDueTotal = selectedInvoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "void").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const familyDueTotal = data.invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "void").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const relationship = selectedChildId ? data.links.find((link) => link.student_id === selectedChildId)?.relationship : null;

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
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-sm text-white/70">مرحبًا، {data.guardian.full_name}</p><h1 className="mt-2 text-2xl font-extrabold md:text-3xl">تابع كل ما يخص أبناءك من مكان واحد</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">الحضور، المواعيد، الاشتراكات والمستحقات، مع فصل كامل لبيانات كل ابن.</p></div>
            {data.children.length > 1 ? <div className="min-w-[250px]"><p className="mb-2 text-xs font-bold text-white/60">الابن الحالي</p><div className="relative"><select defaultValue={selectedChildId ?? ""} onChange={undefined} className="pointer-events-none w-full appearance-none rounded-xl border border-white/15 bg-white/10 px-4 py-3 pe-10 text-sm font-bold text-white outline-none"><option value={selectedChildId ?? ""}>{selectedChild?.full_name ?? "اختر ابنًا"}</option></select><ChevronDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/70" /></div><div className="mt-2 flex flex-wrap gap-2">{data.children.map((child)=><Link key={child.id} href={`/parent?child=${encodeURIComponent(child.id)}`} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${child.id===selectedChildId?"bg-white text-[#17152b]":"bg-white/10 text-white hover:bg-white/20"}`}>{child.full_name}</Link>)}</div></div> : null}
          </div>
        </section>

        {selectedChild ? <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#e8e5ef] bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-[#6547d9]">الملف الحالي</p><h2 className="mt-1 text-lg font-extrabold">{selectedChild.full_name}</h2><p className="mt-1 text-xs text-[#6f6a80]">{selectedChild.grade_name ?? "المرحلة غير محددة"} · {selectedChild.code}{relationship ? ` · ${relationship}` : ""}</p></div><div className="rounded-xl bg-[#f6f4ff] px-4 py-3 text-sm"><span className="text-xs text-[#6f6a80]">مستحقات هذا الابن</span><b className="mt-1 block text-lg">{selectedDueTotal.toLocaleString("ar-EG")} ج</b></div></section> : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card p-5"><UsersRound className="size-5 text-[#6547d9]" /><p className="mt-4 text-xs text-[#6f6a80]">الأبناء المرتبطون</p><b className="mt-1 block text-2xl">{data.children.length}</b></article>
          <article className="card p-5"><CalendarDays className="size-5 text-[#6547d9]" /><p className="mt-4 text-xs text-[#6f6a80]">حصص {selectedChild?.full_name ?? "الابن"} القادمة</p><b className="mt-1 block text-2xl">{upcoming.length}</b></article>
          <article className="card p-5"><CheckCircle2 className="size-5 text-emerald-600" /><p className="mt-4 text-xs text-[#6f6a80]">سجلات حضور الابن الحالي</p><b className="mt-1 block text-2xl">{selectedAttendance.length}</b></article>
          <article className="card p-5"><ReceiptText className="size-5 text-amber-600" /><p className="mt-4 text-xs text-[#6f6a80]">إجمالي مستحقات كل الأبناء</p><b className="mt-1 block text-2xl">{familyDueTotal.toLocaleString("ar-EG")} ج</b></article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="card p-5 md:p-6"><h2 className="font-extrabold">أبنائي</h2><div className="mt-4 space-y-3">{data.children.map((child)=><Link href={`/parent?child=${encodeURIComponent(child.id)}`} key={child.id} className={`block rounded-xl border p-4 transition ${child.id===selectedChildId?"border-[#6547d9] bg-[#f7f5ff]":"border-[#eeeaf6] hover:border-[#cfc7ee]"}`}><div className="flex items-center justify-between gap-3"><div><b className="text-sm">{child.full_name}</b><span className="mt-1 block text-xs text-[#6f6a80]">{child.grade_name ?? "المرحلة غير محددة"} · {child.code}</span></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${child.id===selectedChildId?"bg-[#6547d9] text-white":"bg-emerald-50 text-emerald-700"}`}>{child.id===selectedChildId?"الحالي":"عرض"}</span></div></Link>)}</div></article>
          <article className="card p-5 md:p-6"><h2 className="font-extrabold">الحضور الأخير — {selectedChild?.full_name ?? ""}</h2>{selectedAttendance.length ? <ul className="mt-4 space-y-3">{selectedAttendance.slice(0,8).map((row)=><li key={`${row.student_id}-${row.session_id}`} className="flex items-center justify-between rounded-xl border border-[#eeeaf6] p-4 text-sm"><span>{new Date(row.marked_at).toLocaleDateString("ar-EG")}</span><b>{attendanceLabel[row.status] ?? row.status}</b></li>)}</ul> : <p className="mt-4 text-sm text-[#6f6a80]">لا توجد سجلات حضور لهذا الابن بعد.</p>}</article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="card p-5 md:p-6"><h2 className="font-extrabold">المستحقات والاشتراكات — {selectedChild?.full_name ?? ""}</h2>{selectedInvoices.length ? <ul className="mt-4 space-y-3">{selectedInvoices.map((invoice)=><li key={invoice.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#eeeaf6] p-4"><div><b className="text-sm">{invoice.title}</b><span className="mt-1 block text-xs text-[#6f6a80]">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("ar-EG") : "بدون تاريخ"}</span></div><b>{Number(invoice.amount).toLocaleString("ar-EG")} ج</b></li>)}</ul> : <p className="mt-4 text-sm text-[#6f6a80]">لا توجد مستحقات لهذا الابن.</p>}</article>
          <article className="card p-5 md:p-6"><h2 className="font-extrabold">الحصص القادمة — {selectedChild?.full_name ?? ""}</h2>{upcoming.length ? <ul className="mt-4 space-y-3">{upcoming.map((session)=><li key={session.id} className="rounded-xl border border-[#eeeaf6] p-4"><b className="text-sm">{new Date(session.starts_at).toLocaleDateString("ar-EG", { weekday:"long", day:"numeric", month:"short" })}</b><span className="mt-1 block text-xs text-[#6f6a80]">{new Date(session.starts_at).toLocaleTimeString("ar-EG", { hour:"2-digit", minute:"2-digit" })}</span></li>)}</ul> : <p className="mt-4 text-sm text-[#6f6a80]">لا توجد حصص قادمة لهذا الابن.</p>}</article>
        </section>

        <section className="mt-6 card border-2 border-dashed border-[#cfc7f5] p-5 md:p-6"><div className="flex items-center gap-2"><MessageCircle className="size-5 text-[#6547d9]" /><h2 className="font-extrabold">الرسائل مع المعلم — {selectedChild?.full_name ?? ""}</h2></div><span className="mt-4 inline-flex rounded-full bg-[#eeeaff] px-3 py-1 text-xs font-bold text-[#6547d9]">الواجهة جاهزة للموديول القادم</span><p className="mt-3 text-sm leading-7 text-[#6f6a80]">سيكون لكل ابن سجل محادثة مستقل مع المعلم/الإدارة حتى لا تختلط رسائل الأبناء ببعضها.</p></section>
      </div>
    </main>
  );
}
