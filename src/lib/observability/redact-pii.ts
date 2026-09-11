/**
 * حجب البيانات الشخصية والأسرار قبل كتابة أي سجل.
 *
 * أي قيمة تُسجَّل من مسار خطأ قد تحمل بريدًا أو رقم هاتف أو رمز جلسة،
 * فالتنقيح يحدث في مكان واحد قبل الإخراج، ولا يُترك لتقدير موضع الاستدعاء.
 *
 * مبدأَان مهمان يمنعان إتلاف قيمة السجل:
 * - **المعرّفات (UUID) لا تُحجب**، لأنها ما يربط السجل بالمورد الذي فشل.
 * - **الطوابع الزمنية لا تُحجب**، لأنها ليست بيانات شخصية وتشويشها يفسد التحليل.
 *
 * المرجع: docs/MASTER_EXECUTION_PLAN.md القسم 7 و`P01-13`.
 */

const UUID_SOURCE = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const UUID_PATTERN = new RegExp(`^${UUID_SOURCE}$`);

const CONNECTION_SOURCE = "postgres(?:ql)?://\\S+";
const EMAIL_SOURCE = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";
const BEARER_SOURCE = "\\b(?:bearer|token|apikey|api_key|password|secret)\\b\\s*[:=]\\s*\\S+";
const DIGEST_SOURCE = "\\b[A-Fa-f0-9]{64}\\b";
// الهاتف يبدأ بـ`+` أو بصفر محلي، حتى لا تُحجب تواريخ ISO مثل 2026-09-11.
const PHONE_SOURCE = "\\+\\d[\\d\\s\\-()]{7,}\\d|\\b0\\d[\\d\\s\\-()]{7,}\\d";
const TOKEN_SOURCE = "\\b[A-Za-z0-9_-]{20,}\\b";

/**
 * مسار واحد بترتيب مقصود: معرّفات UUID أولًا لتُستثنى، ثم الأسرار، ثم البيانات الشخصية.
 * الترتيب مهم لأن بدائل أوسع (مثل الرمز الطويل) قد تلتقط ما التقطه بديل أضيق.
 */
const REDACTION_PATTERN = new RegExp(
  `(${UUID_SOURCE})|(${CONNECTION_SOURCE})|(${BEARER_SOURCE})|(${EMAIL_SOURCE})|(${DIGEST_SOURCE})|(${PHONE_SOURCE})|(${TOKEN_SOURCE})`,
  "gi",
);

export const REDACTED = "[redacted]";

/** مفتاح يُستبعد محتواه بالكامل لأنه حامل أسرار بطبيعته. */
const SENSITIVE_KEY_PATTERN = /(password|passwd|secret|token|authorization|cookie|credential|apikey|api_key|session)/i;

const MAX_DEPTH = 6;
const MAX_ENTRIES = 50;
const MAX_STRING_LENGTH = 2000;

/**
 * ينقّح نصًا واحدًا مما قد يحمل بيانات شخصية أو أسرارًا، مع الحفاظ على المعرّفات.
 */
export function redactText(value: string): string {
  return value
    .replace(REDACTION_PATTERN, (match) => (UUID_PATTERN.test(match) ? match : REDACTED))
    .slice(0, MAX_STRING_LENGTH);
}

/**
 * ينقّح أي قيمة قبل التسجيل: النصوص تُمرَّر على `redactText`، والمفاتيح الحساسة
 * يُستبدل محتواها كاملًا، والعمق وعدد العناصر محدودان لتفادي تسجيل أشجار ضخمة.
 */
export function redactValue(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { name: value.name, message: redactText(value.message) };
  if (depth >= MAX_DEPTH) return "[depth-limit]";

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ENTRIES).map((item) => redactValue(item, key, depth + 1));
    return value.length > MAX_ENTRIES ? [...items, `[${value.length - MAX_ENTRIES} more]`] : items;
  }

  if (typeof value === "object") {
    const seen = new WeakSet<object>();
    const result: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      if (childValue && typeof childValue === "object") {
        if (seen.has(childValue)) {
          result[childKey] = "[circular]";
          continue;
        }
        seen.add(childValue);
      }
      result[childKey] = redactValue(childValue, childKey, depth + 1);
    }
    return result;
  }

  return "[unloggable]";
}
