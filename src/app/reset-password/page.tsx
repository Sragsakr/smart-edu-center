import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { resetPasswordWithCode } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5fb] p-4">
      <form
        action={resetPasswordWithCode}
        className="w-full max-w-md rounded-3xl border border-[#e8e5ef] bg-white p-7 shadow-xl shadow-purple-100/50"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
          <LockKeyhole aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">تعيين كلمة مرور جديدة</h1>
        <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
          أدخل الكود الذي أرسلته الإدارة إلى رقم واتساب المسجل، ثم اختر كلمة مرور جديدة.
        </p>
        {params.error ? (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        <div className="mt-6 space-y-4">
          <label htmlFor="reset-email" className="block text-sm font-bold">البريد الإلكتروني</label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]"
          />
          <label htmlFor="recovery-code" className="block text-sm font-bold">كود الاستعادة</label>
          <input
            id="recovery-code"
            name="recovery_code"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            pattern="[A-Fa-f0-9]{8}"
            maxLength={8}
            required
            dir="ltr"
            className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 text-center font-mono text-lg tracking-[0.25em] uppercase outline-none focus:border-[#6547d9]"
            placeholder="A1B2C3D4"
          />
          <label htmlFor="new-password" className="block text-sm font-bold">كلمة المرور الجديدة</label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]"
          />
          <label htmlFor="password-confirmation" className="block text-sm font-bold">تأكيد كلمة المرور</label>
          <input
            id="password-confirmation"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]"
          />
          <PendingSubmitButton
            idleLabel="تغيير كلمة المرور"
            pendingLabel="جارٍ تغيير كلمة المرور..."
            className="w-full rounded-xl bg-[#6547d9] py-3 font-bold text-white"
          />
        </div>
        <Link href="/login" className="mt-4 block text-center text-sm text-[#6f6a80]">
          العودة لتسجيل الدخول
        </Link>
      </form>
    </main>
  );
}
