import { ScrollText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { listPlatformAudit } from "@/lib/platform-admin-data";

export default async function PlatformAuditPage() {
  const audit = await listPlatformAudit(200);

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
              <h1 className="text-2xl font-extrabold">سجل النشاط والتدقيق</h1>
            </div>
          </div>
          <nav className="flex gap-3 text-sm font-bold">
            <Link href="/platform-admin" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2">نظرة عامة</Link>
            <form action={signOut}>
              <button type="submit" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2">خروج</button>
            </form>
          </nav>
        </header>

        {audit.length === 0 ? (
          <section className="card grid min-h-72 place-items-center p-8 text-center">
            <p className="text-sm text-[#777386]">لا توجد أحداث تدقيق بعد.</p>
          </section>
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-[#faf9fc] text-xs text-[#8b8799]">
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