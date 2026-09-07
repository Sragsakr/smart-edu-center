import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Globe2,
  GraduationCap,
  LineChart,
  MessageCircle,
  Palette,
  Smartphone,
  TicketCheck,
  Users,
  Wallet,
} from "lucide-react";

const managementFeatures = [
  { icon: Users, title: "إدارة طلاب السنتر", desc: "ملفات الطلاب، البحث والفلاتر، بيانات التواصل والسجل التشغيلي." },
  { icon: CalendarCheck, title: "المجموعات والحضور", desc: "تنظيم المجموعات والجداول وتسجيل الحضور والغياب بسهولة." },
  { icon: Wallet, title: "التحصيل والفواتير", desc: "مدفوعات وإيصالات ومتابعة المتأخرات والاستحقاقات بدقة." },
  { icon: Building2, title: "الفروع والتشغيل", desc: "إدارة الفروع والقاعات والموظفين والصلاحيات للسناتر التعليمية." },
  { icon: MessageCircle, title: "التواصل", desc: "إشعارات تشغيلية للطلاب وأولياء الأمور عبر قنوات التواصل." },
  { icon: LineChart, title: "التقارير", desc: "مؤشرات وتقارير تساعدك على فهم التشغيل واتخاذ القرار." },
];

const steps = [
  { title: "سجّل حسابك", desc: "أنشئ حسابًا وحدد هل تعمل كمدرس مستقل أم سنتر تعليمي." },
  { title: "جهّز مساحة الإدارة", desc: "أضف الفروع أو المجموعات والطلاب وفريق العمل حسب نموذج نشاطك." },
  { title: "وسّع عند الحاجة", desc: "عند توفر منصة الكورسات يمكنك إضافتها كاشتراك مستقل دون تغيير نظام الإدارة." },
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

const managementPlans: PricingPlan[] = [
  {
    name: "إدارة مدرس مستقل",
    price: "تجربة مجانية",
    period: "7 أيام",
    tagline: "كل ما تحتاجه لتنظيم مجموعاتك وطلابك وتشغيلك اليومي.",
    features: [
      "إدارة الطلاب والمجموعات",
      "الجداول والحضور والغياب",
      "التحصيل والمتأخرات",
      "التواصل والتقارير",
      "اشتراك إدارة مستقل عن منصة الكورسات",
    ],
    cta: "ابدأ تجربتك",
    highlight: false,
  },
  {
    name: "إدارة سنتر تعليمي",
    price: "تجربة مجانية",
    period: "7 أيام",
    tagline: "تشغيل متكامل للفروع والموظفين والطلاب والتحصيل.",
    features: [
      "فروع وقاعات وموظفون بأدوار",
      "طلاب ومجموعات لكل فرع",
      "حضور وتحصيل وتشغيل يومي",
      "تقارير إدارية وتشغيلية",
      "إمكانية إضافة منصة الكورسات لاحقًا",
    ],
    cta: "ابدأ تجربتك",
    highlight: true,
  },
];

function ManagementModelCard({ area }: { area: "center" | "teacher" }) {
  const isCenter = area === "center";
  const points = isCenter
    ? ["فروع وقاعات وموظفون", "صلاحيات وفريق عمل", "حضور وتحصيل لكل فرع", "تقارير تشغيلية وإدارية"]
    : ["مجموعات تحت اسمك", "إدارة طلابك وحضورهم", "تحصيل واستحقاقات", "تشغيل بسيط دون تعقيد السناتر"];

  return (
    <article className="card relative flex flex-col p-6">
      {isCenter ? (
        <span className="absolute -top-3 start-6 rounded-full bg-[#6547d9] px-3 py-1 text-xs font-bold text-white">
          مناسب للفرق والفروع
        </span>
      ) : null}
      <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
        {isCenter ? <Building2 className="size-6" aria-hidden="true" /> : <GraduationCap className="size-6" aria-hidden="true" />}
      </span>
      <h3 className="mt-4 text-lg font-extrabold">{isCenter ? "سنتر تعليمي" : "مدرس مستقل"}</h3>
      <p className="mt-1 text-sm text-[#6f6a80]">
        {isCenter
          ? "نظام إدارة مصمم لتشغيل السنتر من الفروع حتى التحصيل والتقارير."
          : "مساحة أبسط للمدرس الذي يدير مجموعاته وطلابه بنفسه."}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-[#6547d9]" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
      <Link href="/login" className="focus-ring mt-6 rounded-xl bg-white p-3 text-center text-sm font-bold text-[#6547d9] ring-1 ring-[#e5e2ec] transition hover:bg-[#f8f7fb]">
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
        <span className="text-[11px] text-[#858197]">إدارة تعليمية اليوم، ومنصة تعلم عند التوسع</span>
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
            <a href="#products" className="hover:text-[#6547d9]">المنتجات</a>
            <a href="#management" className="hover:text-[#6547d9]">الإدارة</a>
            <a href="#students" className="hover:text-[#6547d9]">أنواع الطلاب</a>
            <a href="#academy" className="hover:text-[#6547d9]">منصة الكورسات</a>
            <a href="#pricing" className="hover:text-[#6547d9]">الاشتراكات</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-xl border border-[#ddd8e9] px-4 py-2 text-sm font-bold text-[#5f5a70] sm:block">تسجيل الدخول</Link>
            <Link href="/login" className="rounded-xl bg-[#6547d9] px-4 py-2 text-sm font-bold text-white">أنشئ حسابك</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eeeaff] px-3 py-1 text-xs font-bold text-[#6547d9]">
              <Smartphone className="size-4" aria-hidden="true" />
              للمدرس المستقل والسنتر التعليمي
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              أدِر تعليمك اليوم.<br />
              <span className="text-[#6547d9]">وابنِ منصتك التعليمية</span> عندما تتوسع.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f5a70]">
              نظام إدارة لتشغيل المدرس أو السنتر، ومعه مسار مستقل لمنصة الكورسات الأونلاين. كل منتج له طلابه واشتراكه، ويمكن ربطهما عندما تحتاج.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3 font-bold text-white">
                ابدأ بنظام الإدارة
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
              <a href="#products" className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[#ddd8e9] px-6 py-3 font-bold text-[#5f5a70]">شاهد طريقة عمل المنتج</a>
            </div>
          </div>

          <div className="card relative overflow-hidden p-6" aria-hidden="true">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#6547d9]">لوحة الإدارة</p>
                <p className="mt-1 text-sm text-[#6f6a80]">طلاب السنتر والتشغيل اليومي</p>
              </div>
              <span className="rounded-full bg-[#e8f7f2] px-3 py-1 text-xs font-bold text-[#20866a]">متاح الآن</span>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-xl border border-[#eeeaf6] bg-white p-4">
                <span className="flex items-center gap-2 text-sm font-bold"><Users className="size-4 text-[#6547d9]" /> طلاب السنتر</span>
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
            <div className="mt-5 rounded-2xl border border-dashed border-[#cfc7ee] bg-[#f3f0ff] p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-[#6547d9]"><BookOpen className="size-5" /></span>
                <div>
                  <p className="text-sm font-extrabold">منصة الكورسات Online</p>
                  <p className="text-xs text-[#6f6a80]">اشتراك مستقل — مرحلة قادمة</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold">منتجان واضحان، وليس باقة واحدة مجبرة</h2>
              <p className="mt-3 text-[#5f5a70]">اشترك في الإدارة فقط، منصة الكورسات فقط عندما تتاح، أو اربط الاثنين معًا.</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <article className="card border-2 border-[#6547d9] p-7">
                <div className="flex items-center justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]"><Building2 className="size-6" /></span>
                  <span className="rounded-full bg-[#e8f7f2] px-3 py-1 text-xs font-bold text-[#20866a]">متاح الآن</span>
                </div>
                <h3 className="mt-5 text-xl font-extrabold">Management SaaS</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f6a80]">إدارة السنتر أو المدرس: الطلاب، المجموعات، الفروع، الحضور، التحصيل، الموظفون والتقارير.</p>
                <p className="mt-5 rounded-xl bg-[#f8f7fb] p-3 text-sm font-bold">طالب هذا المنتج = طالب سنتر / طالب حضوري.</p>
              </article>

              <article className="card p-7">
                <div className="flex items-center justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]"><BookOpen className="size-6" /></span>
                  <span className="rounded-full bg-[#fff4df] px-3 py-1 text-xs font-bold text-[#9a6819]">قريبًا</span>
                </div>
                <h3 className="mt-5 text-xl font-extrabold">Learning Platform / LMS</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f6a80]">منتج مستقل للكورسات، الفيديوهات، الملفات، الاختبارات، أكواد التفعيل وتتبع تقدم الطالب.</p>
                <p className="mt-5 rounded-xl bg-[#f8f7fb] p-3 text-sm font-bold">طالب هذا المنتج = طالب Online، حتى لو لم يزر السنتر من قبل.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="management" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold">كل أدوات الإدارة في مكان واحد</h2>
            <p className="mt-3 text-[#5f5a70]">المنتج الحالي مخصص للتشغيل والإدارة، وليس منصة كورسات متخفية داخل نفس الاشتراك.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {managementFeatures.map(({ icon: Icon, title, desc }) => (
              <article key={title} className="card p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]"><Icon className="size-5" aria-hidden="true" /></span>
                <h3 className="mt-4 font-extrabold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#6f6a80]">{desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <ManagementModelCard area="center" />
            <ManagementModelCard area="teacher" />
          </div>
        </section>

        <section id="students" className="bg-[#17152b] py-16 text-white">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="max-w-3xl">
              <span className="text-sm font-bold text-[#b9aaff]">فصل واضح من البداية</span>
              <h2 className="mt-3 text-3xl font-extrabold">طالب السنتر ليس هو طالب الأونلاين</h2>
              <p className="mt-4 leading-7 text-[#c9c5d8]">قد يكون الشخص نفسه في الحالتين، لكن علاقته بكل منتج مختلفة. لذلك لا نخلط الحضور والتحصيل الحضوري بصلاحيات الكورسات الرقمية.</p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <GraduationCap className="size-7 text-[#b9aaff]" />
                <h3 className="mt-4 text-xl font-extrabold">طالب سنتر</h3>
                <p className="mt-2 text-sm leading-6 text-[#c9c5d8]">مرتبط بفرع أو مجموعة وجدول وحضور واشتراك أو تحصيل داخل السنتر.</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <Globe2 className="size-7 text-[#b9aaff]" />
                <h3 className="mt-4 text-xl font-extrabold">طالب Online</h3>
                <p className="mt-2 text-sm leading-6 text-[#c9c5d8]">مرتبط بكورس وصلاحية وصول وكود تفعيل وتقدم واختبارات، وقد لا يكون طالب سنتر أصلًا.</p>
              </article>
            </div>
            <p className="mt-6 text-sm font-bold text-[#b9aaff]">ولو كان الشخص الاثنين؟ حساب واحد، وعلاقتان منفصلتان.</p>
          </div>
        </section>

        <section id="academy" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="rounded-full bg-[#fff4df] px-3 py-1 text-xs font-bold text-[#9a6819]">مرحلة قادمة — اشتراك مستقل</span>
            <h2 className="mt-5 text-3xl font-extrabold">منصة الكورسات بطريقتين</h2>
            <p className="mt-3 text-[#5f5a70]">نفس محرك الـLMS، لكن تختار كيف يظهر للطلاب.</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="card p-7">
              <Globe2 className="size-7 text-[#6547d9]" />
              <h3 className="mt-4 text-xl font-extrabold">Shared Academy</h3>
              <p className="mt-2 text-sm leading-6 text-[#6f6a80]">الطالب ينشئ حسابًا على الدومين الأساسي للمنصة ثم يدخل كود التفعيل أو يصل للكورس الذي اشتراه.</p>
              <ul className="mt-5 space-y-2 text-sm">
                {["دومين المنصة الأساسي", "تكلفة أقل", "إدارة الكورسات والأكواد", "نفس حساب الطالب"].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#6547d9]" />{item}</li>)}
              </ul>
            </article>
            <article className="card border-2 border-[#6547d9] p-7">
              <Palette className="size-7 text-[#6547d9]" />
              <h3 className="mt-4 text-xl font-extrabold">Branded Academy</h3>
              <p className="mt-2 text-sm leading-6 text-[#6f6a80]">منصة باسم وهوية المدرس أو السنتر مع دومين وثيم وشعار خاص، دون بناء نسخة برمجية منفصلة لكل عميل.</p>
              <ul className="mt-5 space-y-2 text-sm">
                {["Custom Domain أو Subdomain", "اسم وشعار العميل", "ألوان وثيم مخصص", "نفس البنية والمحرك المشترك"].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#6547d9]" />{item}</li>)}
              </ul>
            </article>
          </div>

          <div className="mt-6 card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eeeaff] text-[#6547d9]"><TicketCheck className="size-5" /></span>
              <div>
                <h3 className="font-extrabold">Activation Codes</h3>
                <p className="mt-1 text-sm text-[#6f6a80]">المدرس أو السنتر يستطيع بيع أكواد مرتبطة بكورس، والطالب يفعّلها من حسابه للحصول على صلاحية الوصول.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-extrabold">اشتراك الإدارة منفصل عن اشتراك منصة الكورسات</h2>
              <p className="mt-3 text-[#5f5a70]">لا تدفع مقابل منتج لا تحتاجه. ابدأ بالإدارة، وأضف الـLMS عندما يصبح جزءًا من عملك.</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {managementPlans.map((plan) => (
                <article key={plan.name} className={`card flex flex-col p-6 ${plan.highlight ? "border-2 border-[#6547d9]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#6547d9]">Management</p>
                      <h3 className="mt-1 text-xl font-extrabold">{plan.name}</h3>
                      <p className="mt-1 text-sm text-[#6f6a80]">{plan.tagline}</p>
                    </div>
                  </div>
                  <div className="mt-5"><span className="text-3xl font-extrabold">{plan.price}</span><span className="text-sm text-[#6f6a80]"> {plan.period}</span></div>
                  <ul className="mt-6 space-y-2 text-sm">
                    {plan.features.map((feature) => <li key={feature} className="flex items-center gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#6547d9]" />{feature}</li>)}
                  </ul>
                  <Link href="/login" className={`focus-ring mt-8 rounded-xl p-3 text-center text-sm font-bold ${plan.highlight ? "bg-[#6547d9] text-white" : "bg-white text-[#6547d9] ring-1 ring-[#e5e2ec]"}`}>{plan.cta}</Link>
                </article>
              ))}

              <article className="card flex flex-col border border-dashed border-[#b7acd9] bg-[#faf9ff] p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#6547d9]">LMS</p>
                    <h3 className="mt-1 text-xl font-extrabold">منصة الكورسات</h3>
                  </div>
                  <span className="rounded-full bg-[#fff4df] px-3 py-1 text-xs font-bold text-[#9a6819]">قريبًا</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6f6a80]">اشتراك منفصل للطلاب الأونلاين، مع Shared Academy أو Branded Academy حسب الباقة.</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {["كورسات وفيديو واختبارات", "أكواد تفعيل وصلاحيات", "طلاب Online منفصلون", "Custom Domain وثيم في الباقة المخصصة"].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#6547d9]" />{item}</li>)}
                </ul>
                <div className="mt-8 rounded-xl bg-[#eeeaff] p-3 text-center text-sm font-bold text-[#6547d9]">سيُسعّر كمنتج مستقل</div>
              </article>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="mx-auto max-w-2xl text-center"><h2 className="text-3xl font-extrabold">ابدأ بالإدارة، وتوسع بدون إعادة بناء عملك</h2></div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="card relative p-6">
                <span className="absolute -top-3 start-6 grid size-8 place-items-center rounded-full bg-[#6547d9] text-sm font-bold text-white">{index + 1}</span>
                <h3 className="mt-4 font-extrabold">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#6f6a80]">{step.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link href="/login" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3 font-bold text-white">أنشئ حسابك الآن<ArrowLeft className="size-4" aria-hidden="true" /></Link>
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
