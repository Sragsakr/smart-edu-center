import { PlatformAuditLog } from "@/components/platform-audit-log";
import { PlatformPageHeader } from "@/components/platform-page-header";
import { listPlatformAudit } from "@/lib/platform-admin-data";

export default async function PlatformAuditPage() {
  const audit = await listPlatformAudit(200);

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <PlatformPageHeader
          title="سجل النشاط والتدقيق"
          description="راجع أحداث كل سنتر أو مدرس مستقل وافتح التفاصيل التقنية الكاملة عند الحاجة."
        />

        {audit.length === 0 ? (
          <section className="card grid min-h-72 place-items-center p-8 text-center">
            <p className="text-sm text-[#777386]">لا توجد أحداث تدقيق بعد.</p>
          </section>
        ) : (
          <PlatformAuditLog entries={audit} />
        )}
      </div>
    </main>
  );
}
