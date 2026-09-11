import Link from "next/link";
import { ArrowLeft, BookOpen, Layers } from "lucide-react";

import { portalUpgradeCopy } from "@/lib/entitlements/portal-access";

/**
 * حالة «لا يوجد اشتراك» — حالة منتج مقصودة، لا صفحة خطأ.
 *
 * تشرح ما تحفظه المساحة بالفعل، وما ينقص لفتح البوابة، وكيف تتم الترقية.
 * المرجع: docs/PRODUCT_VISION.md §6 و AGENTS.md (UI rules).
 */
export function PortalNotEntitled({
  portal,
  audienceName,
  audienceIdentifier,
}: {
  portal: "student" | "guardian";
  audienceName: string;
  audienceIdentifier?: string;
}) {
  const copy = portalUpgradeCopy[portal];

  return (
    <main dir="rtl" className="min-h-dvh bg-[#f6f5fb] text-[#17152b]">
      <div className="mx-auto grid min-h-dvh max-w-3xl place-items-center px-4 py-12">
        <section className="w-full rounded-3xl border border-[#e8e5ef] bg-white p-7 shadow-sm md:p-10">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
            <Layers size={22} aria-hidden="true" />
          </span>

          <h1 className="mt-5 text-2xl font-extrabold leading-snug">{copy.title}</h1>

          <p className="mt-4 leading-8 text-[#6f6a80]">{copy.explanation}</p>

          <dl className="mt-6 grid gap-3 rounded-2xl bg-[#f8f7fb] p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#777386]">الحساب</dt>
              <dd className="mt-1 font-bold">{audienceName}</dd>
            </div>
            {audienceIdentifier ? (
              <div>
                <dt className="text-xs text-[#777386]">المعرّف</dt>
                <dd className="mt-1 font-bold" dir="ltr">
                  {audienceIdentifier}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 rounded-2xl border border-dashed border-[#cfc7f5] p-4">
            <b className="flex items-center gap-2 text-sm">
              <BookOpen size={16} className="text-[#6547d9]" aria-hidden="true" />
              ما الذي يضيفه المستوى الأعلى؟
            </b>
            <p className="mt-2 text-sm leading-7 text-[#6f6a80]">{copy.requirement}</p>
          </div>

          <p className="mt-6 text-sm leading-7 text-[#777386]">
            بياناتك محفوظة كما هي ولا تُحذف. الترقية تحدث على نفس المساحة ونفس البيانات، بدون إنشاء حساب جديد أو نقل
            بيانات. تواصل مع إدارة المساحة لتفعيل المستوى.
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3 font-bold text-white focus-ring"
          >
            العودة للرئيسية
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}
