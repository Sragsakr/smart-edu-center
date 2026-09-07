import Link from "next/link";
import { BarChart3, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { getPlatformReport } from "@/lib/platform-admin-data";

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="mt-5 space-y-4">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">{row.label}</span>
            <b>{row.value}</b>
          </div>
          <div className="h-2 rounded-full bg-[#eeeaf6]">
            <div className="h-2 rounded-full bg-[#6547d9]" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function PlatformReportsPage() {
  const report = await getPlatformReport();

  return (
    <main className="min-h-dvh bg-[#f6f5fb] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#6547d9] text-white">
              <ShieldCheck size={24} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold text-[#6547d9]">إدارة المنصة</p>
              <h1 className="text-2xl font-extrabold">تقارير الـSaaS</h1>
            </div>
          </div>
          <nav className="flex gap-3 text-sm font-bold">
            <Link href="/platform-admin" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2">نظرة عامة</Link>
            <form action={signOut}>
              <button type="submit" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2">خروج</button>
            </form>
          </nav>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="card p-6">
            <h2 className="flex items-center gap-2 font-extrabold"><BarChart3 className="size-5 text-[#6547d9]" /> المساحات حسب النوع</h2>
            <Bars rows={report.tenantByType} />
          </article>
          <article className="card p-6">
            <h2 className="flex items-center gap-2 font-extrabold"><BarChart3 className="size-5 text-[#6547d9]" /> طلبات الحسابات حسب الحالة</h2>
            <Bars rows={report.requestsByStatus} />
          </article>
          <article className="card p-6">
            <h2 className="flex items-center gap-2 font-extrabold"><BarChart3 className="size-5 text-[#6547d9]" /> العضويات حسب الدور</h2>
            <Bars rows={report.membershipsByRole} />
          </article>
          <article className="card p-6">
            <h2 className="font-extrabold">حالة الطلاب</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-emerald-50 p-4">
                <strong className="text-2xl text-emerald-700">{report.activeStudents}</strong>
                <span className="mt-1 block text-xs text-emerald-800">طلاب فعالون</span>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <strong className="text-2xl text-red-700">{report.inactiveStudents}</strong>
                <span className="mt-1 block text-xs text-red-800">طلاب غير فعالين</span>
              </div>
            </div>
          </article>
        </div>
        <p className="mt-6 text-xs text-[#6f6a80]">كل الأرقام والمخططات محسوبة لحظيًا من سجلات Supabase الحالية، ولا توجد قيم ثابتة في الواجهة.</p>
      </div>
    </main>
  );
}