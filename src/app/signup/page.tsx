import Link from "next/link";
import { GraduationCap, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { createAccount } from "@/app/auth/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await getCurrentAccountAccess();
  if (access.user) redirect("/");
  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5fb] p-4" dir="rtl">
      <section className="w-full max-w-md rounded-3xl border border-[#e8e5ef] bg-white p-7 shadow-xl shadow-purple-100/50">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#6547d9] text-white"><UserPlus /></span>
          <div>
            <h1 className="font-extrabold">إنشاء حساب جديد</h1>
            <p className="text-xs text-[#6f6a80]">ابدأ إعداد السنتر أو حساب المدرس المستقل</p>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-xl bg-[#f7f5ff] p-3 text-xs leading-6 text-[#6f6a80]">
          <GraduationCap className="size-4 shrink-0 text-[#6547d9]" />
          بعد إنشاء الحساب هننقلك مباشرة لإعداد مساحة العمل واختيار نوع حسابك.
        </div>

        {params.error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}

        <form action={createAccount} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold">البريد الإلكتروني</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold">إنشاء كلمة المرور</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          </div>
          <div>
            <label htmlFor="password_confirmation" className="mb-2 block text-sm font-bold">تأكيد كلمة المرور</label>
            <input id="password_confirmation" name="password_confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
          </div>
          <PendingSubmitButton idleLabel="إنشاء الحساب والمتابعة" pendingLabel="جارٍ إنشاء الحساب..." className="w-full rounded-xl bg-[#6547d9] py-3 text-sm font-bold text-white" />
        </form>

        <p className="mt-5 text-center text-sm text-[#6f6a80]">عندك حساب بالفعل؟ <Link href="/login" className="font-bold text-[#6547d9]">تسجيل الدخول</Link></p>
      </section>
    </main>
  );
}
