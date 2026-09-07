import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { authenticatePlatformAdmin } from "@/app/auth/actions";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";

export default async function PlatformControlLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await getCurrentAccountAccess();
  if (access.user && access.isPlatformAdmin) redirect("/platform-admin");
  if (access.user) redirect("/");
  const params = await searchParams;
  return (
    <main dir="rtl" className="grid min-h-dvh place-items-center bg-[#17152b] p-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#6547d9] text-white"><ShieldCheck /></span>
          <div><h1 className="font-extrabold">إدارة سبورتي | Saboraty</h1><p className="text-xs text-[#6f6a80]">SaaS Control Plane</p></div>
        </div>
        {params.error ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}
        <form action={authenticatePlatformAdmin} className="space-y-4">
          <label htmlFor="email" className="block text-sm font-bold">البريد الإلكتروني</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          <label htmlFor="password" className="block text-sm font-bold">كلمة المرور</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="current-password" className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          <button type="submit" className="w-full rounded-xl bg-[#6547d9] px-4 py-3 text-sm font-bold text-white">دخول إدارة المنصة</button>
        </form>
      </section>
    </main>
  );
}
