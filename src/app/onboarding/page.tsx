import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";
import { submitWorkspaceRequest } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await getCurrentAccountAccess();
  if (!access.user) redirect("/login");
  if (access.membership) redirect("/");
  if (access.request?.status === "pending_approval") redirect("/account-status");
  if (access.request?.status === "approved") redirect("/");

  const params = await searchParams;
  const rejectedRequest = access.request?.status === "rejected" ? access.request : null;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5fb] p-4" dir="rtl">
      <form
        action={submitWorkspaceRequest}
        className="w-full max-w-lg space-y-5 rounded-3xl bg-white p-8 shadow-xl shadow-purple-100/60"
      >
        <div>
          <h1 className="text-2xl font-extrabold">
            {rejectedRequest ? "تعديل طلب التفعيل" : "اطلب إنشاء مساحة عمل"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#777386]">
            أدخل بيانات نشاطك، ثم تراجع إدارة المنصة الطلب قبل تفعيل المساحة.
          </p>
        </div>
        {rejectedRequest?.rejection_reason ? (
          <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            سبب الرفض السابق: {rejectedRequest.rejection_reason}
          </p>
        ) : null}
        {params.error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        <fieldset>
          <legend className="mb-2 text-sm font-bold">نوع الحساب</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="cursor-pointer rounded-xl border p-4 text-sm has-[:checked]:border-[#6547d9] has-[:checked]:bg-[#f5f2ff]">
              <input
                className="ml-2"
                type="radio"
                name="account_type"
                value="center"
                defaultChecked={rejectedRequest?.account_type !== "independent_teacher"}
              />
              سنتر تعليمي
              <span className="mt-1 block text-xs text-[#777386]">فروع، موظفون وعدة مدرسين</span>
            </label>
            <label className="cursor-pointer rounded-xl border p-4 text-sm has-[:checked]:border-[#6547d9] has-[:checked]:bg-[#f5f2ff]">
              <input
                className="ml-2"
                type="radio"
                name="account_type"
                value="independent_teacher"
                defaultChecked={rejectedRequest?.account_type === "independent_teacher"}
              />
              مدرس مستقل
              <span className="mt-1 block text-xs text-[#777386]">مجموعات وطلاب تحت اسمك</span>
            </label>
          </div>
        </fieldset>
        <label htmlFor="workspace-name" className="block text-sm font-bold">
          اسم السنتر أو المدرس
        </label>
        <input
          id="workspace-name"
          name="name"
          minLength={2}
          maxLength={120}
          defaultValue={rejectedRequest?.workspace_name}
          required
          className="w-full rounded-xl border p-3 font-normal"
          placeholder="سنتر التفوق أو أ/ أحمد"
        />
        <label htmlFor="workspace-slug" className="block text-sm font-bold">
          الرابط المختصر
        </label>
        <input
          id="workspace-slug"
          name="slug"
          pattern="[a-z0-9-]{3,60}"
          defaultValue={rejectedRequest?.slug}
          required
          className="w-full rounded-xl border p-3 text-left font-normal"
          placeholder="center-or-teacher-name"
          dir="ltr"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mobile-phone" className="block text-sm font-bold">
              رقم الموبايل
            </label>
            <input
              id="mobile-phone"
              name="mobile_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              pattern="\+[1-9][0-9]{7,14}"
              defaultValue={rejectedRequest?.mobile_phone ?? "+20"}
              required
              dir="ltr"
              className="mt-2 w-full rounded-xl border p-3 text-left font-normal"
              placeholder="+201001234567"
            />
          </div>
          <div>
            <label htmlFor="whatsapp-phone" className="block text-sm font-bold">
              رقم واتساب
            </label>
            <input
              id="whatsapp-phone"
              name="whatsapp_phone"
              type="tel"
              inputMode="tel"
              pattern="\+[1-9][0-9]{7,14}"
              defaultValue={rejectedRequest?.whatsapp_phone ?? "+20"}
              required
              dir="ltr"
              className="mt-2 w-full rounded-xl border p-3 text-left font-normal"
              placeholder="+201001234567"
            />
          </div>
        </div>
        <p className="text-xs leading-6 text-[#6f6a80]">
          استخدم كود الدولة مثل +20؛ ستستخدم إدارة المنصة هذه الأرقام للتواصل بشأن تفعيل الاشتراك.
        </p>
        <PendingSubmitButton
          idleLabel={rejectedRequest ? "إعادة إرسال الطلب" : "إرسال طلب التفعيل"}
          pendingLabel="جارٍ إرسال الطلب..."
          className="w-full rounded-xl bg-[#6547d9] py-3 font-bold text-white"
        />
      </form>
    </main>
  );
}
