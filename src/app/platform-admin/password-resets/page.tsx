import { Check, Clock3, MessageCircle, X } from "lucide-react";
import { redirect } from "next/navigation";
import { listPendingPasswordResetRequests } from "@/lib/auth/account-access";
import { approvePasswordReset, rejectPasswordReset } from "./actions";
import { PlatformPageHeader } from "@/components/platform-page-header";

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

export default async function PasswordResetsPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string; code?: string; phone?: string; error?: string }>;
}) {
  const pendingRequests = await listPendingPasswordResetRequests();
  if (!pendingRequests) redirect("/");
  const params = await searchParams;

  const approvedRequest =
    params.requestId && params.code
      ? pendingRequests.find((request) => request.id === params.requestId)
      : null;

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <PlatformPageHeader title="طلبات استعادة كلمة المرور" description="مراجعة الطلبات وإصدار أكواد الاستعادة الآمنة." />

        {params.error ? (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{params.error}</p>
        ) : null}

        {approvedRequest ? (
          <section className="mb-5 rounded-2xl bg-emerald-50 p-5">
            <p className="text-xs font-bold text-emerald-800">كود الاستعادة الصادر (صالح 15 دقيقة):</p>
            <p className="mt-2 font-mono text-3xl font-extrabold tracking-[0.3em] text-emerald-700" dir="ltr">
              {params.code}
            </p>
            <a
              href={`https://wa.me/${(params.phone ?? approvedRequest.whatsapp_phone).replace("+", "")}?text=${encodeURIComponent(
                `كود استعادة كلمة المرور لمنصة Smart Edu Center: ${params.code}. الكود صالح لمدة 15 دقيقة لاستخدام واحد ولا يشارك مع أحد.`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#25d366] px-4 py-2 text-sm font-bold text-white"
            >
              <MessageCircle className="size-4" aria-hidden="true" /> إرسال الكود عبر واتساب
            </a>
          </section>
        ) : null}

        {pendingRequests.length === 0 ? (
          <section className="card grid min-h-80 place-items-center p-8 text-center">
            <div>
              <Check className="mx-auto size-10 text-emerald-600" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-extrabold">لا توجد طلبات استعادة معلقة</h2>
              <p className="mt-2 text-sm text-[#777386]">كل طلبات استعادة كلمة المرور تمت معالجتها.</p>
            </div>
          </section>
        ) : (
          <section className="grid gap-4">
            {pendingRequests.map((request) => (
              <article key={request.id} className="card p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold">طلب استعادة كلمة مرور</h3>
                    <p className="mt-1 text-sm text-[#777386]" dir="ltr">{request.requested_email}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    في انتظار المراجعة
                  </span>
                </div>
                <dl className="mt-5 grid gap-3 rounded-2xl bg-[#f8f7fb] p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[#777386]">رقم واتساب</dt>
                    <dd className="mt-1 font-bold" dir="ltr">{request.whatsapp_phone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#777386]">تاريخ الطلب</dt>
                    <dd className="mt-1 font-bold">{dateFormatter.format(new Date(request.created_at))}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  <form action={approvePasswordReset}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl bg-[#6547d9] px-5 py-3 text-sm font-bold text-white"
                    >
                      <Check className="size-4" aria-hidden="true" /> توليد الكود وإرساله
                    </button>
                  </form>
                  <form action={rejectPasswordReset}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700"
                    >
                      <X className="size-4" aria-hidden="true" /> رفض الطلب
                    </button>
                  </form>
                </div>
                <p className="mt-4 flex items-center gap-1 text-xs text-[#6f6a80]">
                  <Clock3 className="size-3" aria-hidden="true" /> الكود صالح 15 دقيقة وللاستخدام مرة واحدة وبحد 5 محاولات خاطئة.
                </p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
