import { ScrollText } from "lucide-react";
import { listPlatformAudit } from "@/lib/platform-admin-data";
import { PlatformPageHeader } from "@/components/platform-page-header";

export default async function PlatformAuditPage() {
  const audit = await listPlatformAudit(200);

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <PlatformPageHeader title="سجل النشاط والتدقيق" description="تتبع العمليات الإدارية الحساسة على مستوى المنصة." />

        {audit.length === 0 ? (
          <section className="card grid min-h-72 place-items-center p-8 text-center">
            <p className="text-sm text-[#777386]">لا توجد أحداث تدقيق بعد.</p>
          </section>
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-[#faf9fc] text-xs text-[#6f6a80]">
                  <tr>
                    <th className="px-6 py-3 font-medium">الإجراء</th>
                    <th className="px-4 py-3 font-medium">الكيان</th>
                    <th className="px-4 py-3 font-medium">التفاصيل</th>
                    <th className="px-6 py-3 font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id} className="border-t border-[#efedf3]">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 font-bold text-[#6547d9]">
                          <ScrollText className="size-4" aria-hidden="true" />
                          <span dir="ltr">{entry.action}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#777386]" dir="ltr">{entry.entity_type}</td>
                      <td className="px-4 py-4 text-xs text-[#777386]">
                        <span dir="ltr" className="max-w-64 truncate block">
                          {JSON.stringify(entry.details)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#777386]" dir="ltr">
                        {new Date(entry.created_at).toLocaleString("ar-EG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Africa/Cairo",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
