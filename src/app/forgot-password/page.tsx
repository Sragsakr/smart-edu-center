import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5fb] p-4">
      <section className="w-full max-w-md rounded-3xl border border-[#e8e5ef] bg-white p-7 shadow-xl shadow-purple-100/50">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
          <KeyRound aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">نسيت كلمة المرور؟</h1>
        <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
          أرسل طلب استعادة، وستراجعه إدارة المنصة وتتواصل معك على رقم واتساب المسجل.
        </p>
        {params.error ? (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        {params.message ? (
          <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-700">
            {params.message}
          </p>
        ) : null}
        <form action={requestPasswordReset} className="mt-6 space-y-4">
          <label htmlFor="recovery-email" className="block text-sm font-bold">
            البريد الإلكتروني
          </label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]"
          />
          <PendingSubmitButton
            idleLabel="إرسال طلب الاستعادة"
            pendingLabel="جارٍ إرسال الطلب..."
            className="w-full rounded-xl bg-[#6547d9] py-3 font-bold text-white"
          />
        </form>
        <div className="mt-4 grid gap-2 text-center text-sm">
          <Link href="/reset-password" className="font-bold text-[#6547d9]">
            لدي كود استعادة
          </Link>
          <Link href="/login" className="text-[#6f6a80]">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </section>
    </main>
  );
}
