import { DatabaseZap, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { bootstrapLocalAdmin } from "@/app/platform-control/bootstrap/actions";
import { isLocalDevelopmentBootstrapAvailable } from "@/lib/development/local-platform-admin-bootstrap";
import { privateEnv } from "@/lib/server-env";

export default function LocalPlatformAdminBootstrapPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const databaseUrl = privateEnv().DATABASE_URL;
  if (!isLocalDevelopmentBootstrapAvailable({ nodeEnv: process.env.NODE_ENV, databaseUrl })) {
    notFound();
  }

  return (
    <main dir="rtl" className="grid min-h-dvh place-items-center bg-[#17152b] p-4">
      <section className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#6547d9] text-white">
            <DatabaseZap aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-extrabold">تهيئة مدير المنصة محليًا</h1>
            <p className="text-xs text-[#6f6a80]">Local development only</p>
          </div>
        </div>
        <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            أدخل بريدًا وكلمة مرور محليين. سيتم تخزين hash كلمة المرور فقط داخل PostgreSQL
            المحلي، ولن يتم الاتصال بأي مزود هوية خارجي أو تسجيل كلمة المرور.
          </p>
        </div>
        <form action={bootstrapLocalAdmin} className="space-y-4">
          <label htmlFor="email" className="block text-sm font-bold">البريد الإلكتروني</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          <label htmlFor="password" className="block text-sm font-bold">كلمة المرور</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          <button type="submit" className="w-full rounded-xl bg-[#6547d9] px-4 py-3 text-sm font-bold text-white">إنشاء مدير Fresh Auth المحلي</button>
        </form>
      </section>
    </main>
  );
}
