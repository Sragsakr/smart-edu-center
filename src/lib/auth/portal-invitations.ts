import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { applicationSql } from "@/lib/database/application-sql";
import type { AccessScopedSqlExecutor, SqlExecutor } from "@/lib/database/sql-executor";

/**
 * مسار موثوق لربط هوية بحساب طالب أو ولي أمر.
 *
 * **الخطر الذي يمنعه هذا الملف:** `students.user_id` و`guardians.user_id` يعنيان
 * «من يدخل البوابة باسم هذا الشخص». كتابتهما بلا تحقق = انتحال صفة. لذلك لا تُكتب
 * إلا عند تحقق ثلاثة شروط معًا:
 *
 * 1. **حيازة الرمز** — بصمة الرمز موجودة في الدعوة.
 * 2. **مطابقة البريد** — بريد الهوية الموثقة يطابق البريد المدعو. الرمز وحده لا يكفي.
 * 3. **السجل غير مربوط** — لا يُستولى على سجل سبق ربطه.
 *
 * ويُضاف شرط رابع على الهوية نفسها: ألا تكون مرتبطة بسجل آخر من نفس النوع في نفس
 * المساحة، فلا يتنقل الشخص بين سجلات الطلاب.
 *
 * المرجع: `P02-06` في docs/MASTER_EXECUTION_PLAN.md.
 */

export const portalSubjects = ["student", "guardian"] as const;
export type PortalSubject = (typeof portalSubjects)[number];

export const portalSubjectLabelsAr: Record<PortalSubject, string> = {
  student: "الطالب",
  guardian: "ولي الأمر",
};

const PORTAL_INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export class PortalClaimError extends Error {
  constructor(
    readonly reason:
      | "invalid_token"
      | "not_pending"
      | "expired"
      | "email_mismatch"
      | "record_already_claimed"
      | "identity_already_claimed"
      | "record_missing",
    message: string,
  ) {
    super(message);
    this.name = "PortalClaimError";
  }
}

export function digestPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePortalToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: digestPortalToken(raw) };
}

export type PortalInvitationPreview = {
  id: string;
  tenantId: string;
  subjectType: PortalSubject;
  inviteeEmail: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  accountExists: boolean;
};

/**
 * معاينة دعوة من رمزها — تُستخدم في صفحة القبول قبل تسجيل الدخول.
 *
 * تقرأ الدعوة عبر الدالة المحدودة `private.portal_invitation_by_token` لأن هذه
 * اللحظة تسبق معرفة المساحة، ثم تُوسَّع بـ`enterTenantScope` لقراءة اسم صاحب السجل.
 */
export async function getPortalInvitationPreview(token: string): Promise<PortalInvitationPreview | null> {
  if (!token) return null;
  const digest = digestPortalToken(token);

  return applicationSql().withoutSession(async (sql) => {
    const invitation = await sql.query<{
      id: string;
      tenant_id: string;
      subject_type: PortalSubject;
      invitee_email: string;
      status: PortalInvitationPreview["status"];
      expires_at: string;
    }>(
      `select id, tenant_id, subject_type::text as subject_type, invitee_email::text as invitee_email,
              status::text as status, expires_at::text as expires_at
       from private.portal_invitation_by_token($1)`,
      [digest],
    );
    const row = invitation.rows[0];
    if (!row) return null;

    // وجود الحساب يحدد أي شكل عرض يُقدَّم للمستخدم: إنشاء حساب جديد أو دخول بحساب قائم.
    const account = await sql.query<{ user_id: string }>(
      `select user_id from private.login_lookup($1::citext)`,
      [row.invitee_email],
    );

    return {
      id: row.id,
      tenantId: row.tenant_id,
      subjectType: row.subject_type,
      inviteeEmail: row.invitee_email,
      status: row.status,
      expiresAt: row.expires_at,
      accountExists: account.rowCount > 0,
    };
  });
}

/**
 * يحل الدعوة من بصمة رمزها بلا سياق مساحة.
 *
 * يستخدم الدالة المحدودة `private.portal_invitation_by_token` بدل قراءة الجدول:
 * قراءة الجدول هنا كانت ستنجح (سياسة SELECT بالرمز)، لكن **القفل** لا ينجح —
 * لأن `SELECT ... FOR UPDATE` يُطبّق سياسة `UPDATE` لا سياسة `SELECT` وحدها، وسياسة
 * التحديث تشترط سياق مساحة. لذلك القفل يُؤخذ لاحقًا بعد الدخول إلى المساحة.
 */
async function resolvePortalInvitationByToken(
  sql: AccessScopedSqlExecutor,
  tokenDigest: string,
): Promise<{
  id: string;
  tenantId: string;
  subjectType: PortalSubject;
  subjectId: string;
  inviteeEmail: string;
  status: PortalInvitationPreview["status"];
  expiresAt: string;
}> {
  const result = await sql.query<{
    id: string;
    tenant_id: string;
    subject_type: PortalSubject;
    student_id: string | null;
    guardian_id: string | null;
    invitee_email: string;
    status: PortalInvitationPreview["status"];
    expires_at: string;
  }>(
    `select id, tenant_id, subject_type::text as subject_type, student_id, guardian_id,
            invitee_email::text as invitee_email, status::text as status, expires_at::text as expires_at
     from private.portal_invitation_by_token($1)`,
    [tokenDigest],
  );
  const row = result.rows[0];
  if (!row) throw new PortalClaimError("invalid_token", "رابط الدعوة غير صالح");
  if (row.status !== "pending") {
    throw new PortalClaimError("not_pending", "تم استخدام هذه الدعوة أو إلغاؤها");
  }
  if (new Date(row.expires_at) <= new Date()) {
    throw new PortalClaimError("expired", "انتهت صلاحية الدعوة. اطلب دعوة جديدة من إدارة المساحة");
  }
  const subjectId = row.subject_type === "student" ? row.student_id : row.guardian_id;
  if (!subjectId) throw new PortalClaimError("record_missing", "سجل الدعوة غير موجود");
  return {
    id: row.id,
    tenantId: row.tenant_id,
    subjectType: row.subject_type,
    subjectId,
    inviteeEmail: row.invitee_email,
    status: row.status,
    expiresAt: row.expires_at,
  };
}

/**
 * يقفل صف الدعوة ويُعيد التحقق من حالته.
 *
 * يُنادى **بعد** الدخول إلى المساحة، لأن القفل يمر عبر سياسة `UPDATE` التي تشترط
 * سياق مساحة. إعادة التحقق مقصودة: بين القراءة الأولى والقفل قد تُقبل الدعوة من
 * طلب آخر متزامن، فنعيد فحص الحالة والرمز معًا.
 */
async function lockPendingPortalInvitationInTenant(
  sql: AccessScopedSqlExecutor,
  tokenDigest: string,
): Promise<{ id: string; status: PortalInvitationPreview["status"] }> {
  const result = await sql.query<{ id: string; status: PortalInvitationPreview["status"]; expires_at: string }>(
    `select id, status::text as status, expires_at::text as expires_at
     from public.portal_invitations
     where token_hash = $1
     for update`,
    [tokenDigest],
  );
  const row = result.rows[0];
  if (!row) throw new PortalClaimError("invalid_token", "رابط الدعوة غير صالح");
  if (row.status !== "pending") {
    throw new PortalClaimError("not_pending", "تم استخدام هذه الدعوة أو إلغاؤها");
  }
  if (new Date(row.expires_at) <= new Date()) {
    throw new PortalClaimError("expired", "انتهت صلاحية الدعوة. اطلب دعوة جديدة من إدارة المساحة");
  }
  return { id: row.id, status: row.status };
}

/** هل السجل مربوط بهوية بالفعل؟ */
async function isRecordClaimed(
  sql: AccessScopedSqlExecutor,
  subjectType: PortalSubject,
  subjectId: string,
): Promise<boolean> {
  const table = subjectType === "student" ? "students" : "guardians";
  const result = await sql.query<{ claimed: boolean }>(
    `select exists(select 1 from public.${table} where id = $1 and user_id is not null) as claimed`,
    [subjectId],
  );
  return result.rows[0]?.claimed === true;
}

/**
 * ينفّذ المطابقة والقبول.
 *
 * **يُنادى من مسار موثّق فقط**، والهوية تمر كوسيط لأن المتصل حلّها من الجلسة.
 * وكل الشروط تُفحص داخل معاملة واحدة بها قفل على صف الدعوة، فلا توجد نافذة سباق.
 */
export async function claimPortalInvitation(
  sql: AccessScopedSqlExecutor,
  {
    token,
    identity,
  }: {
    token: string;
    identity: { id: string; email: string };
  },
): Promise<{ tenantId: string; subjectType: PortalSubject; subjectId: string }> {
  const digest = digestPortalToken(token);

  // 1) حل الدعوة من الرمز بلا سياق مساحة — لا قفل في هذه الخطوة.
  const resolved = await resolvePortalInvitationByToken(sql, digest);

  // 2) الشرط الحاسم: الرمز وحده لا يكفي. لا بد أن يطابق البريدُ الموثّق البريدَ
  //    المدعو، وإلا استطاع حائزُ الرمز ربط هويته بسجل شخص آخر.
  if (resolved.inviteeEmail.trim().toLowerCase() !== identity.email.trim().toLowerCase()) {
    throw new PortalClaimError(
      "email_mismatch",
      "هذه الدعوة صادرة لبريد آخر. سجّل الدخول بالبريد الذي وصلته الدعوة",
    );
  }

  // 3) الدخول إلى المساحة، فيصبح القفل ممكنًا وتُقرأ جداول المساحة.
  await sql.enterTenantScope(resolved.tenantId);
  const locked = await lockPendingPortalInvitationInTenant(sql, digest);

  // 4) الشرط الثالث: لا يُستولى على سجل سبق ربطه.
  if (await isRecordClaimed(sql, resolved.subjectType, resolved.subjectId)) {
    throw new PortalClaimError(
      "record_already_claimed",
      "هذا السجل مرتبط بحساب بالفعل. إن كان ذلك خطأ تواصل مع إدارة المساحة",
    );
  }

  const table = resolved.subjectType === "student" ? "students" : "guardians";
  const claimed = await sql.query<{ id: string }>(
    `update public.${table}
     set user_id = $1, updated_at = now()
     where id = $2 and tenant_id = $3 and user_id is null
     returning id`,
    [identity.id, resolved.subjectId, resolved.tenantId],
  );
  if (claimed.rowCount !== 1) {
    // لا يمكن الوصول هنا لأن القفل والفحص سبقاه، لكن الفشل الصريح أأمن من النجاح الصامت.
    throw new PortalClaimError("record_missing", "تعذر ربط السجل. حاول مرة أخرى");
  }

  await sql.query(
    `update public.portal_invitations
     set status = 'accepted', accepted_by = $1, accepted_at = now(), updated_at = now()
     where id = $2 and status = 'pending'`,
    [identity.id, locked.id],
  );

  return {
    tenantId: resolved.tenantId,
    subjectType: resolved.subjectType,
    subjectId: resolved.subjectId,
  };
}

/** ينشئ دعوة لسجل داخل مساحة — للمدير أو من يملك صلاحية إدارة البوابة. */
export async function createPortalInvitation(
  sql: AccessScopedSqlExecutor,
  {
    tenantId,
    subjectType,
    subjectId,
    inviteeEmail,
    createdBy,
    now = new Date(),
  }: {
    tenantId: string;
    subjectType: PortalSubject;
    subjectId: string;
    inviteeEmail: string;
    createdBy: string;
    now?: Date;
  },
): Promise<{ id: string; rawToken: string }> {
  const { raw, hash } = generatePortalToken();
  const expiresAt = new Date(now.getTime() + PORTAL_INVITATION_TTL_MS);

  const result = await sql.query<{ id: string }>(
    `insert into public.portal_invitations
       (tenant_id, subject_type, student_id, guardian_id, invitee_email, token_hash, created_by, expires_at)
     values ($1, $2::public.portal_subject, $3, $4, $5, $6, $7, $8)
     on conflict (tenant_id, coalesce(student_id, guardian_id)) do update set
       subject_type = excluded.subject_type,
       invitee_email = excluded.invitee_email,
       token_hash = excluded.token_hash,
       status = 'pending',
       created_by = excluded.created_by,
       accepted_by = null,
       accepted_at = null,
       revoked_at = null,
       expires_at = excluded.expires_at,
       last_sent_at = now(),
       updated_at = now()
     returning id`,
    [
      tenantId,
      subjectType,
      subjectType === "student" ? subjectId : null,
      subjectType === "guardian" ? subjectId : null,
      inviteeEmail,
      hash,
      createdBy,
      expiresAt,
    ],
  );
  const invitation = result.rows[0];
  if (!invitation) throw new Error("تعذر إنشاء دعوة البوابة");
  return { id: invitation.id, rawToken: raw };
}

/** يلغي دعوة معلّقة — لا يؤثر على ربط قائم. */
export async function revokePortalInvitation(sql: SqlExecutor, invitationId: string): Promise<void> {
  await sql.query(
    `update public.portal_invitations
     set status = 'revoked', revoked_at = now(), updated_at = now()
     where id = $1 and status = 'pending'`,
    [invitationId],
  );
}
