import { z } from "zod";

export const authSubmissionSchema = z.object({
  email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف").max(72, "كلمة المرور طويلة جدًا"),
  intent: z.enum(["sign-in", "sign-up"]),
});

const internationalPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "اكتب الرقم مع كود الدولة، مثال: +201001234567");

export const workspaceRequestSchema = z.object({
  accountType: z.enum(["center", "independent_teacher"]),
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(120, "الاسم طويل جدًا"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,60}$/, "الرابط يجب أن يتكون من حروف إنجليزية صغيرة وأرقام وشرطة فقط"),
  mobilePhone: internationalPhoneSchema,
  whatsappPhone: internationalPhoneSchema,
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
});

export const passwordResetRedemptionSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("أدخل بريدًا إلكترونيًا صحيحًا"),
    recoveryCode: z.string().trim().toUpperCase().regex(/^[A-F0-9]{8}$/, "كود الاستعادة غير صحيح"),
    password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف").max(72, "كلمة المرور طويلة جدًا"),
    passwordConfirmation: z.string(),
  })
  .refine((submission) => submission.password === submission.passwordConfirmation, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["passwordConfirmation"],
  });

export const rejectionReasonSchema = z
  .string()
  .trim()
  .min(3, "اكتب سببًا واضحًا للرفض")
  .max(500, "سبب الرفض طويل جدًا");

export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "تحقق من البيانات وحاول مرة أخرى";
}
