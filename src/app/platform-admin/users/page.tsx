import { ShieldCheck, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { listUsers } from "@/lib/platform-admin-data";

const roleLabels: Record<string, string> = {
  owner: "مالك",
  admin: "مدير",
  teacher: "مدرس",
  receptionist: "استقبال",
  accountant: "محاسب",
};

export default async function PlatformUsersPage() {
  const users = await listUsers();

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
              <h1 className="text-2xl font-extrabold">المستخدمون والعضويات</h1>
            </div>
          </div>
          <nav className="flex gap-3 text-sm font-bold">
            <Link href="/platform-admin" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2">نظرة عامة</Link>
            <Link href="/platform-admin/tenants" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2">المساحات</Link>
            <form action={signOut}>
              <button type="submit" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-2">خروج</button>
            </form>
          </nav>
        </header>

        {users.length === 0 ? (
          <section className="card grid min-h-72 place-items-center p-8 text-center">
            <p className="text-sm text-[#777386]">لا توجد عضويات بعد.</p>
          </section>
        ) : (
          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-[#faf9fc] text-xs text-[#8b8799]">
                  <tr>
                    <th className="px-6 py-3 font-medium">المستخدم</th>
                    <th className="px-4 py-3 font-medium">الأدوار</th>
                    <th className="px-6 py-3 font-medium">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-[#efedf3]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-full bg-[#eeeaff] text-[#6547d9]">
                            <UserCircle2 size={18} aria-hidden="true" />
                          </span>
                          <div>
                            <b className="block" dir="ltr">{u.email || "بلا بريد"}</b>
                            <span className="block max-w-56 truncate text-xs text-[#6f6a80]" dir="ltr">{u.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {u.memberships.map((m, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                m.active ? "bg-[#f2effb] text-[#6547d9]" : "bg-[#f1f1f3] text-[#999]"
                              }`}
                            >
                              {roleLabels[m.role] ?? m.role}
                              {!m.active ? " (موقوف)" : ""}
                            </span>
                          ))}
                          {u.memberships.length === 0 ? <span className="text-xs text-[#999]">لا عضويات</span> : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#777386]">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("ar-EG", { dateStyle: "medium" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <p className="mt-6 text-xs text-[#777386]">
          تُقرأ العضويات والأدوار مباشرة من قاعدة البيانات. تعطيل/تفعيل عضوية لاحقًا لن يحذف حساب Auth ولا يؤثر على عضويات المستخدم الأخرى.
        </p>
      </div>
    </main>
  );
}