import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  Layers,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { ProductStatusChip } from "@/components/product-status-chip";
import {
  featureStatusDescriptions,
  featureStatusLabels,
  featureStatuses,
} from "@/lib/product/feature-status";
import {
  addOns,
  catalogExamples,
  catalogPaths,
  currentStateSummary,
  customerTypes,
  hostingModes,
  painPoints,
  productLevels,
  productValueHighlights,
  roadmapGroups,
  roleCards,
  upgradeGuarantees,
  upgradePath,
  useCases,
  workflow,
  workingOn,
} from "@/lib/product/product-vision-content";

/** أرقام توضيحية للعرض البصري فقط، وليست بيانات عملاء. */
const dashboardStats: Array<{ title: string; value: string; icon: LucideIcon; color: string }> = [
  { title: "إجمالي الطلاب", value: "1,248", icon: Users, color: "#6547d9" },
  { title: "حضور اليوم", value: "892", icon: UserCheck, color: "#2fab88" },
  { title: "تحصيل الشهر", value: "84,250 ج", icon: CircleDollarSign, color: "#e09d36" },
  { title: "متأخرات", value: "12,800 ج", icon: Wallet, color: "#e96b7a" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200 sm:size-11">
        <GraduationCap size={24} />
      </span>
      <div>
        <b className="block text-sm sm:text-[15px]">سبورتي | Saboraty</b>
        <span className="hidden text-[11px] text-[#858197] sm:block">منصة تشغيل وتعليم للتعليم الخاص</span>
      </div>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  desc,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className={`text-sm font-bold ${tone === "dark" ? "text-[#bbaeff]" : "text-[#6547d9]"}`}>{eyebrow}</span>
      <h2 className={`mt-3 text-2xl font-black leading-snug sm:text-3xl md:text-4xl ${tone === "dark" ? "text-white" : ""}`}>
        {title}
      </h2>
      {desc ? (
        <p className={`mt-4 leading-8 ${tone === "dark" ? "text-[#c9c5d7]" : "text-[#6f6a80]"}`}>{desc}</p>
      ) : null}
    </div>
  );
}

function HeroVisual() {
  const bars = [58, 82, 68, 94, 73, 87, 64];
  return (
    <div className="relative min-h-[390px] w-full overflow-hidden rounded-[28px] border border-[#e7e1f6] bg-gradient-to-br from-[#eee9ff] via-white to-[#f8f6ff] shadow-[0_28px_80px_rgba(101,71,217,.14)] sm:min-h-[460px] lg:min-h-[520px] xl:min-h-[560px]">
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-[#d7ccff]/55 blur-3xl" />
      <div className="absolute -bottom-20 right-0 size-72 rounded-full bg-[#efeaff] blur-3xl" />
      <div
        role="img"
        aria-label="طالب يستخدم اللابتوب للدراسة"
        className="absolute bottom-0 left-0 h-[64%] w-[54%] bg-cover bg-center opacity-95 sm:h-[70%] sm:w-[48%]"
        style={{ backgroundImage: "url('https://images.pexels.com/photos/6084091/pexels-photo-6084091.jpeg?auto=compress&dpr=1&h=900&w=1400')" }}
      />
      <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-transparent via-white/20 to-white" />
      <div className="absolute right-3 top-4 w-[82%] rounded-[24px] border border-white bg-white/95 p-3 shadow-[0_18px_50px_rgba(37,30,70,.13)] backdrop-blur sm:right-6 sm:top-6 sm:w-[76%] sm:p-4 lg:right-8 lg:top-8 lg:w-[72%]">
        <div className="flex items-center justify-between gap-3 border-b border-[#eeeaf4] pb-3">
          <div>
            <p className="text-[11px] font-bold text-[#6547d9] sm:text-xs">لوحة الإدارة</p>
            <p className="mt-1 text-[9px] text-[#8b8597] sm:text-[10px]">ملخص التشغيل اليوم</p>
          </div>
          <span className="rounded-full bg-[#f1edff] px-2.5 py-1 text-[9px] font-bold text-[#5c47b8] sm:px-3 sm:text-[10px]">
            عرض توضيحي للواجهة
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dashboardStats.map(({ title, value, icon: Icon, color }) => (
            <div key={title} className="rounded-2xl bg-[#faf9fc] p-2 sm:p-2.5">
              <span className="grid size-6 place-items-center rounded-lg bg-white sm:size-7" style={{ color }}>
                <Icon size={13} />
              </span>
              <p className="mt-2 text-[8px] text-[#8c879a] sm:text-[9px]">{title}</p>
              <b className="mt-1 block text-[10px] sm:text-xs">{value}</b>
            </div>
          ))}
        </div>
        <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-[1.35fr_.75fr]">
          <div className="rounded-2xl border border-[#eeeaf4] p-3">
            <div className="flex items-center justify-between">
              <div>
                <b className="text-[11px]">نظرة على الحضور</b>
                <p className="text-[9px] text-[#928ca0]">آخر 7 أيام</p>
              </div>
              <span className="text-[10px] font-bold text-[#6547d9]">91%</span>
            </div>
            <div className="mt-3 flex h-20 items-end gap-1.5">
              {bars.map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-[#cfc3ff] to-[#6547d9]"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#eeeaf4] p-3">
            <b className="text-[11px]">حالة المجموعات</b>
            <div className="mt-3 space-y-2">
              {[
                { label: "نشطة", value: "18", color: "#2fab88" },
                { label: "مكتملة", value: "4", color: "#e09d36" },
                { label: "قيد التسجيل", value: "6", color: "#6547d9" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-[#6f6a80]">
                    <span className="size-1.5 rounded-full" style={{ background: row.color }} />
                    {row.label}
                  </span>
                  <b>{row.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 rounded-2xl border border-[#e5e0f1] bg-white px-3 py-2 shadow-xl sm:bottom-6 sm:right-6 sm:px-4 sm:py-3">
        <p className="text-[9px] text-[#8c879a] sm:text-[10px]">نموذجا تشغيل</p>
        <b className="text-xs text-[#6547d9] sm:text-sm">مدرس · سنتر</b>
      </div>
      <div className="absolute bottom-4 left-4 rounded-2xl border border-[#e5e0f1] bg-white px-3 py-2 shadow-xl sm:bottom-6 sm:left-6 sm:px-4 sm:py-3">
        <p className="text-[9px] text-[#8c879a] sm:text-[10px]">مستويات المنتج</p>
        <b className="text-xs text-[#6547d9] sm:text-sm">٣ مستويات</b>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div dir="rtl" className="min-h-dvh overflow-hidden bg-[#fbfaff] text-[#17152b]">
      <header className="sticky top-0 z-40 border-b border-[#ece8f4] bg-white/92 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-[#5f5a70] lg:flex">
            <a href="#why" className="hover:text-[#6547d9]">ليه سبورتي؟</a>
            <a href="#levels" className="hover:text-[#6547d9]">المستويات</a>
            <a href="#catalog" className="hover:text-[#6547d9]">الكتالوج</a>
            <a href="#platform" className="hover:text-[#6547d9]">كل القدرات</a>
            <a href="#hosting" className="hover:text-[#6547d9]">الاستضافة</a>
          </nav>
          <Link
            href="/signup"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#6547d9] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-purple-200 focus-ring"
          >
            اطلب مساحة
            <ArrowLeft size={15} />
          </Link>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative w-full overflow-hidden bg-[radial-gradient(circle_at_10%_20%,rgba(207,197,255,.35),transparent_28%),radial-gradient(circle_at_88%_22%,rgba(238,233,255,.7),transparent_32%),linear-gradient(180deg,#fbfaff_0%,#f8f5ff_100%)]">
          <div className="grid w-full items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
            <div className="order-1 max-w-[760px] justify-self-stretch lg:order-none lg:justify-self-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#dcd5f3] bg-white px-3 py-1.5 text-[11px] font-bold text-[#6547d9] shadow-sm sm:text-xs">
                <Sparkles size={14} />
                نموذجان للتشغيل · ثلاثة مستويات للمنتج · منصة واحدة
              </span>
              <h1 className="mt-5 max-w-[760px] text-[32px] font-black leading-[1.2] tracking-tight sm:text-[42px] lg:text-[48px] xl:text-[56px]">
                سنتر تعليمي أو مدرس مستقل،
                <br className="hidden sm:block" />
                <span className="text-[#6547d9]"> وتكبر في مستويات بدون ما تغيّر نظامك.</span>
              </h1>
              <p className="mt-5 max-w-[700px] text-[15px] leading-8 text-[#5f5a70] sm:text-base lg:text-[17px]">
                نوع النشاط يحدد شكل الكتالوج والتنقل، ومستوى المنتج يحدد ما هو متاح. تبدأ من التشغيل الأساسي، ثم تضيف
                البوابات والمحتوى والاختبارات، ثم الكورسات الرقمية والهوية الكاملة — على نفس المساحة ونفس البيانات.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3.5 font-bold text-white shadow-lg shadow-purple-200 focus-ring"
                >
                  اطلب مساحة تجريبية
                  <ArrowLeft size={17} />
                </Link>
                <a
                  href="#levels"
                  className="rounded-xl border border-[#ddd8e9] bg-white px-6 py-3.5 text-center font-bold text-[#5f5a70] shadow-sm hover:border-[#6547d9] hover:text-[#6547d9] focus-ring"
                >
                  شوف المستويات الثلاثة
                </a>
              </div>
              <p className="mt-4 text-[12px] leading-6 text-[#7d7890] sm:text-[13px]">
                طلب المساحة يمر بمراجعة من إدارة المنصة قبل التفعيل، وليس حسابًا فوريًا.
              </p>
            </div>
            <div className="order-2 w-full lg:order-none">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* الحالة الحقيقية الآن */}
        <section className="border-y border-[#ebe7f2] bg-white py-8">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-md">
                <h2 className="text-lg font-extrabold sm:text-xl">إحنا دلوقتي فين بالظبط؟</h2>
                <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
                  الصدق أهم من الشكل: دي حالة المنصة في النسخة المنشورة حاليًا، وكل بند في الصفحة موضح بحالته.
                </p>
              </div>
              <ul className="grid flex-1 gap-2.5 sm:grid-cols-2">
                {currentStateSummary.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-[#ece8f4] bg-[#fbfaff] px-4 py-3"
                  >
                    <span className="text-sm leading-6 text-[#4f4a60]">{item.label}</span>
                    <ProductStatusChip status={item.status} compact />
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 rounded-2xl border border-[#e6e1f2] bg-[#f7f5ff] p-4 sm:p-5">
              <p className="text-sm font-bold text-[#4f4a60]">وشغالين حاليًا على:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {workingOn.map((item) => (
                  <span key={item} className="rounded-full border border-[#ded5fb] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#5c47b8]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section id="why" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <span className="text-sm font-bold text-[#6547d9]">مش مجرد برنامج سنتر</span>
              <h2 className="mt-3 text-2xl font-black leading-snug sm:text-3xl md:text-4xl">
                بدل ما تدير الشغل بين أدوات منفصلة، خليه مسار واحد
              </h2>
              <p className="mt-5 leading-8 text-[#6f6a80]">
                الهدف مش إننا نحط مزايا كتير في شاشة واحدة. الهدف إن رحلة الطالب والتشغيل والتعليم والتحصيل تبقى مترابطة،
                عشان المعلومة تدخل مرة وتفضل مفيدة في كل خطوة بعدها.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {painPoints.map((item) => (
                <div key={item} className="rounded-2xl border border-[#e8e3f0] bg-white p-5">
                  <div className="flex gap-3">
                    <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[#f1edff] text-[#6547d9]">×</span>
                    <p className="font-bold leading-7 text-[#5f5a70]">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* البُعدان */}
        <section id="dimensions" className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <SectionHeading
              eyebrow="أول حاجة نفهمها"
              title="بُعدان منفصلان تمامًا"
              desc="نوع النشاط ومعنى مستوى المنتج حاجتان مختلفتان خالص. مدرس مستقل يقدر يشتري مستوى التعلم الكامل، وسنتر يقدر يفضل على مستوى العمليات فقط. مفيش خلط بينهم."
            />
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-[#e8e3f0] bg-[#fbfaff] p-6 sm:p-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eeeaff] px-3 py-1 text-[11px] font-bold text-[#6547d9]">
                  البُعد الأول
                </span>
                <h3 className="mt-4 text-xl font-extrabold">نوع النشاط</h3>
                <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
                  يحدد شكل الكتالوج والتنقل والتنظيم. لا يمنح ولا يمنع أي ميزة.
                </p>
                <div className="mt-5 space-y-3">
                  {customerTypes.map(({ key, nameAr, desc, catalogShape, icon: Icon, examples }) => (
                    <article key={key} className="rounded-2xl border border-[#eeeaf6] bg-white p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1edff] text-[#6547d9]">
                          <Icon size={19} />
                        </span>
                        <b className="text-base">{nameAr}</b>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#6f6a80]">{desc}</p>
                      <p className="mt-2 text-[13px] font-semibold text-[#5c47b8]">{catalogShape}</p>
                      <ul className="mt-3 space-y-1.5">
                        {examples.map((example) => (
                          <li key={example} className="text-[13px] text-[#6f6a80]">
                            · {example}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-[#e8e3f0] bg-[#fbfaff] p-6 sm:p-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eeeaff] px-3 py-1 text-[11px] font-bold text-[#6547d9]">
                  البُعد الثاني
                </span>
                <h3 className="mt-4 text-xl font-extrabold">مستوى المنتج</h3>
                <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
                  يحدد ما هو مشتراة ومتاح. لا يغيّر شكل الكتالوج، ويمكن شراؤه لأي نوع نشاط.
                </p>
                <div className="mt-5 space-y-3">
                  {productLevels.map((level) => (
                    <article key={level.key} className="rounded-2xl border border-[#eeeaf6] bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <b className="text-base">{level.nameAr}</b>
                          <span className="ms-2 text-[11px] font-semibold text-[#8c879a]">{level.nameEn}</span>
                        </div>
                        <ProductStatusChip status={level.status} compact />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[#6f6a80]">{level.tagline}</p>
                    </article>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-dashed border-[#d8d0f0] bg-white p-4">
                  <b className="text-sm">إضافات مستقلة تُشترى منفصلة</b>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {addOns.map((item) => (
                      <span key={item} className="rounded-full bg-[#f6f4ff] px-2.5 py-1 text-[11px] font-semibold text-[#5c47b8]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* المستويات */}
        <section id="levels" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
          <SectionHeading
            eyebrow="تسعير على ثلاثة محاور"
            title="المستويات الثلاثة ومحتوى كل مستوى"
            desc="كل مستوى يشمل ما قبله. والقرار التجاري مبني على ثلاثة محاور: مستوى المنتج، وحجم العميل، والإضافات المستقلة."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {productLevels.map((level, index) => (
              <article
                key={level.key}
                className={`flex flex-col rounded-3xl border p-6 sm:p-7 ${
                  index === 2 ? "border-[#7660db] bg-[#6547d9] text-white" : "border-[#e7e2ef] bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-sm font-black ${index === 2 ? "text-[#ddd6ff]" : "text-[#6547d9]"}`}>
                    0{index + 1}
                  </span>
                  <ProductStatusChip status={level.status} tone={index === 2 ? "dark" : "light"} compact />
                </div>
                <h3 className="mt-4 text-xl font-extrabold">{level.nameAr}</h3>
                <span className={`mt-1 text-[11px] font-bold ${index === 2 ? "text-[#ddd6ff]" : "text-[#8c879a]"}`}>
                  {level.nameEn}
                </span>
                <p className={`mt-3 text-sm leading-7 ${index === 2 ? "text-[#ebe7ff]" : "text-[#6f6a80]"}`}>
                  {level.tagline}
                </p>
                <div className={`mt-4 rounded-xl px-3 py-2 text-[12px] font-semibold ${index === 2 ? "bg-white/10 text-[#ddd6ff]" : "bg-[#f6f4ff] text-[#5c47b8]"}`}>
                  مرحلة التنفيذ: {level.stage}
                </div>
                <div className="mt-5">
                  <p className={`text-[13px] font-bold ${index === 2 ? "text-[#ddd6ff]" : "text-[#5f5a70]"}`}>يتضمن</p>
                  <ul className="mt-2 space-y-1.5">
                    {level.includes.map((item) => (
                      <li key={item} className={`flex gap-2 text-[13px] leading-6 ${index === 2 ? "text-[#ebe7ff]" : "text-[#6f6a80]"}`}>
                        <CheckCircle2 size={15} className={`mt-1 shrink-0 ${index === 2 ? "text-[#8bd7bd]" : "text-[#2fab88]"}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5">
                  <p className={`text-[13px] font-bold ${index === 2 ? "text-[#ddd6ff]" : "text-[#5f5a70]"}`}>يضيف</p>
                  <ul className="mt-2 space-y-2">
                    {level.adds.map((item) => (
                      <li key={item.label} className="flex items-start justify-between gap-2">
                        <span className={`text-[13px] leading-6 ${index === 2 ? "text-[#ebe7ff]" : "text-[#6f6a80]"}`}>
                          {item.label}
                        </span>
                        <ProductStatusChip status={item.status} tone={index === 2 ? "dark" : "light"} compact />
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* الكتالوج */}
        <section id="catalog" className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <SectionHeading
              eyebrow="المفهوم اللي بيحل أكبر مشكلة"
              title="المادة والمدرس والمقرر والعرض — أربع حاجات منفصلة"
              desc="مافيش ربط إجباري بين مادة ومدرس واحد. المادة الواحدة ممكن يدرّسها أكثر من مدرس، والمدرس الواحد له أكثر من مقرر، والوحدة القابلة للبيع والتسجيل هي «العرض» بالسعر والسعة والقاعة."
            />
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {catalogExamples.map((example, index) => (
                <article
                  key={example.key}
                  className={`rounded-3xl border p-6 sm:p-7 ${
                    index === 1 ? "border-[#7660db] bg-[#17152b] text-white" : "border-[#e7e2ef] bg-[#fbfaff]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-extrabold">{example.title}</h3>
                    {index === 1 ? <Building2 className="text-[#bbaeff]" size={20} /> : <GraduationCap className="text-[#6547d9]" size={20} />}
                  </div>
                  <p className={`mt-2 text-sm leading-7 ${index === 1 ? "text-[#c9c5d7]" : "text-[#6f6a80]"}`}>{example.note}</p>
                  <pre
                    dir="ltr"
                    className={`mt-4 overflow-x-auto rounded-2xl p-4 text-[13px] leading-7 ${
                      index === 1 ? "bg-white/5 text-[#dedbe8]" : "bg-white text-[#4f4a60] border border-[#eeeaf6]"
                    }`}
                  >
                    {example.tree.join("\n")}
                  </pre>
                </article>
              ))}
            </div>

            <div className="mt-10">
              <h3 className="text-center text-lg font-extrabold">مسارات التنقل والفلترة في الكتالوج</h3>
              <p className="mx-auto mt-2 max-w-3xl text-center text-sm leading-7 text-[#6f6a80]">
                المستخدمون يفكرون بطرق مختلفة، فالنظام لازم يدعم أكثر من مسار — لا مسارًا واحدًا مفروضًا.
              </p>
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {catalogPaths.map((path) => (
                  <article key={path.label} className="rounded-3xl border border-[#e7e2ef] bg-[#fbfaff] p-5">
                    <b className="text-[15px] leading-7 text-[#3f3a52]">{path.label}</b>
                    <p className="mt-1 text-[12px] font-semibold text-[#6547d9]">{path.audience}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      {path.steps.map((step, index) => (
                        <span key={`${step.label}-${index}`} className="flex items-center gap-1.5">
                          <span className="rounded-lg border border-[#e6e1f2] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#4f4a60]">
                            {step.label}
                          </span>
                          {index < path.steps.length - 1 ? <span className="text-[#b3aecd]">←</span> : null}
                        </span>
                      ))}
                    </div>
                    <ul className="mt-3 space-y-1">
                      {path.steps.map((step, index) => (
                        <li key={`${step.hint}-${index}`} className="text-[12px] text-[#8c879a]">
                          <b className="text-[#6f6a80]">{step.label}:</b> {step.hint}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
              <p className="mx-auto mt-5 max-w-3xl rounded-2xl border border-[#e6e1f2] bg-[#f7f5ff] px-4 py-3 text-center text-[13px] leading-7 text-[#5c47b8]">
                «الكتالوج العام» يعني كتالوج المساحة نفسها بكل فروعها ومدرسيها — وليس سوقًا بين عملاء مختلفين.
              </p>
            </div>
          </div>
        </section>

        {/* ما يهم كل يوم */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
          <SectionHeading
            eyebrow="أثر مباشر على يومك"
            title="شغّل، تابع، علّم، وحاسب من نفس المكان"
            desc="كل قدرة أدناه موضح مستوى المنتج الذي تنتمي إليه وحالتها الحقيقية."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {useCases.map(({ icon: Icon, title, desc, status, level }) => (
              <article key={title} className="rounded-3xl border border-[#e8e3f0] bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
                    <Icon size={22} />
                  </span>
                  <ProductStatusChip status={status} compact />
                </div>
                <h3 className="mt-5 text-lg font-extrabold">{title}</h3>
                <p className="mt-2 leading-7 text-[#706b80]">{desc}</p>
                <p className="mt-4 text-[12px] font-bold text-[#6547d9]">{level}</p>
              </article>
            ))}
          </div>
        </section>

        {/* المسار */}
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <SectionHeading
              eyebrow="مسار واحد مترابط"
              title="من بناء الكتالوج لحد القرار"
              desc="ست خطوات مترابطة؛ كل خطوة تعتمد على البيانات التي أدخلتها في التي قبلها."
            />
            <div className="mt-11 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workflow.map((item) => (
                <article key={item.step} className="rounded-3xl border border-[#e7e2ef] bg-[#fbfaff] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-[#6547d9]">{item.step}</span>
                    <ProductStatusChip status={item.status} compact />
                  </div>
                  <h3 className="mt-3 text-lg font-extrabold">{item.title}</h3>
                  <p className="mt-2 leading-7 text-[#777183]">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* كل القدرات */}
        <section id="platform" className="bg-[#17152b] py-16 text-white md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <SectionHeading
              tone="dark"
              eyebrow="الرؤية الكاملة للمنتج"
              title="كل قدرة في المنصة، وحالتها الحقيقية"
              desc="الرؤية معروضة كاملة، والدقة في الحالة. كل بند مُوسَّم: متاح الآن، أو قريبًا في مرحلة تنفيذ، أو مخطط له."
            />
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {roadmapGroups.map(({ key, title, desc, icon: Icon, items }) => (
                <article key={key} className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#6547d9]/30 text-[#d6cdff]">
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3 className="text-xl font-extrabold">{title}</h3>
                      <p className="mt-2 leading-7 text-[#c9c5d7]">{desc}</p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {items.map((item) => (
                      <li key={item.label} className="flex items-start justify-between gap-3">
                        <span className="flex gap-2.5 text-sm leading-6 text-[#dedbe8]">
                          <CheckCircle2 size={16} className="mt-1 shrink-0 text-[#8bd7bd]" />
                          <span>{item.label}</span>
                        </span>
                        <ProductStatusChip status={item.status} tone="dark" compact />
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* الاستضافة */}
        <section id="hosting" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
          <SectionHeading
            eyebrow="استضافة وهوية"
            title="نفس المنصة دائمًا — سواء باسمنا أو باسمك"
            desc="لا يوجد نظام منفصل لكل عميل. كل العملاء على نفس التطبيق ونفس البنية، والفرق في الإعدادات والهوية والدومين. وبيانات كل مساحة معزولة تمامًا."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {hostingModes.map(({ key, nameAr, hostname, desc, status, icon: Icon }) => (
              <article key={key} className="rounded-3xl border border-[#e7e2ef] bg-white p-6 sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
                    <Icon size={22} />
                  </span>
                  <ProductStatusChip status={status} compact />
                </div>
                <h3 className="mt-5 text-xl font-extrabold">{nameAr}</h3>
                <p className="mt-3 leading-7 text-[#6f6a80]">{desc}</p>
                <p dir="ltr" className="mt-4 rounded-xl border border-[#e6e1f2] bg-[#fbfaff] px-3 py-2 text-left font-mono text-[12px] text-[#5c47b8]">
                  {hostname}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Layers, title: "نظام واحد", desc: "كل التحسينات تصل لكل العملاء فورًا." },
              { icon: Boxes, title: "بلا نسخة منفصلة", desc: "لا تفرّع للكود ولا نشر مستقل لكل عميل." },
              { icon: ShieldCheck, title: "عزل كامل", desc: "بيانات كل مساحة لا تظهر لغيرها." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-[#e8e3f0] bg-[#fbfaff] p-5">
                <Icon size={20} className="text-[#6547d9]" />
                <b className="mt-3 block text-sm">{title}</b>
                <p className="mt-1 text-[13px] leading-6 text-[#6f6a80]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* الترقية */}
        <section id="upgrade" className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <SectionHeading
              eyebrow="أهم ضمان في المنصة"
              title="ترقّي بدون ما تفقد أي بيانات"
              desc="لأن المستوى مجرد صلاحيات على نفس المساحة، فإن الصعود من مستوى لمستوى لا يكلّفك شيئًا غير التوسّع."
            />
            <div className="mt-11 rounded-3xl border border-[#e7e2ef] bg-[#fbfaff] p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {upgradePath.map((item, index) => (
                  <span key={item.step} className="flex items-center gap-3">
                    <span className="flex items-center gap-2 rounded-2xl border border-[#e6e1f2] bg-white px-4 py-3">
                      <b className="text-[13px] text-[#3f3a52]">{item.step}</b>
                      <ProductStatusChip status={item.status} compact />
                    </span>
                    {index < upgradePath.length - 1 ? <ArrowUpRight className="text-[#6547d9]" size={18} /> : null}
                  </span>
                ))}
              </div>
              <ul className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
                {upgradeGuarantees.map((item) => (
                  <li key={item} className="flex gap-2.5 rounded-2xl border border-[#eeeaf6] bg-white px-4 py-3 text-sm leading-6 text-[#4f4a60]">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#2fab88]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* الأدوار */}
        <section id="roles" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <span className="text-sm font-bold text-[#6547d9]">كل شخص يرى ما يخصه</span>
              <h2 className="mt-3 text-2xl font-black leading-snug sm:text-3xl md:text-4xl">تجربة مختلفة لكل دور</h2>
              <p className="mt-4 leading-8 text-[#6f6a80]">
                المنصة ليست لوحة واحدة للجميع. كل دور له عمله وصلاحياته وحدود نطاقه. ومن يملك أكثر من علاقة يبدّل السياق
                بدون حساب جديد — بشرط أن تكون المساحة مشتركة في الميزة أصلًا.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {roleCards.map((item, index) => (
                <article key={item.title} className="rounded-3xl border border-[#e7e2ef] bg-[#fbfaff] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-[#6547d9]">0{index + 1}</span>
                    <ProductStatusChip status={item.status} compact />
                  </div>
                  <h3 className="mt-3 font-extrabold">{item.title}</h3>
                  <p className="mt-2 leading-7 text-[#777183]">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* القيمة */}
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8 md:pb-20">
          <div className="overflow-hidden rounded-[36px] bg-gradient-to-l from-[#6547d9] to-[#46309f] p-8 text-white md:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_.9fr]">
              <div>
                <span className="text-sm font-bold text-[#d9d1ff]">القيمة الأساسية</span>
                <h2 className="mt-3 text-2xl font-black leading-snug sm:text-3xl md:text-4xl">
                  مش عشرة أنظمة جنب بعض — منظومة واحدة تفهم رحلة الطالب
                </h2>
                <p className="mt-4 max-w-2xl leading-8 text-[#e3defa]">
                  الطالب يُسجَّل مرة، وبعدها نفس بياناته تخدم الكتالوج والجدول والحضور والتحصيل والمحتوى والاختبارات
                  والتواصل والتقارير، وتكبر معاك مستوى بعد مستوى بدون إعادة بناء.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {productValueHighlights.map(({ icon: Icon, label, status }) => (
                  <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <Icon size={20} />
                    <b className="mt-3 block text-sm">{label}</b>
                    <span className="mt-2 block">
                      <ProductStatusChip status={status} tone="dark" compact />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* مفتاح الحالات */}
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <div className="rounded-3xl border border-[#e7e2ef] bg-white p-6 sm:p-7">
            <h2 className="text-lg font-extrabold">مفتاح الحالات المستخدم في الصفحة</h2>
            <p className="mt-2 text-sm leading-7 text-[#6f6a80]">
              الرؤية معروضة كاملة، لكن ما هو متاح فعليًا مُوسَّم بصراحة في كل بند. لا نعرض ميزة قيد البناء أو مخططة كأنها جاهزة.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {featureStatuses.map((status) => (
                <div key={status} className="rounded-2xl border border-[#eeeaf6] bg-[#fbfaff] p-4">
                  <div className="flex items-center gap-2">
                    <ProductStatusChip status={status} />
                    <b className="text-sm">{featureStatusLabels[status]}</b>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-[#6f6a80]">{featureStatusDescriptions[status]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 md:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-black leading-snug sm:text-3xl md:text-4xl">
              منصة واحدة من أول طالب لحد إدارة البيزنس كله
            </h2>
            <p className="mt-4 leading-8 text-[#6f6a80]">
              لو بتدير سنتر أو بتبني شغلك كمدرس مستقل، ابدأ من المستوى اللي يناسبك دلوقتي واكبر بعدها وقت ما تحتاج.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-7 py-3.5 font-bold text-white shadow-lg shadow-purple-200 focus-ring"
              >
                اطلب مساحة تجريبية
                <ArrowLeft size={17} />
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-[#ddd8e9] bg-white px-7 py-3.5 font-bold text-[#5f5a70] hover:border-[#6547d9] hover:text-[#6547d9] focus-ring"
              >
                عندي حساب بالفعل
              </Link>
            </div>
            <p className="mt-4 text-[12px] text-[#858197]">
              للسنتر التعليمي والمدرس المستقل · عربي بالكامل · يعمل على الموبايل والديسكتوب
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e8e3ef] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 text-sm text-[#777183] md:flex-row md:px-8">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
            <a href="#levels" className="hover:text-[#6547d9]">المستويات</a>
            <a href="#catalog" className="hover:text-[#6547d9]">الكتالوج</a>
            <a href="#hosting" className="hover:text-[#6547d9]">الاستضافة</a>
          </div>
          <p>© {new Date().getFullYear()} سبورتي | Saboraty — جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
