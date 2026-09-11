import Link from "next/link";
import { MailCheck, ShieldAlert, ShieldCheck } from "lucide-react";

import { withSessionUser } from "@/lib/auth/session-context";
import { getPortalInvitationPreview, portalSubjectLabelsAr } from "@/lib/auth/portal-invitations";
import { claimPortalAccess, continuePortalClaim } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * صفحة قبول دعوة البوابة.
 *
 * تعرض أقل قدر ممكن: نوع الجهة والبريد المدعو وحالة الدعوة. لا يُعرض اسم الطالب
 * قبل قبول الدعوة، فلا يصبح الرابط المسرّب وسيلة استطلاع بيانات.
 */
export default async function ClaimPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const error = typeof params.error === "string" ? params.error : null;

  const invitation = token ? await getPortalInvitationPreview(token) : null;
  const user = await withSessionUser(async ({ user: sessionUser }): Promise<{ id: string; email: string } | null> => sessionUser);

  const emailMatches =
    invitation !== null && user !== null && invitation.inviteeEmail.trim().toLowerCase() === user.email.trim().toLowerCase();

  return (
    <main dir="rtl" className="grid min-h-dvh place-items-center bg-[#f6f5fb] px-4 py-10 text-[#17152b]">
      <section className="w-full max-w-xl rounded-3xl border border-[#e7e3ef] bg-white p-6 shadow-sm md:p-8">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
          <MailCheck aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">تفعيل الدخول للبوابة</h1>
        <p className="mt-2 text-sm leading-7 text-[#777386]">
          هذه الدعوة تربط حسابك بسجل واحد في مساحة عمل، فتظهر لك بياناتك أنت فقط.
        </p>

        {error ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {!token || !invitation ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            رابط الدعوة ناقص أو غير صالح. اطلب من إدارة مساحة العمل إرسال دعوة جديدة.
          </div>
        ) : null}

        {invitation && invitation.status !== "pending" ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            {invitation.status === "accepted"
              ? "تم استخدام هذه الدعوة بالفعل."
              : invitation.status === "revoked"
                ? "أُلغيت هذه الدعوة من إدارة مساحة العمل."
                : "انتهت صلاحية الدعوة. اطلب دعوة جديدة."}
          </div>
        ) : null}

        {invitation?.status === "pending" ? (
          <div className="mt-6">
            <dl className="grid gap-3 rounded-2xl bg-[#f8f7fb] p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[#777386]">نوع الحساب</dt>
                <dd className="mt-1 font-bold">{portalSubjectLabelsAr[invitation.subjectType]}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#777386]">البريد المدعو</dt>
                <dd className="mt-1 font-bold" dir="ltr">
                  {invitation.inviteeEmail}
                </dd>
              </div>
            </dl>

            <p className="mt-4 rounded-2xl border border-dashed border-[#cfc7f5] p-4 text-xs leading-6 text-[#5c47b8]">
              <ShieldCheck className="ml-1 inline size-4" aria-hidden="true" />
              القبول يتطلب أن يكون البريد الذي تسجّل به هو نفس البريد المدعو. الرابط وحده لا يكفي، وهذا ما يمنع ربط حسابك
              بسجل شخص آخر.
            </p>

            {user && emailMatches ? (
              <form action={claimPortalAccess} className="mt-5">
                <input type="hidden" name="token" value={token} />
                <button className="w-full rounded-xl bg-[#6547d9] py-3 font-bold text-white focus-ring">
                  ربط حسابي وفتح البوابة
                </button>
              </form>
            ) : null}

            {user && !emailMatches ? (
              <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <ShieldAlert className="ml-1 inline size-4" aria-hidden="true" />
                أنت مسجّل الدخول ببريد مختلف عن البريد المدعو. سجّل الخروج ثم ادخل بالبريد الذي وصلته الدعوة.
                <span className="mt-1 block font-bold" dir="ltr">
                  {user.email}
                </span>
              </div>
            ) : null}

            {!user ? (
              <form action={continuePortalClaim} className="mt-5">
                <input type="hidden" name="token" value={token} />
                <button className="w-full rounded-xl bg-[#6547d9] py-3 font-bold text-white focus-ring">
                  {invitation.accountExists ? "تسجيل الدخول لإكمال الربط" : "إنشاء حساب وإكمال الربط"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-[#8a8698]">
          <Link href="/" className="hover:text-[#6547d9]">
            العودة للرئيسية
          </Link>
        </p>
      </section>
    </main>
  );
}
