import { MailCheck, ShieldCheck } from "lucide-react";

import { getPostgresCurrentUser } from "@/lib/auth/postgres-auth";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import { getInvitationPreview } from "@/lib/invitations";
import { ExistingAccountPasswordForm, ExistingInviteForm, NewInviteAccountForm, SwitchInviteAccountForm } from "./invite-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const roleLabel: Record<string, string> = { admin: "مشرف", teacher: "مدرس", receptionist: "استقبال", accountant: "محاسب" };

export default async function InvitePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const error = typeof params.error === "string" ? params.error : null;
  const invitation = token ? await getInvitationPreview(token) : null;
  const config = databaseConfig();
  if (config.backend !== "postgres" || !config.databaseUrl) throw new Error("Invitation management requires the PostgreSQL application backend");
  const user = await getPostgresCurrentUser(postgresSqlExecutor(config.databaseUrl));

  return (
    <main dir="rtl" className="grid min-h-dvh place-items-center bg-[#f6f5fb] px-4 py-10 text-[#17152b]">
      <section className="w-full max-w-xl rounded-3xl border border-[#e7e3ef] bg-white p-6 shadow-sm md:p-8">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]"><MailCheck /></span>
        <h1 className="mt-5 text-2xl font-extrabold">قبول دعوة الانضمام</h1>
        <p className="mt-2 text-sm leading-7 text-[#777386]">الدعوات مخصصة للحسابات الجديدة فقط، والبريد الموجود في الرابط هو البريد الذي سيتم إنشاء الحساب به.</p>
        {error ? <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
        {!token || !invitation ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">رابط الدعوة ناقص أو غير صالح.</div> : null}
        {invitation && invitation.status === "expired" ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">انتهت صلاحية الدعوة. اطلب من إدارة مساحة العمل إعادة إرسال دعوة جديدة.</div> : null}
        {invitation && invitation.status === "accepted" ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">تم قبول هذه الدعوة بالفعل.</div> : null}
        {invitation && invitation.status === "revoked" ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">تم إلغاء هذه الدعوة من إدارة مساحة العمل.</div> : null}
        {invitation?.status === "pending" ? (
          <div className="mt-6">
            <div className="rounded-2xl bg-[#f7f5ff] p-4 text-sm leading-7 text-[#5e5870]"><ShieldCheck className="ml-2 inline size-4 text-[#6547d9]" /> البريد المدعو: <b>{invitation.email}</b><span className="mx-2 text-[#bbb5c7]">•</span> الصلاحية: <b>{roleLabel[invitation.role] ?? invitation.role}</b></div>
            {invitation.accountExists ? user?.email?.toLowerCase() === invitation.email.toLowerCase() ? <ExistingInviteForm token={token} /> : user ? <><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">أنت مسجل الدخول حاليًا بحساب آخر. سجّل الخروج أولًا للدخول بالحساب المدعو.</div><SwitchInviteAccountForm token={token} /></> : <ExistingAccountPasswordForm token={token} email={invitation.email} /> : user ? <><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">أنت مسجل الدخول حاليًا بحساب آخر. سجّل الخروج أولًا لإنشاء الحساب الجديد المرتبط بهذه الدعوة.</div><SwitchInviteAccountForm token={token} /></> : <><p className="mt-4 text-sm leading-7 text-[#6f6a80]">أنشئ كلمة مرور للحساب الجديد. بعد ذلك سيتم إنشاء الحساب وقبول الدعوة والدخول إلى مساحة العمل تلقائيًا.</p><NewInviteAccountForm token={token} email={invitation.email} /></>}
          </div>
        ) : null}
      </section>
    </main>
  );
}
