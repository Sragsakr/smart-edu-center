import "server-only";

import { redactValue } from "@/lib/observability/redact-pii";

/**
 * سجل أخطاء وأحداث منظم بصيغة JSON سطر واحد.
 *
 * لا يعتمد على مزوّد خارجي: المخرجات تذهب إلى stdout/stderr ليستقبلها سجلّ الحاوية
 * (Coolify). واختيار مزوّد تتبّع أخطاء مؤجل إلى حين وجود حاجة مثبتة وموافقة مالك.
 *
 * القاعدة الملزمة: كل سياق يمر على التنقيح قبل الكتابة، فلا تُسجَّل بيانات شخصية
 * ولا أسرار ولا رموز جلسات. المرجع: `P01-13`.
 */

export const logLevels = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof logLevels)[number];

export type LogRecord = {
  level: LogLevel;
  event: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
};

/**
 * يبني سجلًا منقّحًا جاهزًا للكتابة. دالة نقية ليمكن اختبارها بلا I/O.
 */
export function buildLogRecord({
  level,
  event,
  message,
  context,
  timestamp = new Date(),
}: {
  level: LogLevel;
  event: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp?: Date;
}): LogRecord {
  const record: LogRecord = {
    level,
    event,
    message: String(redactValue(message)),
    timestamp: timestamp.toISOString(),
  };
  if (context && Object.keys(context).length > 0) {
    record.context = redactValue(context) as Record<string, unknown>;
  }
  return record;
}

function write(record: LogRecord): void {
  const line = `${JSON.stringify(record)}\n`;
  if (record.level === "error" || record.level === "warn") process.stderr.write(line);
  else process.stdout.write(line);
}

export function logEvent(input: {
  level: LogLevel;
  event: string;
  message: string;
  context?: Record<string, unknown>;
}): LogRecord {
  const record = buildLogRecord(input);
  write(record);
  return record;
}

/**
 * يسجّل خطأ غير متوقع بصيغة موحّدة مع سياق منقّح.
 *
 * `errorId` مقتطف من الـdigest ليمكن ربط تقرير المستخدم بالسجل بلا تسجيل أي سر.
 */
export function logError(event: string, error: unknown, context?: Record<string, unknown>): LogRecord {
  const message = error instanceof Error ? error.message : "unknown error";
  const errorId = error instanceof Error ? error.name : "UnknownError";
  return logEvent({
    level: "error",
    event,
    message,
    context: { ...context, errorId },
  });
}
