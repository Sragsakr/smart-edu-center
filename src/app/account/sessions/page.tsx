import { MonitorSmartphone, ShieldCheck, Smartphone, Tablet, Monitor, LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { ManagementRouteShell } from "@/components/management-route-shell";
import { ActionSubmitButton } from "@/app/team/team-client";
import { listAccountSessions, type AccountSession } from "@/lib/auth/account-sessions";
import { withSessionUser } from "@/lib/auth/session-context";
import type { DeviceKind } from "@/lib/auth/device-label";
import { revokeOtherSessions, revokeSession } from "./actions";

const deviceIcons: Record<DeviceKind, typeof Monitor> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  unknown: MonitorSmartphone,
};

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

/** صياغة الوقت النسبي بالعربية، لأن «آخر نشاط» هو العمود الذي يقرر منه المستخدم. */
function describeLastSeen(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (elapsed < ACTIVE_WINDOW_MS) return "نشط الآن";
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "قبل يوم" : `قبل ${days} يومًا`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", calendar: "gregory" })
    .format(new Date(iso));
}

function SessionCard({ session }: { session: AccountSession }) {
  const Icon = deviceIcons[session.deviceKind];
  return (
    <li
      className={`rounded-2xl border p-4 ${
        session.isCurrent ? "border-[#cfc4f5] bg-[#f9f7ff]" : "border-[#e8e5ef] bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#f1eefe] text-[#6547d9]">
          <Icon aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm">{session.deviceLabel}</b>
            {session.isCurrent ? (
              <span className="rounded-full bg-[#6547d9] px-2 py-0.5 text-[10px] font-bold text-white">
                هذا الجهاز
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[#777386]">
            آخر نشاط: {describeLastSeen(session.lastSeenAt)} · دخل في {formatDate(session.createdAt)}
          </p>
          <p className="mt-1 text-xs text-[#9a95a8]" dir="ltr">
            {session.ipAddress ?? "عنوان غير مسجّل"}
          </p>
        </div>
      </div>

      {session.isCurrent ? (
        <p className="mt-3 text-xs leading-6 text-[#6f6a80]">
          للخروج من هذا الجهاز استخدم «تسجيل الخروج» في القائمة الجانبية.
        </p>
      ) : (
        <form action={revokeSession} className="mt-3">
          <input type="hidden" name="session_id" value={session.id} />
          <ActionSubmitButton
            idleLabel="اسحب هذا الجهاز"
            pendingLabel="جارٍ السحب..."
            className="focus-ring rounded-xl border border-[#ecd7db] px-4 py-2 text-xs font-bold text-[#c2455a] transition hover:bg-[#fff5f6]"
          />
        </form>
      )}
    </li>
  );
}

/**
 * أجهزة الحساب وجلساته.
 *
 * الصفحة على مستوى **الحساب** لا المساحة: الجلسة تخصّ الشخص لا عضويته في سنتر
 * بعينه، فيجب أن يظهر الجهاز نفسه أينما دخل المستخدم. ولهذا لا تُقيَّد باستحقاق
 * مساحة ولا بدور، بل بالهوية وحدها.
 */
export default async function AccountSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const result = await withSessionUser(async ({ sql, user, digest }) => ({
    email: user.email,
    sessions: await listAccountSessions(sql, { userId: user.id, currentDigest: digest }),
  }));
  if (!result) redirect("/login");

  const params = await searchParams;
  const others = result.sessions.filter((session) => !session.isCurrent);

  return (
    <ManagementRouteShell activeLabel="الأجهزة والجلسات">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#6547d9]" aria-hidden="true" />
            <h2 className="font-extrabold">الأجهزة المسجّل دخولها</h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
            هذه كل الأجهزة التي فُتح فيها حسابك ولم تُسحب جلساتها بعد. اسحب أي جهاز لا تعرفه،
            وسيتوقف وصوله فورًا. الحساب الحالي: <b dir="ltr">{result.email}</b>
          </p>

          {params.notice ? (
            <p role="status" className="mt-4 rounded-xl bg-[#f4f1ff] p-3 text-sm text-[#5c47b8]">
              {params.notice}
            </p>
          ) : null}

          {result.sessions.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-[#f8f7fb] p-4 text-sm text-[#6f6a80]">
              لا توجد جلسات نشطة.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {result.sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </ul>
          )}
        </section>

        {others.length > 0 ? (
          <section className="card p-5 md:p-6">
            <div className="flex items-center gap-2">
              <LogOut className="size-5 text-[#6547d9]" aria-hidden="true" />
              <h2 className="font-extrabold">خروج من الأجهزة الأخرى</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
              يسحب كل الأجهزة الأخرى ({others.length}) ويُبقي هذا الجهاز مفتوحًا. استخدمه إن
              شككت أن أحدًا دخل حسابك.
            </p>
            <form action={revokeOtherSessions} className="mt-4">
              <ActionSubmitButton
                idleLabel="اسحب كل الأجهزة الأخرى"
                pendingLabel="جارٍ السحب..."
                className="focus-ring rounded-xl border border-[#ecd7db] px-5 py-3 text-sm font-bold text-[#c2455a] transition hover:bg-[#fff5f6]"
              />
            </form>
          </section>
        ) : null}
      </div>
    </ManagementRouteShell>
  );
}
