import { BarChart3 } from "lucide-react";
import { getPlatformReport } from "@/lib/platform-admin-data";
import { PlatformPageHeader } from "@/components/platform-page-header";

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
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <PlatformPageHeader title="تقارير الـSaaS" description="مؤشرات مجمعة ومحسوبة مباشرة من بيانات المنصة." />

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
        <p className="mt-6 text-xs text-[#6f6a80]">كل الأرقام والمخططات محسوبة لحظيًا من سجلات PostgreSQL الحالية، ولا توجد قيم ثابتة في الواجهة.</p>
      </div>
    </main>
  );
}
