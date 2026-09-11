"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { applicationSql } from "@/lib/database/application-sql";
import { withSessionUser } from "@/lib/auth/session-context";
import {
  PortalClaimError,
  claimPortalInvitation,
  getPortalInvitationPreview,
} from "@/lib/auth/portal-invitations";
import { buildRateLimitRules, clientAddress, consumeRateLimit, describeRetryAfter } from "@/lib/security/rate-limit";
import { logError, logEvent } from "@/lib/observability/server-logger";

function claimError(token: string, message: string): never {
  redirect(`/claim?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`);
}

/**
 * قبول دعوة بوابة الطالب أو ولي الأمر.
 *
 * الشرط الحاسم: القبول يحدث **من هوية موثقة**، ويجب أن يطابق بريدها البريد المدعو.
 * فلا يكفي حيازة الرابط، وهذا ما يمنع ربط هوية بسجل شخص آخر.
 */
export async function claimPortalAccess(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  const blocked = await consumeRateLimit(applicationSql(), {
    scope: "invite_accept",
    rules: buildRateLimitRules({ scope: "invite_accept", address: clientAddress(await headers()) }),
  });
  if (!blocked.allowed) {
    claimError(token, `${blocked.message} (${describeRetryAfter(blocked.retryAfterSeconds)})`);
  }

  const outcome = await withSessionUser(async ({ sql, user }) => {
    try {
      const claimed = await claimPortalInvitation(sql, { token, identity: user });
      return { ok: true as const, claimed };
    } catch (error) {
      if (error instanceof PortalClaimError) return { ok: false as const, message: error.message, reason: error.reason };
      logError("portal_claim.unexpected", error, { userId: user.id });
      return { ok: false as const, message: "تعذر إكمال ربط الحساب. حاول مرة أخرى", reason: "unexpected" };
    }
  });

  if (!outcome) {
    // لا جلسة: نوجّه للدخول مع إعادة المستخدم إلى نفس الدعوة بعد التوثيق.
    redirect(`/login?message=${encodeURIComponent("سجّل الدخول بالبريد الذي وصلته الدعوة لإكمال الربط")}`);
  }

  if (!outcome.ok) {
    // المحاولة الفاشلة تُسجَّل بسببها فقط، بلا token ولا بريد.
    logEvent({
      level: "warn",
      event: "portal_claim.rejected",
      message: outcome.reason,
      context: {},
    });
    claimError(token, outcome.message);
  }

  logEvent({
    level: "info",
    event: "portal_claim.accepted",
    message: "portal access linked",
    context: { tenantId: outcome.claimed.tenantId, subjectType: outcome.claimed.subjectType },
  });

  redirect(outcome.claimed.subjectType === "student" ? "/student" : "/parent");
}

/** إعادة توجيه الدعوة إلى مسار التوثيق المناسب حسب وجود الحساب. */
export async function continuePortalClaim(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const preview = await getPortalInvitationPreview(token);
  if (!preview) claimError(token, "رابط الدعوة غير صالح");

  if (preview.accountExists) {
    redirect(`/login?message=${encodeURIComponent("سجّل الدخول بالبريد الذي وصلته الدعوة لإكمال الربط")}`);
  }
  redirect(`/signup?invite=${encodeURIComponent(token)}`);
}
