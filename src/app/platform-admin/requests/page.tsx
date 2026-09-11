import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { listPendingWorkspaceRequests } from "@/lib/auth/account-access";
import { productLevelLabelsAr } from "@/lib/tenant/product-level";
import { tenantTypeLabelsAr } from "@/lib/tenant/tenant-type";
import { approveWorkspaceRequest, rejectWorkspaceRequest } from "./actions";
import { PlatformPageHeader } from "@/components/platform-page-header";

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

export default async function PlatformRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const requests = await listPendingWorkspaceRequests();
  if (!requests) redirect("/");
  const params = await searchParams;

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <PlatformPageHeader title="طلبات تفعيل الحسابات" description="مراجعة طلبات السناتر والمدرسين المستقلين قبل التفعيل." />

        {params.error ? (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}

        {requests.length === 0 ? (
          <section className="card grid min-h-80 place-items-center p-8 text-center">
            <div>
              <Check className="mx-auto size-10 text-emerald-600" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-extrabold">لا توجد طلبات معلقة</h2>
              <p className="mt-2 text-sm text-[#777386]">كل طلبات إنشاء مساحات العمل تمت مراجعتها.</p>
            </div>
          </section>
        ) : (
          <section className="grid gap-4">
            {requests.map((request) => (
              <article key={request.id} className="card p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold">{request.workspace_name}</h2>
                    <p className="mt-1 text-sm text-[#777386]" dir="ltr">
                      {request.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    في انتظار المراجعة
                  </span>
                </div>
                <dl className="mt-5 grid gap-3 rounded-2xl bg-[#f8f7fb] p-4 text-sm sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <dt className="text-xs text-[#777386]">نوع النشاط</dt>
                    <dd className="mt-1 font-bold">
                      {tenantTypeLabelsAr[request.tenant_type]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#777386]">مستوى المنتج المطلوب</dt>
                    <dd className="mt-1 font-bold">
                      {productLevelLabelsAr[request.requested_product_level]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#777386]">الرابط المختصر</dt>
                    <dd className="mt-1 font-bold" dir="ltr">{request.slug}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#777386]">رقم الموبايل</dt>
                    <dd className="mt-1 font-bold" dir="ltr">
                      {request.mobile_phone ? <a href={`tel:${request.mobile_phone}`}>{request.mobile_phone}</a> : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#777386]">رقم واتساب</dt>
                    <dd className="mt-1 font-bold" dir="ltr">
                      {request.whatsapp_phone ? (
                        <a
                          href={`https://wa.me/${request.whatsapp_phone.slice(1)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {request.whatsapp_phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#777386]">تاريخ الطلب</dt>
                    <dd className="mt-1 font-bold">{dateFormatter.format(new Date(request.created_at))}</dd>
                  </div>
                </dl>
                <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr]">
                  <form action={approveWorkspaceRequest.bind(null, request.id)}>
                    <PendingSubmitButton
                      idleLabel="قبول وتفعيل الحساب"
                      pendingLabel="جارٍ التفعيل..."
                      className="w-full rounded-xl bg-[#6547d9] px-5 py-3 text-sm font-bold text-white"
                    />
                  </form>
                  <form
                    action={rejectWorkspaceRequest.bind(null, request.id)}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <label htmlFor={`reason-${request.id}`} className="sr-only">سبب الرفض</label>
                    <input
                      id={`reason-${request.id}`}
                      name="reason"
                      minLength={3}
                      maxLength={500}
                      required
                      placeholder="سبب الرفض أو البيانات المطلوب تعديلها"
                      className="min-w-0 flex-1 rounded-xl border border-[#ddd8e9] px-4 py-3 text-sm outline-none focus:border-[#6547d9]"
                    />
                    <PendingSubmitButton
                      idleLabel="رفض الطلب"
                      pendingLabel="جارٍ الرفض..."
                      className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700"
                    />
                  </form>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
