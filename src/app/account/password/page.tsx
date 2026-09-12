import { KeyRound, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { ManagementRouteShell } from "@/components/management-route-shell";
import { ActionSubmitButton } from "@/app/team/team-client";
import { withSessionUser } from "@/lib/auth/session-context";
import { listAccountSessions } from "@/lib/auth/account-sessions";
import { changePassword } from "./actions";

const fieldClass =
  "w-full rounded-xl border border-[#ddd8e9] px-4 py-3 text-sm outline-none focus:border-[#6547d9]";

/**
 * تغيير كلمة مرور الحساب.
 *
 * الصفحة على مستوى **الحساب** لا المساحة، والصفحة تعرض أثر التغيير قبل وقوعه:
 * عدد الأجهزة الأخرى التي ستُسحب، لأن سحبها هو ما يجعل التغيير مفيدًا عند الشك
 * في انكشاف الكلمة. ومن لا يعرف أن الأجهزة الأخرى ستُسحب قد يفاجأ بخروجها.
 */
export default async function AccountPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const result = await withSessionUser(async ({ sql, user, digest }) => {
    const sessions = await listAccountSessions(sql, { userId: user.id, currentDigest: digest });
    return { email: user.email, otherDevices: sessions.filter((session) => !session.isCurrent).length };
  });
  if (!result) redirect("/login");

  const params = await searchParams;

  return (
    <ManagementRouteShell activeLabel="كلمة المرور">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-[#6547d9]" aria-hidden="true" />
            <h2 className="font-extrabold">تغيير كلمة المرور</h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
            الحساب: <b dir="ltr">{result.email}</b>
          </p>

          {params.error ? (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {params.error}
            </p>
          ) : null}
          {params.notice ? (
            <p role="status" className="mt-4 rounded-xl bg-[#f4f1ff] p-3 text-sm text-[#5c47b8]">
              {params.notice}
            </p>
          ) : null}

          <form action={changePassword} className="mt-5 space-y-4">
            <div>
              <label htmlFor="current_password" className="mb-2 block text-sm font-bold">
                كلمة المرور الحالية
              </label>
              <input
                id="current_password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="new_password" className="mb-2 block text-sm font-bold">
                كلمة المرور الجديدة
              </label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-[#9a95a8]">من 8 إلى 72 حرفًا.</p>
            </div>
            <div>
              <label htmlFor="new_password_confirmation" className="mb-2 block text-sm font-bold">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                id="new_password_confirmation"
                name="new_password_confirmation"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                className={fieldClass}
              />
            </div>
            <ActionSubmitButton
              idleLabel="تغيير كلمة المرور"
              pendingLabel="جارٍ التغيير..."
              className="w-full rounded-xl bg-[#6547d9] py-3 text-sm font-bold text-white md:w-auto md:px-8"
            />
          </form>
        </section>

        <section className="card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#6547d9]" aria-hidden="true" />
            <h2 className="font-extrabold">ماذا يحدث بعد التغيير</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-[#6f6a80]">
            {result.otherDevices === 0
              ? "لا توجد أجهزة أخرى مسجّلة الآن، فلن يُسحب أي جهاز."
              : `ستُسحب ${result.otherDevices} جهازًا آخر، ويبقى هذا الجهاز مفتوحًا. تغيير كلمة المرور بعد الشك في انكشافها لا معنى له إن بقيت جلسة أخرى صالحة.`}
          </p>
        </section>
      </div>
    </ManagementRouteShell>
  );
}
