import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  CheckCircle2,
  FileText,
  GraduationCap,
  LineChart,
  MessageCircle,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";

const featureItems = [
  { icon: Users, title: "إدارة الطلاب", desc: "ملفات الطلاب بأكواد فريدة وبحث وفلاتر وسجل زمني كامل." },
  { icon: CalendarCheck, title: "الحضور والجداول", desc: "جداول الحصص وتسجيل حضور سريع وتقارير الغياب حسب المجموعة." },
  { icon: Wallet, title: "التحصيل والفواتير", desc: "فواتير ومدفوعات وإيصالات وتتبع المتأخرات بدقة." },
  { icon: FileText, title: "المحتوى والواجبات", desc: "كورسات ومذكرات وواجبات واختبارات لأبنائك." },
  { icon: MessageCircle, title: "التواصل", desc: "إشعارات الغياب والاستحقاق عبر واتساب." },
  { icon: LineChart, title: "التقارير", desc: "تقارير تشغيلية وإدارية تُفهم القرار." },
];

const steps = [
  { title: "سجّل حسابك", desc: "أنشئ حسابًا بالبريد وكلمة المرور وبيانات النشاط." },
  { title: "بانتظار موافقة الإدارة", desc: "تراجع المنصة طلبك وتتواصل معك على واتساب." },
  { title: "فعّل سنترك", desc: "بعد الموافقة عالمُ المساحة ويعمل فريقك عليها." },
];

type PricingPlan = {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

const pricingPlans: PricingPlan[] = [
  {
    name: "مدرس مستقل",
    price: "تجربة مجانية",
    period: "7 أيام",
    tagline: "جرّب النظام كاملًا ثم فعّل اشتراكك بموافقة الإدارة.",
    features: [
      "حتى 100 طالب",
      "مجموعات وواجبات واختبارات",
      "حضور وتحصيل",
      "الإشعارات عبر واتساب",
      "تفعيل من إدارة المنصة",
    ],
    cta: "ابدأ تجربتك",
    highlight: false,
  },
  {
    name: "سنتر تعليمي",
    price: "تجربة مجانية",
    period: "7 أيام",
    tagline: "جرّب إدارة الفروع والموظفين والتحصيل كاملةً ثم فعّل اشتراكك.",
    features: [
      "فروع وقاعات وموظفون بأدوار",
      "حضور وتحصيل لكل فرع",
      "محتوى وواجبات واختبارات",
      "تقارير تشغيلية وإدارية",
      "دعم مباشر أثناء الإطلاق",
      "تفعيل من إدارة المنصة",
    ],
    cta: "ابدأ تجربتك",
    highlight: true,
  },
];

function ProductCard({ area }: { area: "center" | "teacher" }) {
  const isCenter = area === "center";
  const points = isCenter
    ? ["فروع وقاعات وموظفون", "فريق كامل بأدوار واتصالات", "حضور وتحصيل لكل فرع", "تقارير تشغيلية وإدارية"]
    : ["مجموعات تحت اسمك", "إدارة طلابك وحضورهم", "استحقاق المدرس وتحصيله", "محتوى وواجبات خاصة بك"];
  return (
    <article className="card relative flex flex-col p-6">
      {isCenter ? (
        <span className="absolute -top-3 start-6 rounded-full bg-[#6547d9] px-3 py-1 text-xs font-bold text-white">
          الأكثر شيوعًا
        </span>
      ) : null}
      <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
        {isCenter ? <Building2 className="size-6" aria-hidden="true" /> : <GraduationCap className="size-6" aria-hidden="true" />}
      </span>
      <h3 className="mt-4 text-lg font-extrabold">{isCenter ? "سنتر تعليمي" : "مدرس مستقل"}</h3>
      <p className="mt-1 text-sm text-[#6f6a80]">
        {isCenter
          ? "للفروع والموظفين والتحصيل والإدارة الكاملة."
          : "للمدرس المستقل لإدارة مجموعاته وطلابه دون تعقيد."}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-[#6547d9]" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      <Link
        href="/login"
        className="focus-ring mt-6 rounded-xl bg-white p-3 text-center text-sm font-bold text-[#6547d9] ring-1 ring-[#e5e2ec] transition hover:bg-[#f8f7fb]"
      >
        ابدأ الآن
      </Link>
    </article>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200">
        <GraduationCap size={25} aria-hidden="true" />
      </span>
      <div>
        <b className="block text-[15px]">Smart Edu Center</b>
        <span className="text-[11px] text-[#858197]">إدارة السَنتَر والمُدرّس</span>
      </div>
    </Link>
  );
}

export function LandingPage() {
  return (
    <div dir="rtl" className="min-h-dvh bg-[#f6f5fb] text-[#17152b]">
      <header className="sticky top-0 z-30 border-b border-[#e8e5ef] bg-[#f6f5fb]/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 md:px-8">
          <Logo />
          <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-6 text-sm font-semibold text-[#5f5a70] lg:flex">
            <a href="#features" className="hover:text-[#6547d9]">المميزات</a>
            <a href="#models" className="hover:text-[#6547d9]">النماذج</a>
            <a href="#pricing" className="hover:text-[#6547d9]">الأسعار</a>
            <a href="#how" className="hover:text-[#6547d9]">كيف أبدأ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-xl border border-[#ddd8e9] px-4 py-2 text-sm font-bold text-[#5f5a70] sm:block">
              تسجيل الدخول
            </Link>
            <Link href="/login" className="rounded-xl bg-[#6547d9] px-4 py-2 text-sm font-bold text-white">
              أنشئ حسابك
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eeeaff] px-3 py-1 text-xs font-bold text-[#6547d9]">
              <Smartphone className="size-4" aria-hidden="true" />
              منصة عربية متعددة المستأجرين
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              إدارة السناتر التعليمية<br />
              <span className="text-[#6547d9]">والمدرسين المستقلين</span> في مكان واحد
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f5a70]">
              سجّل الطلاب، نَظّم المجموعات والحضور، وافهم التحصيل والمحتوى والتقارير — بسهولة على الهاتف والدسكتوب.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3 font-bold text-white">
                أنشئ حسابك مجانًا
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
              <a href="#how" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[#ddd8e9] px-6 py-3 font-bold text-[#5f5a70]">
                تعرّف على المنصة
              </a>
            </div>
          </div>
          <div className="card relative p-6" aria-hidden="true">
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-xl border border-[#eeeaf6] bg-white p-4">
                <span className="flex items-center gap-2 text-sm font-bold"><Users className="size-4 text-[#6547d9]" /> إجمالي الطلاب</span>
                <b className="text-lg">1,248</b>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#eeeaf6] bg-white p-4">
                <span className="flex items-center gap-2 text-sm font-bold"><CalendarCheck className="size-4 text-[#2fab88]" /> حضور اليوم</span>
                <b className="text-lg">892</b>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[#eeeaf6] bg-white p-4">
                <span className="flex items-center gap-2 text-sm font-bold"><Wallet className="size-4 text-[#e09d36]" /> تحصيل الشهر</span>
                <b className="text-lg">84,250 ج</b>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-[#6f6a80]">صورة توضيحية لشكل لوحة الإدارة بعد تسجيل الدخول.</p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold">كل أدوات إدارة السنتر</h2>
            <p className="mt-3 text-[#5f5a70]">مكوّنات متكاملة تبدأ من التسجيل حتى التقارير.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map(({ icon: Icon, title, desc }) => (
              <article key={title} className="card p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-extrabold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#6f6a80]">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Models */}
        <section id="models" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold">منصة واحدة، نموذجان مختلفان</h2>
              <p className="mt-3 text-[#5f5a70]">اختر نوع نشاطك وسيتكيّف النظام لتلبية حاجتك.</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <ProductCard area="center" />
              <ProductCard area="teacher" />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold">خطط وأسعار بسيطة</h2>
            <p className="mt-3 text-[#5f5a70]">ميزات متدرجة حسب حجم العمل. ابدأ بتجربة مجانية 7 أيام حتى تفعيل الاشتراك من إدارة المنصة.</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`card flex flex-col p-6 ${plan.highlight ? "border-2 border-[#6547d9]" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-[#6f6a80]">{plan.tagline}</p>
                  </div>
                  {plan.highlight ? (
                    <span className="rounded-full bg-[#6547d9] px-3 py-1 text-xs font-bold text-white">الأكثر شيوعًا</span>
                  ) : null}
                </div>
                <div className="mt-5">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-sm text-[#6f6a80]"> {plan.period}</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-[#6547d9]" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`focus-ring mt-8 rounded-xl p-3 text-center text-sm font-bold ${
                    plan.highlight ? "bg-[#6547d9] text-white" : "bg-white text-[#6547d9] ring-1 ring-[#e5e2ec]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* How to start */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold">كيف أبدأ خلال ثلاث خطوات</h2>
          </div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="card relative p-6">
                <span className="absolute -top-3 start-6 grid size-8 place-items-center rounded-full bg-[#6547d9] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-extrabold">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#6f6a80]">{step.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link href="/login" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3 font-bold text-white">
              أنشئ حسابك الآن
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e8e5ef] bg-white px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="text-xs text-[#6f6a80]">© {new Date().getFullYear()} Smart Edu Center. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}