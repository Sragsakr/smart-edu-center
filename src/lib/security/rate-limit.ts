/**
 * تحديد معدّل المحاولات لمسارات المصادقة الحساسة.
 *
 * التنفيذ مدعوم بـPostgreSQL لا بـRedis: قاعدة البيانات موجودة أصلًا، والعمليات
 * قليلة ومكتوبة، فلا نضيف بنية تحتية جديدة لحاجة لم تُثبت (قاعدة `AGENTS.md`).
 *
 * ثلاث قواعد تحكم التصميم:
 * - **لا تُخزَّن أي معرّفات خام.** المفتاح بصمة sha256، فالجدول لا يحمل بريدًا ولا IP.
 * - **النجاح يمحو المحاولات.** المستخدم الذي دخل بنجاح لا يُعاقَب بمحاولات قديمة.
 * - **الحجب لا يكشف شيئًا.** الرد واحد سواء كان الحساب موجودًا أو لا.
 *
 * المرجع: `P02-11` في docs/MASTER_EXECUTION_PLAN.md.
 */
import { createHash } from "node:crypto";

import type { SqlExecutor } from "@/lib/database/sql-executor";

export const rateLimitScopes = [
  "login",
  "platform_login",
  "signup",
  "password_reset_request",
  "password_reset_redeem",
  "invite_accept",
  "bootstrap",
] as const;

export type RateLimitScope = (typeof rateLimitScopes)[number];

export type RateLimitPolicy = {
  /** أقصى محاولات لنفس الحساب/المعرّف المستهدف داخل النافذة. */
  limit: number;
  /**
   * أقصى محاولات من نفس المصدر (عنوان الشبكة) داخل النافذة.
   *
   * أعلى من حدّ الحساب عمدًا: العنوان مشترك بين كل من هم خلف نفس الشبكة، فسنتر
   * فيه عشرون موظفًا يخطئ أحدهم عشر مرات لا يجوز أن يُقفل البقية. لكنه ليس بلا حدّ
   * حتى لا يصبح المصدر الواحد منفذ إغراق.
   */
  addressLimit: number;
  windowSeconds: number;
  /** نص عربي يظهر عند حجب حساب بعينه. */
  message: string;
  /** نص عربي يظهر عند حجب المصدر كله. */
  addressMessage: string;
};

/**
 * السياسة لكل مسار.
 *
 * الأرقام مقصودة: مسارات تخمين الأسرار (الدخول، استبدال الكود) أضيق نوافذ وأقل
 * حدودًا، ومسارات الإرسال أوسع لأن الشرعية منها أكثر تكرارًا.
 */
export const rateLimitPolicies: Record<RateLimitScope, RateLimitPolicy> = {
  login: {
    limit: 10,
    addressLimit: 60,
    windowSeconds: 15 * 60,
    message: "محاولات دخول كثيرة من هذا الحساب. انتظر قليلًا ثم حاول مرة أخرى",
    addressMessage: "محاولات دخول كثيرة من هذا الجهاز أو الشبكة. انتظر قليلًا ثم حاول مرة أخرى",
  },
  platform_login: {
    limit: 6,
    addressLimit: 30,
    windowSeconds: 15 * 60,
    message: "محاولات دخول كثيرة لحساب إدارة المنصة. انتظر قليلًا ثم حاول مرة أخرى",
    addressMessage: "محاولات دخول كثيرة من هذا الجهاز أو الشبكة. انتظر قليلًا ثم حاول مرة أخرى",
  },
  signup: {
    limit: 5,
    addressLimit: 15,
    windowSeconds: 60 * 60,
    message: "طلبات إنشاء حسابات كثيرة من هذا الحساب. انتظر قليلًا ثم حاول مرة أخرى",
    addressMessage: "طلبات إنشاء حسابات كثيرة من هذا المصدر. انتظر قليلًا ثم حاول مرة أخرى",
  },
  password_reset_request: {
    limit: 5,
    addressLimit: 30,
    windowSeconds: 60 * 60,
    message: "طلبات استعادة كثيرة لهذا الحساب. انتظر قليلًا ثم حاول مرة أخرى",
    addressMessage: "طلبات استعادة كثيرة من هذا المصدر. انتظر قليلًا ثم حاول مرة أخرى",
  },
  password_reset_redeem: {
    limit: 6,
    addressLimit: 30,
    windowSeconds: 15 * 60,
    message: "محاولات إدخال كود كثيرة لهذا الحساب. انتظر قليلًا ثم حاول مرة أخرى",
    addressMessage: "محاولات إدخال أكواد كثيرة من هذا المصدر. انتظر قليلًا ثم حاول مرة أخرى",
  },
  invite_accept: {
    limit: 12,
    addressLimit: 60,
    windowSeconds: 60 * 60,
    message: "محاولات قبول دعوات كثيرة لهذا الحساب. انتظر قليلًا ثم حاول مرة أخرى",
    addressMessage: "محاولات قبول دعوات كثيرة من هذا المصدر. انتظر قليلًا ثم حاول مرة أخرى",
  },
  bootstrap: {
    limit: 5,
    addressLimit: 5,
    windowSeconds: 60 * 60,
    message: "محاولات تهيئة كثيرة. انتظر قليلًا ثم حاول مرة أخرى",
    addressMessage: "محاولات تهيئة كثيرة من هذا المصدر. انتظر قليلًا ثم حاول مرة أخرى",
  },
};

/** مفتاح المجموعة: بصمة لا تكشف معرّفها الأصلي. */
export function bucketKey(scope: RateLimitScope, identifier: string): string {
  return createHash("sha256").update(`${scope}\u0000${identifier}`).digest("hex");
}

/**
 * مصدر الطلب من الترويسات.
 *
 * `x-forwarded-for` يُقرأ لأنه الوسيلة المتاحة خلف الوكيل، لكنه **مدخل غير موثوق**:
 * يمكن تزويره. لذلك لا يُعتمد عليه وحده، بل يُجمع مع بصمة المعرّف (البريد) في
 * مسارات الدخول. تزوير الترويسة يسمح بتجاوز حدّ الـIP فقط، ولا يسمح بتجاوز حدّ
 * الحساب نفسه.
 */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || headers.get("cf-connecting-ip")?.trim() || "unknown";
}

/** معرّف واحد مع حدّه: الهدف (حساب) أو المصدر (شبكة). */
export type RateLimitRule = {
  identifier: string;
  limit: number;
  windowSeconds: number;
  message: string;
};

export type RateLimitRequest = {
  scope: RateLimitScope;
  /**
   * القواعد التي يُحسب عليها الحد. الأشدّ يفوز، فيصعب توزيع المحاولات لتجاوز
   * الحد عبر تغيير أحد المعرّفين.
   */
  rules: RateLimitRule[];
};

/**
 * يبني قاعدتي الحساب والمصدر من سياسة المسار.
 *
 * الفصل مقصود: حدّ المصدر أعلى لأن العنوان مشترك، ودمجهما في حدّ واحد كان
 * يُقفل كل من هم خلف نفس الشبكة بسبب خطأ مستخدم واحد.
 */
export function buildRateLimitRules({
  scope,
  account,
  address,
}: {
  scope: RateLimitScope;
  account?: string;
  address?: string;
}): RateLimitRule[] {
  const policy = rateLimitPolicies[scope];
  const rules: RateLimitRule[] = [];
  if (account) {
    rules.push({
      identifier: `account:${account.trim().toLowerCase()}`,
      limit: policy.limit,
      windowSeconds: policy.windowSeconds,
      message: policy.message,
    });
  }
  if (address && address !== "unknown") {
    rules.push({
      identifier: `address:${address.trim()}`,
      limit: policy.addressLimit,
      windowSeconds: policy.windowSeconds,
      message: policy.addressMessage,
    });
  }
  return rules;
}

export type RateLimitDecision = {
  allowed: boolean;
  attempts: number;
  retryAfterSeconds: number;
  message?: string;
};

const ALLOWED: RateLimitDecision = { allowed: true, attempts: 0, retryAfterSeconds: 0 };

/**
 * يفحص ويسجّل محاولة واحدة.
 *
 * التسجيل والعدّ يتمّان في نداء قاعدة بيانات واحد، فلا يمكن لمحاولات متزامنة
 * أن تتجاوز الحدّ بتراكم القراءات السابقة.
 */
export async function consumeRateLimit(
  sql: SqlExecutor,
  { scope, rules }: RateLimitRequest,
): Promise<RateLimitDecision> {
  let worst: RateLimitDecision = ALLOWED;

  for (const rule of rules) {
    if (!rule.identifier.trim()) continue;
    const result = await sql.query<{ attempts: number; allowed: boolean; retry_after_seconds: number }>(
      `select attempts, allowed, retry_after_seconds
       from private.record_auth_attempt($1, $2, $3, $4)`,
      [bucketKey(scope, rule.identifier), scope, rule.windowSeconds, rule.limit],
    );
    const row = result.rows[0];
    if (!row) continue;
    if (!row.allowed) {
      return {
        allowed: false,
        attempts: row.attempts,
        retryAfterSeconds: row.retry_after_seconds,
        message: rule.message,
      };
    }
    if (row.attempts > worst.attempts) {
      worst = { allowed: true, attempts: row.attempts, retryAfterSeconds: 0 };
    }
  }

  return worst;
}

/** يمحو محاولات هذه القواعد — يُنادى بعد نجاح العملية فقط. */
export async function clearRateLimit(sql: SqlExecutor, { scope, rules }: RateLimitRequest): Promise<void> {
  for (const rule of rules) {
    if (!rule.identifier.trim()) continue;
    await sql.query(`select private.clear_auth_attempts($1)`, [bucketKey(scope, rule.identifier)]);
  }
}

/** يصف مدة الانتظار بصيغة عربية مفهومة. */
export function describeRetryAfter(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return hours === 1 ? "ساعة تقريبًا" : `${hours} ساعات تقريبًا`;
  }
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return minutes === 1 ? "دقيقة تقريبًا" : `${minutes} دقائق تقريبًا`;
  }
  return `${Math.max(1, seconds)} ثانية`;
}
