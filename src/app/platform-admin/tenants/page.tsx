import { Building2, FileText, GraduationCap, Users } from "lucide-react";
import { listTenants } from "@/lib/platform-admin-data";
import { productLevelLabelsAr } from "@/lib/tenant/product-level";
import { tenantTypeLabelsAr, type TenantType } from "@/lib/tenant/tenant-type";
import { setTenantStatus } from "./actions";
import { PlatformPageHeader } from "@/components/platform-page-header";

export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [tenants, params] = await Promise.all([listTenants(), searchParams]);

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <PlatformPageHeader title="السناتر والمدرسون" description="إدارة مساحات العمل وحالات التفعيل والتعليق." />

        {params.error ? (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{params.error}</p>
        ) : null}

        {tenants.length === 0 ? (
          <section className="card grid min-h-72 place-items-center p-8 text-center">
            <p className="text-sm text-[#6f6a80]">لا توجد مساحات عمل بعد.</p>
          </section>
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-[#faf9fc] text-xs text-[#6f6a80]">
                  <tr>
                    <th className="px-6 py-3 font-medium">المساحة</th>
                    <th className="px-4 py-3 font-medium">النوع</th>
                    <th className="px-4 py-3 font-medium">الطلاب</th>
                    <th className="px-4 py-3 font-medium">الأعضاء</th>
                    <th className="px-4 py-3 font-medium">الحالة</th>
                    <th className="px-6 py-3 font-medium">تاريخ الإنشاء</th>
                    <th className="px-6 py-3 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => {
                    const Icon = t.tenant_type === "center" ? Building2 : GraduationCap;
                    return (
                      <tr key={t.id} className="border-t border-[#efedf3]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-full bg-[#eeeaff] text-[#6547d9]">
                              <Icon size={16} aria-hidden="true" />
                            </span>
                            <div>
                              <b className="block">{t.name}</b>
                              <span className="block text-xs text-[#6f6a80]" dir="ltr">/{t.slug}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-[#f2effb] px-3 py-1 text-xs font-bold text-[#6547d9]">
                            {tenantTypeLabelsAr[t.tenant_type as TenantType] ?? t.tenant_type}
                          </span>
                          <span className="mt-2 block text-[11px] font-semibold text-[#6f6a80]">
                            {productLevelLabelsAr[t.product_level as keyof typeof productLevelLabelsAr] ?? t.product_level}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[#6f6a80]">{t.studentCount}</td>
                        <td className="px-4 py-4 text-[#6f6a80]">{t.memberCount}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            t.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>
                            {t.status === "active" ? "فعّال" : "موقوف"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#6f6a80]">
                          {new Date(t.created_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })}
                        </td>
                        <td className="px-6 py-4">
                          <form action={setTenantStatus}>
                            <input type="hidden" name="tenantId" value={t.id} />
                            <input type="hidden" name="nextStatus" value={t.status === "active" ? "suspended" : "active"} />
                            <button
                              type="submit"
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                                t.status === "active"
                                  ? "border border-red-200 text-red-700"
                                  : "bg-emerald-600 text-white"
                              }`}
                            >
                              {t.status === "active" ? "تعليق" : "تفعيل"}
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <p className="mt-6 flex items-center gap-2 text-xs text-[#6f6a80]">
          <Users className="size-4" aria-hidden="true" /> بيانات المساحات والطلاب والأعضاء تُقرأ مباشرة من قاعدة البيانات.
          <FileText className="ms-3 size-4" aria-hidden="true" /> أي إجراء تعليق/تفعيل لاحق سيُسجل في سجل التدقيق.
        </p>
      </div>
    </main>
  );
}
