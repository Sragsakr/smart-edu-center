import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { redirect } from "next/navigation";
import { authenticate } from "@/app/auth/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const access = await getCurrentAccountAccess();
  if (access.user) redirect("/");
  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5fb] p-4" dir="rtl">
      <section className="w-full max-w-md rounded-3xl border border-[#e8e5ef] bg-white p-7 shadow-xl shadow-purple-100/50">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#6547d9] text-white"><GraduationCap /></span>
          <div>
            <h1 className="font-extrabold">تسجيل الدخول</h1>
            <p className="text-xs text-[#6f6a80]">للحسابات الموجودة بالفعل</p>
          </div>
        </div>
        <p className="mb-5 rounded-xl bg-[#f7f5ff] p-3 text-xs leading-6 text-[#6f6a80]">استخدم حسابك الحالي، والنظام سيوجهك تلقائيًا إلى الواجهة المناسبة لصلاحيتك.</p>
        {params.error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}
        {params.message ? <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{params.message}</p> : null}
        <form action={authenticate} className="space-y-4">
          <label htmlFor="email" className="block text-sm font-bold">البريد الإلكتروني</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          <label htmlFor="password" className="block text-sm font-bold">كلمة المرور</label>
          <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} required className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          <div className="text-left"><Link href="/forgot-password" className="text-xs font-bold text-[#6547d9]">نسيت كلمة المرور؟</Link></div>
          <PendingSubmitButton idleLabel="تسجيل الدخول" pendingLabel="جارٍ تسجيل الدخول..." className="w-full rounded-xl bg-[#6547d9] py-3 text-sm font-bold text-white" />
        </form>
        <p className="mt-5 text-center text-sm text-[#6f6a80]">لسه معندكش حساب؟ <Link href="/signup" className="font-bold text-[#6547d9]">أنشئ حساب جديد</Link></p>
      </section>
    </main>
  );
}
