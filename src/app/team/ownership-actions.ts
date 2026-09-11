"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePostgresTenantCapability } from "@/lib/auth/postgres-team";
import {
  OwnershipError,
  listTenantMembers,
  ownershipErrorMessages,
  transferTenantOwnership,
} from "@/lib/auth/tenant-ownership";
import { logError, logEvent } from "@/lib/observability/server-logger";

/**
 * نقل ملكية مساحة العمل.
 *
 * يمرّ بالنقاط الثلاث المعتادة: صلاحية الدور، ثم تفعيل النوع (استحقاق التشغيل)،
 * ثم النطاق (العضو داخل نفس المساحة). وفوقها تأكيد صريح من المستخدم بكتابة بريد
 * المنقول إليه، لأن الخطأ هنا يغيّر من يملك المساحة.
 */
export async function transferOwnership(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  const targetUserId = String(formData.get("target_user_id") ?? "");
  const confirmation = String(formData.get("confirm_email") ?? "").trim().toLowerCase();

  if (!tenantId) redirect("/");

  if (!confirmation) {
    redirect(`/team?tenant=${tenantId}&error=${encodeURIComponent("اكتب بريد العضو الجديد كما هو لتأكيد النقل")}`);
  }

  // الفحص يمر بالحارس الموحّد لا بفحص محلي: هو الذي يتأكد أن العضوية **نشطة**،
  // ويمنح نطاق المساحة، ويشغّل العملية داخل معاملة واحدة. الفحص المحلي الذي كان
  // هنا قرأ الدور ولم يقرأ `active`، فأتاح لمالك معطَّل أن ينقل الملكية.
  const outcome = await requirePostgresTenantCapability(tenantId, "team.manage", async ({ sql, userId, role }) => {
    const members = await listTenantMembers(sql, tenantId);
    const target = members.find((member) => member.userId === targetUserId);
    if (!target) {
      return { ok: false as const, message: ownershipErrorMessages.target_missing };
    }

    // البريد المستهدف يُشتق على الخادم من معرّف العضو، لا من حقل مخفي في النموذج:
    // قيمة التأكيد يجب أن تأتي من مصدر الحقيقة لا من مدخل يتحكم به العميل.
    if (confirmation !== target.email.trim().toLowerCase()) {
      return { ok: false as const, message: "اكتب بريد العضو الجديد كما هو لتأكيد النقل" };
    }

    try {
      return {
        ok: true as const,
        result: await transferTenantOwnership(sql, {
          tenantId,
          actorUserId: userId,
          actorRole: role,
          targetUserId,
        }),
      };
    } catch (error) {
      if (error instanceof OwnershipError) return { ok: false as const, message: error.message };
      logError("ownership.transfer_failed", error, { tenantId, actorUserId: userId, targetUserId });
      return { ok: false as const, message: "تعذر نقل الملكية. حاول مرة أخرى" };
    }
  }).catch((error: unknown) => ({
    // رفض الحارس: عضوية معطّلة، أو دور لا يملك `team.manage`. ورسالته هي ما يُعرض.
    ok: false as const,
    message: error instanceof Error ? error.message : "تعذر نقل الملكية",
  }));

  if (!outcome.ok) {
    // الرفض حدث متوقع (عضوية معطّلة، أو دور لا يملك `team.manage`، أو تأكيد خاطئ)،
    // فيُسجَّل للمراقبة الأمنية بلا معاملته كخطأ نظام.
    logEvent({
      level: "warn",
      event: "ownership.transfer_refused",
      message: "ownership transfer refused",
      context: { tenantId, targetUserId, reason: outcome.message },
    });
    redirect(`/team?tenant=${tenantId}&error=${encodeURIComponent(outcome.message)}`);
  }

  logEvent({
    level: "info",
    event: "ownership.transferred",
    message: "tenant ownership transferred",
    context: { tenantId, previousOwnerUserId: outcome.result.previousOwnerUserId },
  });

  revalidatePath("/team");
  redirect(
    `/team?tenant=${tenantId}&success=${encodeURIComponent("تم نقل ملكية المساحة. دورك الآن مشرف")}`,
  );
}
