import Link from "next/link";
import { ArrowUpRight, Building2, CheckCircle2, GraduationCap, Layers, ShieldCheck, Users, Wallet } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { getOverviewMetrics, listPlatformAudit } from "@/lib/platform-admin-data";

const actionLabels: Record<string, string> = {
  "workspace_request.approved": "تم اعتماد طلب مساحة عمل",
  "workspace_request.rejected": "تم رفض طلب مساحة عمل",
  "password_reset.approved": "تم اعتماد طلب استعادة كلمة المرور",
  "password_reset.rejected": "تم رفض طلب استعادة كلمة المرور",
};

function StatCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: typeof Users;
  tone: string;
}) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-2xl" style={{ background: `${tone}16`, color: tone }}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-xs text-[#6f6a80]">{label}</p>
      <strong className="mt-1 block text-2xl font-extrabold">{value}</strong>
    </article>
  );
}

export default async function PlatformAdminOverview() {
  const [metrics, audit] = await Promise.all([getOverviewMetrics(), listPlatformAudit(6)]);

  return (
    <main className="min-h-dvh bg-[#f6f5fb] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#6547d9] text-white">
              <ShieldCheck size={24} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold text-[#6547d9]">إدارة المنصة</p>
              <h1 className="text-2xl font-extrabold">نظرة عامة على الـSaaS</h1>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/platform-admin/requests" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold">
              الطلبات
            </Link>
            <Link href="/platform-admin/password-resets" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold">
              الاستعادة
            </Link>
            <Link href="/platform-admin/tenants" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold">
              المساحات
            </Link>
            <Link href="/platform-admin/users" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold">
              المستخدمون
            </Link>
            <Link href="/platform-admin/reports" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold">
              التقارير
            </Link>
            <form action={signOut}>
              <button type="submit" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold">
                خروج
              </button>
            </form>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="السناتر" value={metrics.centers} Icon={Building2} tone="#6547d9" />
          <StatCard label="المدرسون المستقلون" value={metrics.independentTeachers} Icon={GraduationCap} tone="#2fab88" />
          <StatCard label="إجمالي المساحات" value={metrics.totalTenants} Icon={Layers} tone="#e09d36" />
          <StatCard label="الطلاب" value={metrics.students} Icon={Users} tone="#ef7c8e" />
          <StatCard label="طلبات إنشاء معلقة" value={metrics.pendingWorkspaceRequests} Icon={CheckCircle2} tone="#e09d36" />
          <StatCard label="عمليات الاستعادة" value={metrics.pendingPasswordResets} Icon={Wallet} tone="#6547d9" />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="card p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">آخر النشاط</h2>
              <Link href="/platform-admin/audit" className="flex items-center gap-1 text-xs font-bold text-[#6547d9]">
                عرض الكل <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            {audit.length === 0 ? (
              <p className="mt-6 text-sm text-[#777386]">لا توجد أحداث تدقيق بعد.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[#efedf3]">
                {audit.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-[#eeeaff] text-xs font-bold text-[#6547d9]">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      </span>
                      <span className="font-semibold">{actionLabels[entry.action] ?? entry.action}</span>
                    </div>
                    <span className="shrink-0 text-xs text-[#6f6a80]" dir="ltr">
                      {new Date(entry.created_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card p-5 md:p-6">
            <h2 className="font-bold">الإجراء السريع</h2>
            <div className="mt-4 space-y-3">
              <Link href="/platform-admin/requests" className="block rounded-xl border border-[#e5e2ec] p-4 text-sm transition hover:bg-[#f8f7fb]">
                <b className="text-[#6547d9]">مراجعة طلبات إنشاء الحسابات</b>
                <span className="mt-1 block text-xs text-[#777386]">الحسابات التي تنتظر التفعيل من المنصة.</span>
              </Link>
              <Link href="/platform-admin/password-resets" className="block rounded-xl border border-[#e5e2ec] p-4 text-sm transition hover:bg-[#f8f7fb]">
                <b className="text-[#6547d9]">معالجة استعادة كلمات المرور</b>
                <span className="mt-1 block text-xs text-[#777386]">توليد أكواد الاستعادة وإرسالها عبر واتساب.</span>
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}