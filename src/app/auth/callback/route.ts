import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("روابط المصادقة القديمة لم تعد مدعومة. استخدم تسجيل الدخول بكلمة المرور")}`, url.origin),
  );
}
