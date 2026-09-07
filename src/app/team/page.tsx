import Link from "next/link";
import { redirect } from "next/navigation";
import { Copy, MailPlus, ShieldCheck, UsersRound } from "lucide-react";

import { ManagementRouteShell } from "@/components/management-route-shell";
import { getTeamWorkspaceData } from "@/lib/team-access";
import { createInvitation, deactivateMembership, reactivateMembership, resendInvitation, revokeInvitation } from "./actions";
import { ActionSubmitButton, InvitationShare } from "./team-client";
import { DismissibleAlert } from "./dismissible-alert";

const roleLabel: Record<string, string> = {
  owner: "المالك",
  admin: "مشرف",
  teacher: "مدرس",
  receptionist: "استقبال",
  accountant: "محاسب",
};

const statusLabel: Record<string, string> = {
  pending: "معلقة",
  accepted: "مقبولة",
  revoked: "ملغاة",
  expired: "منتهية",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TeamPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedTenant = typeof params.tenant === "string" ? params.tenant : undefined;
  const data = await getTeamWorkspaceData(requestedTenant);
  if (!data) redirect("/login");

  const error = typeof params.error === "string" ? params.error : null;
  const success = typeof params.success === "string" ? params.success : null;
  const invite = typeof params.invite === "string" ? params.invite : null;

  return (
    <ManagementRouteShell activeLabel="الفريق والدعوات">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold text-[#6547d9]">إدارة الفريق</p>
          <h2 className="mt-1 text-2xl font-extrabold">{data.tenant.name}</h2>
          <p className="mt-1 text-sm text-[#777386]">أعضاء الفريق، الدعوات والصلاحيات لكل مساحة عمل.</p>
        </div>

        {data.workspaces.length > 1 ? (
          <section className="card p-4">
            <p className="mb-3 text-xs font-bold text-[#777386]">مساحات العمل المرتبطة بحسابك</p>
            <div className="flex flex-wrap gap-2">
              {data.workspaces.map((workspace) => (
                <Link key={workspace.tenant_id} href={`/team?tenant=${workspace.tenant_id}`} className={`rounded-xl px-4 py-2 text-xs font-bold ${workspace.tenant_id === data.tenant.id ? "bg-[#6547d9] text-white" : "bg-[#f2effb] text-[#6042d3]"}`}>
                  {workspace.tenant_name} · {roleLabel[workspace.role]}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {error ? <DismissibleAlert kind="error" message={error} /> : null}
        {success ? <DismissibleAlert kind="success" message={success} /> : null}
        {invite ? (
          <div className="rounded-2xl border border-[#cfc7f5] bg-[#f1edff] p-4">
            <div className="flex items-start gap-3">
              <Copy className="mt-1 size-5 text-[#6547d9]" />
              <div className="min-w-0 flex-1">
                <b className="text-sm">رابط الدعوة الجديد</b>
                <p className="mt-1 break-all text-xs leading-6 text-[#6f6a80]">{invite}</p>
                <p className="mt-2 text-xs font-bold text-[#6547d9]">أرسل الرابط للشخص مباشرة عبر واتساب أو انسخه. المستخدم الجديد ينشئ كلمة المرور من صفحة الدعوة.</p>
                <InvitationShare invitationUrl={invite} />
              </div>
            </div>
          </div>
        ) : null}

        {data.manageable ? (
          <section className="card p-5 md:p-6">
            <div className="flex items-center gap-2"><MailPlus className="size-5 text-[#6547d9]" /><h2 className="font-extrabold">دعوة عضو جديد</h2></div>
            <form action={createInvitation} className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <input type="hidden" name="tenant_id" value={data.tenant.id} />
              <input required type="email" name="email" placeholder="member@example.com" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-3 text-sm outline-none focus:border-[#6547d9]" />
              <select name="role" defaultValue="teacher" className="rounded-xl border border-[#ddd8e9] bg-white px-4 py-3 text-sm outline-none focus:border-[#6547d9]">
                <option value="admin">مشرف</option><option value="teacher">مدرس</option><option value="receptionist">استقبال</option><option value="accountant">محاسب</option>
              </select>
              <ActionSubmitButton idleLabel="إنشاء الدعوة" pendingLabel="جارٍ إنشاء الدعوة..." className="rounded-xl bg-[#6547d9] px-5 py-3 text-sm font-bold text-white" />
            </form>
            <p className="mt-3 text-xs leading-6 text-[#8a8698]">صلاحية الدعوة 7 أيام. بعد إنشائها يظهر رابط جاهز للنسخ أو الإرسال عبر واتساب. إعادة الإرسال تدوّر الرابط القديم فورًا.</p>
          </section>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><ShieldCheck className="ml-2 inline size-4" />لديك عضوية في هذه المساحة لكن إدارة الأعضاء متاحة للمالك والمشرف فقط.</div>
        )}

        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 p-5 md:px-6"><UsersRound className="size-5 text-[#6547d9]" /><h2 className="font-extrabold">أعضاء الفريق</h2><span className="rounded-full bg-[#eeeaff] px-2 py-1 text-[10px] font-bold text-[#6547d9]">{data.members.length}</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-right text-xs">
              <thead className="bg-[#faf9fc] text-[#8b8799]"><tr><th className="px-6 py-3">البريد</th><th className="px-4 py-3">الدور</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">منذ</th><th className="px-6 py-3">الإجراء</th></tr></thead>
              <tbody>{data.members.map((member) => (
                <tr key={member.user_id} className="border-t border-[#efedf3]">
                  <td className="px-6 py-4 font-bold">{member.email}</td>
                  <td className="px-4 py-4">{roleLabel[member.role]}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 font-bold ${member.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{member.active ? "نشط" : "معطل"}</span></td>
                  <td className="px-4 py-4 text-[#777386]">{new Date(member.created_at).toLocaleDateString("ar-EG")}</td>
                  <td className="px-6 py-4">
                    {data.manageable && member.role !== "owner" && member.user_id !== data.currentUserId ? (
                      member.active ? (
                        <form action={deactivateMembership}>
                          <input type="hidden" name="tenant_id" value={data.tenant.id}/><input type="hidden" name="user_id" value={member.user_id}/>
                          <ActionSubmitButton idleLabel="تعطيل" pendingLabel="جارٍ التعطيل..." className="rounded-lg border border-red-200 px-3 py-2 font-bold text-red-600" />
                        </form>
                      ) : (
                        <form action={reactivateMembership}>
                          <input type="hidden" name="tenant_id" value={data.tenant.id}/><input type="hidden" name="user_id" value={member.user_id}/>
                          <ActionSubmitButton idleLabel="إعادة تنشيط" pendingLabel="جارٍ إعادة التنشيط..." className="rounded-lg border border-emerald-200 px-3 py-2 font-bold text-emerald-700" />
                        </form>
                      )
                    ) : null}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        {data.manageable ? (
          <section className="card overflow-hidden">
            <div className="p-5 md:px-6"><h2 className="font-extrabold">سجل الدعوات</h2><p className="mt-1 text-xs text-[#8a8698]">المعلقة، المقبولة، الملغاة والمنتهية.</p></div>
            {data.invitations.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-right text-xs"><thead className="bg-[#faf9fc] text-[#8b8799]"><tr><th className="px-6 py-3">البريد</th><th className="px-4 py-3">الدور</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">تنتهي</th><th className="px-6 py-3">الإجراءات</th></tr></thead><tbody>{data.invitations.map((invitation) => { const expired = invitation.status === "pending" && new Date(invitation.expires_at) <= new Date(); const displayStatus = expired ? "expired" : invitation.status; return <tr key={invitation.id} className="border-t border-[#efedf3]"><td className="px-6 py-4 font-bold">{invitation.invitee_email}</td><td className="px-4 py-4">{roleLabel[invitation.role]}</td><td className="px-4 py-4">{statusLabel[displayStatus]}</td><td className="px-4 py-4 text-[#777386]">{new Date(invitation.expires_at).toLocaleString("ar-EG")}</td><td className="px-6 py-4"><div className="flex gap-2">{invitation.status === "pending" ? <><form action={resendInvitation}><input type="hidden" name="tenant_id" value={data.tenant.id}/><input type="hidden" name="invitation_id" value={invitation.id}/><ActionSubmitButton idleLabel="رابط جديد" pendingLabel="جارٍ إنشاء رابط جديد..." className="rounded-lg border border-[#d9d2f2] px-3 py-2 font-bold text-[#6547d9]" /></form><form action={revokeInvitation}><input type="hidden" name="tenant_id" value={data.tenant.id}/><input type="hidden" name="invitation_id" value={invitation.id}/><ActionSubmitButton idleLabel="إلغاء" pendingLabel="جارٍ الإلغاء..." className="rounded-lg border border-red-200 px-3 py-2 font-bold text-red-600" /></form></> : null}</div></td></tr>; })}</tbody></table></div> : <div className="px-6 pb-6 text-sm text-[#8a8698]">لا توجد دعوات حتى الآن.</div>}
          </section>
        ) : null}
      </div>
    </ManagementRouteShell>
  );
}
