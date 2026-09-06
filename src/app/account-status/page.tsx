import Link from "next/link";
import { CircleCheck, Clock3, GraduationCap, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";

export default async function AccountStatusPage() {
  const access = await getCurrentAccountAccess();
  if (!access.user) redirect("/login");
  if (access.membership) redirect("/");
  if (!access.request) redirect("/onboarding");
  if (access.request.status === "approved") redirect("/");

  const rejected = access.request.status === "rejected";

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5fb] p-4">
      <section className="w-full max-w-lg rounded-3xl border border-[#e8e5ef] bg-white p-8 text-center shadow-xl shadow-purple-100/50">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
          <GraduationCap aria-hidden="true" />
        </span>
        <span
          className={`mx-auto mt-7 grid size-16 place-items-center rounded-full ${rejected ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}
        >
          {rejected ? <TriangleAlert aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">
          {rejected ? "يحتاج طلبك إلى تعديل" : "طلبك قيد المراجعة"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#777386]">
          {rejected
            ? access.request.rejection_reason
            : "استلمنا بيانات مساحة العمل، وستراجعها إدارة المنصة وتتواصل معك قبل إنشاء المساحة وتفعيل الحساب. بعد التفعيل سجّل الدخول مرة أخرى."}
        </p>
        <div className="mt-6 rounded-2xl bg-[#f8f7fb] p-4 text-right text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#777386]">مساحة العمل</span>
            <b>{access.request.workspace_name}</b>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-[#777386]">نوع الحساب</span>
            <b>{access.request.account_type === "center" ? "سنتر تعليمي" : "مدرس مستقل"}</b>
          </div>
          {!rejected ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
              <CircleCheck className="size-4" aria-hidden="true" /> بيانات التواصل مسجلة
            </div>
          ) : null}
        </div>
        {rejected ? (
          <Link
            href="/onboarding"
            className="mt-6 block w-full rounded-xl bg-[#6547d9] py-3 font-bold text-white"
          >
            تعديل وإعادة إرسال الطلب
          </Link>
        ) : null}
        <form action={signOut} className="mt-3">
          <PendingSubmitButton
            idleLabel="تسجيل الخروج"
            pendingLabel="جارٍ تسجيل الخروج..."
            className="w-full rounded-xl border border-[#ddd8e9] py-3 text-sm font-bold text-[#5f5a70]"
          />
        </form>
      </section>
    </main>
  );
}
