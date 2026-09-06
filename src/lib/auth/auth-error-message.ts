export function signUpErrorMessage(errorCode?: string): string {
  switch (errorCode) {
    case "over_email_send_rate_limit":
      return "تم الوصول للحد المؤقت لإرسال رسائل التأكيد من Supabase. انتظر قليلًا ثم حاول مرة واحدة";
    case "email_address_not_authorized":
      return "خدمة البريد التجريبية لا تسمح بالإرسال إلى هذا البريد. استخدم بريد عضو في مشروع Supabase أو اضبط SMTP خاصًا";
    case "weak_password":
      return "اختر كلمة مرور أقوى ثم حاول مرة أخرى";
    case "signup_disabled":
      return "إنشاء الحسابات متوقف مؤقتًا";
    default:
      return "تعذر إنشاء الحساب حاليًا. تحقق من البيانات وحاول مرة أخرى";
  }
}
