"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  OwnershipError,
  listTenantMembers,
  ownershipErrorMessages,
  transferTenantOwnership,
} from "@/lib/auth/tenant-ownership";
import { withSessionUser } from "@/lib/auth/session-context";
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

  const outcome = await withSessionUser(async ({ sql, user }) => {
    // كل القراءات والكتابة داخل **معاملة واحدة** تحمل سياق المساحة. استخدام مُنفّذ
    // خارج معاملته يعمل بلا سياق ويرجع صفر صفوف، فالتجميع هنا شرط صحة لا تنظيم.
    await sql.enterTenantScope(tenantId);

    const members = await listTenantMembers(sql, tenantId);
    const actor = members.find((member) => member.userId === user.id);
    if (!actor || actor.role !== "owner") {
      return { ok: false as const, message: ownershipErrorMessages.not_owner };
    }

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
          actorUserId: user.id,
          actorRole: actor.role,
          targetUserId,
        }),
      };
    } catch (error) {
      if (error instanceof OwnershipError) return { ok: false as const, message: error.message };
      logError("ownership.transfer_failed", error, { tenantId, actorUserId: user.id, targetUserId });
      return { ok: false as const, message: "تعذر نقل الملكية. حاول مرة أخرى" };
    }
  });

  if (!outcome) redirect("/login");
  if (!outcome.ok) {
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
