import { DatabaseZap, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { bootstrapCurrentAdmin } from "@/app/platform-control/bootstrap/actions";
import { SupabaseCurrentUserProvider } from "@/lib/auth/supabase-current-user-provider";
import { databaseConfig } from "@/lib/database/config";
import { isLocalDevelopmentBootstrapAvailable } from "@/lib/development/local-platform-admin-bootstrap";

export default async function LocalPlatformAdminBootstrapPage() {
  const database = databaseConfig();
  if (!isLocalDevelopmentBootstrapAvailable({
    nodeEnv: process.env.NODE_ENV,
    database,
  })) {
    notFound();
  }

  const user = await new SupabaseCurrentUserProvider().getCurrentUser();
  if (!user) redirect("/platform-control/login");

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
            سيُضاف الحساب المسجّل حاليًا إلى PostgreSQL المحلي فقط، دون تعديل بيانات
            Supabase أو تعطيل فحوص الصلاحيات المعتادة.
          </p>
        </div>

        <form action={bootstrapCurrentAdmin}>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#6547d9] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#583bc8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6547d9]"
          >
            تهيئة الحساب الحالي كمدير منصة محلي
          </button>
        </form>
      </section>
    </main>
  );
}
