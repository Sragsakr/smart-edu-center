import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LineChart,
  MessageCircle,
  Palette,
  QrCode,
  School,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserCheck,
  Users,
  UsersRound,
  Video,
  Wallet,
} from "lucide-react";

const quickFeatures = [
  "الطلاب والمجموعات",
  "الحضور والغياب",
  "التحصيل والفواتير",
  "الجداول والفروع والقاعات",
  "صلاحيات الفريق",
  "ولي الأمر والطالب",
  "LMS والاختبارات",
  "التواصل والتنبيهات",
  "التقارير والتسويات",
];

const painPoints = [
  "دفاتر وشيتات منفصلة لكل جزء من الشغل",
  "رسائل واتساب مبعثرة ومعلومات صعب تلاقيها",
  "متأخرات وتحصيل غير واضحين لحظة بلحظة",
  "حسابات مشتركة تخلي الصلاحيات والمسؤولية ضايعين",
];

const useCases: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: CalendarCheck, title: "الحضور في ثواني", desc: "حضور يومي واضح مع سجل كامل لكل طالب ومسار تصحيح موثق." },
  { icon: Wallet, title: "فلوسك واضحة", desc: "فواتير، دفعات، متأخرات، اشتراكات وتقارير مالية في نفس النظام." },
  { icon: Users, title: "كل طالب له ملف كامل", desc: "بياناته، ولي أمره، مجموعاته، حضوره، تحصيله ونشاطه في Timeline واحدة." },
  { icon: UsersRound, title: "فريقك بصلاحيات واضحة", desc: "مالك، مشرف، مدرس، استقبال ومحاسب؛ كل شخص يشوف اللي يخصه." },
  { icon: MessageCircle, title: "ولي الأمر والطالب متابعين", desc: "بوابات منفصلة للحضور، التحصيل، المحتوى، النتائج والتنبيهات." },
  { icon: LineChart, title: "قرارك مبني على أرقام", desc: "مؤشرات تشغيلية ومالية وتعليمية تساعدك تعرف المشكلة قبل ما تكبر." },
];

const workflow = [
  { step: "01", title: "سجّل الطالب", desc: "بياناته، ولي أمره، مرحلته، مجموعته واشتراكه في سجل مترابط." },
  { step: "02", title: "نظّم التشغيل", desc: "فروع، قاعات، مدرسين، جداول وحصص بدون تعارضات." },
  { step: "03", title: "شغّل اليوم", desc: "حضور، متابعة، تحصيل، تواصل وتصحيحات موثقة من نفس المكان." },
  { step: "04", title: "علّم Online", desc: "محتوى، فيديو، أكواد تفعيل، اختبارات ونتائج داخل نفس تجربة الطالب." },
  { step: "05", title: "حاسب وسوّي", desc: "فواتير، دفعات، خزنة، تسويات مدرسين ومتابعة المتأخرات." },
  { step: "06", title: "اتخذ قرار", desc: "تقارير تشغيل ومال وتعليم بدل التخمين وتجميع الشيتات." },
];

const roleCards = [
  { title: "صاحب السنتر", desc: "الصورة الكاملة: الفروع، الفريق، الحضور، التحصيل، التعليم والتقارير." },
  { title: "الاستقبال والإدارة", desc: "تسجيل الطلاب، المجموعات، الجداول، التحصيل والعمليات اليومية." },
  { title: "المحاسب", desc: "الفواتير، الدفعات، الخزنة، المتأخرات، التسويات والمراجعة." },
  { title: "المدرس", desc: "مجموعاته، طلابه، حضوره، محتواه، اختباراته ومستحقاته." },
  { title: "ولي الأمر", desc: "أبناؤه، الحضور، التحصيل، النتائج والتنبيهات من بوابة واحدة." },
  { title: "الطالب", desc: "جدوله، حضوره، محتواه، فيديوهاته، اختباراته ونتائجه." },
];

const dashboardStats: Array<{ title: string; value: string; icon: LucideIcon; color: string }> = [
  { title: "إجمالي الطلاب", value: "1,248", icon: Users, color: "#6547d9" },
  { title: "حضور اليوم", value: "892", icon: UserCheck, color: "#2fab88" },
  { title: "تحصيل الشهر", value: "84,250 ج", icon: CircleDollarSign, color: "#e09d36" },
  { title: "متأخرات", value: "12,800 ج", icon: Wallet, color: "#e96b7a" },
];

const capabilityGroups: Array<{ title: string; desc: string; icon: LucideIcon; items: string[] }> = [
  {
    title: "إدارة السنتر والتشغيل",
    desc: "الأساس اليومي لتشغيل سنتر أو مدرس مستقل من نفس المنصة.",
    icon: School,
    items: [
      "مساحة عمل للسنتر أو المدرس المستقل",
      "فروع وقاعات ومراحل ومواد",
      "فريق ومدرسون وصلاحيات دقيقة",
      "مجموعات وسعة كل مجموعة",
      "جداول متكررة واستثناءات وإجازات",
      "منع تعارض المدرس أو القاعة أو الوقت",
      "إنشاء الحصص تلقائيًا ونقل/إلغاء الحصة مع سبب",
    ],
  },
  {
    title: "الطلاب وأولياء الأمور",
    desc: "رحلة الطالب كاملة من التسجيل وحتى تاريخ التعامل معه.",
    icon: Users,
    items: [
      "ملف طالب كامل وكود فريد داخل مساحة العمل",
      "ولي أمر واحد أو أكثر وربط أكثر من ابن",
      "جهة اتصال أساسية وعلاقات القرابة",
      "تسجيل الطالب في المجموعات مع منع التكرار والسعة الزائدة",
      "استيراد الطلاب على مراحل مع مراجعة قبل الاعتماد",
      "بحث سريع وفلاتر وPagination",
      "Timeline كاملة للتغييرات والحضور والتحصيل",
      "دمج السجلات المكررة بدون فقد التاريخ",
    ],
  },
  {
    title: "الحضور والغياب",
    desc: "حضور سريع مع قابلية مراجعة وتصحيح ومتابعة ولي الأمر.",
    icon: QrCode,
    items: [
      "حضور جماعي للحصة في Transaction واحدة",
      "QR وكود الطالب لتسجيل الحضور",
      "منع تكرار حضور الطالب لنفس الحصة",
      "حاضر / غائب / متأخر / بعذر",
      "تصحيح الحضور مع القديم والجديد والسبب والموافق",
      "Audit Log لكل تعديل",
      "تنبيهات بعد تثبيت الحضور",
      "تقارير حضور صحيحة حسب المنطقة الزمنية",
    ],
  },
  {
    title: "التحصيل والفواتير",
    desc: "من الاشتراك وحتى التسوية والمراجعة المالية.",
    icon: Wallet,
    items: [
      "خطط أسعار وباقات وعدد حصص",
      "اشتراكات وأقساط وحالات واضحة",
      "إنشاء فواتير تلقائي بدون تكرار",
      "دفع كامل أو جزئي ومنع التحصيل الزائد بالخطأ",
      "خصومات وموافقات وCredit Notes واسترداد",
      "تسلسل إيصالات لكل فرع/مساحة عمل",
      "ورديات كاشير وتسوية الخزنة",
      "تقارير أعمار الديون والمتأخرات",
      "سجل مالي Append-only للمراجعة",
      "مدفوعات Online وWebhooks ومطابقة التحصيل",
    ],
  },
  {
    title: "LMS والمحتوى",
    desc: "تحويل المنصة من تشغيل سنتر فقط إلى تجربة تعليمية كاملة.",
    icon: BookOpen,
    items: [
      "كورسات ووحدات ودروس ومواد تعليمية",
      "فيديو ومرفقات ومواد قابلة للتحميل حسب الصلاحية",
      "أكواد تفعيل وصلاحيات وصول للمحتوى",
      "تقدم الطالب داخل الكورس",
      "إدارة الأجهزة والجلسات حسب سياسة المركز",
      "حصص Live وربطها بالطالب والمجموعة",
      "هوية ودومين مخصص للتجربة التعليمية",
    ],
  },
  {
    title: "الاختبارات والتقييم",
    desc: "قياس فعلي لتقدم الطالب بدل الاعتماد على الحضور فقط.",
    icon: ClipboardCheck,
    items: [
      "بنك أسئلة وتصنيفات ومستويات صعوبة",
      "نسخ وإصدارات للاختبار بدل تعديل النتائج القديمة",
      "محاولات بوقت محدد وحفظ الإجابات",
      "تصحيح وإرسال النتائج",
      "نتائج وتقارير للطالب وولي الأمر والمدرس",
      "ربط التقييمات بالكورسات والمجموعات",
    ],
  },
  {
    title: "البوابات والتجربة حسب الدور",
    desc: "كل مستخدم يدخل على تجربة تناسب دوره فقط.",
    icon: ShieldCheck,
    items: [
      "بوابة الإدارة والمالك",
      "بوابة المدرس",
      "بوابة الطالب",
      "بوابة ولي الأمر",
      "صلاحيات حسب الدور والفعل وليس مجرد إخفاء شاشات",
      "تبديل السياق لمن لديه أكثر من دور أو مساحة عمل",
    ],
  },
  {
    title: "التواصل والأتمتة",
    desc: "المعلومة تتحول تلقائيًا لتنبيه بدل المتابعة اليدوية.",
    icon: MessageCircle,
    items: [
      "تنبيهات حضور وغياب وتأخير",
      "تنبيهات استحقاق ومتأخرات ودفع",
      "تنبيهات نتائج واختبارات ومحتوى جديد",
      "قنوات WhatsApp / SMS / Email حسب التكامل المتاح",
      "Outbox موثوق لمنع ضياع الرسائل أو تكرارها",
      "قوالب رسائل وسجل إرسال ومتابعة الحالة",
    ],
  },
  {
    title: "المدرسون والتسويات",
    desc: "إدارة العلاقة المالية والتشغيلية مع المدرس داخل نفس النظام.",
    icon: GraduationCap,
    items: [
      "ملف مدرس مرتبط بالعضوية والصلاحيات",
      "عقود وآليات احتساب مستحقات",
      "تسويات بناءً على الحصص أو النسب أو القواعد المتفق عليها",
      "سجل مستحقات ومراجعة واعتماد",
      "تقارير أداء وتشغيل للمدرس ومجموعاته",
    ],
  },
  {
    title: "التقارير والإدارة",
    desc: "صورة واحدة تجمع التشغيل والمال والتعليم.",
    icon: LineChart,
    items: [
      "Dashboard تشغيلية يومية",
      "تقارير الحضور والطلاب والمجموعات",
      "تقارير التحصيل والمتأخرات والخزنة",
      "تقارير التعليم والتقدم والاختبارات",
      "فلاتر حسب الفرع والمدرس والمرحلة والمادة والفترة",
      "مؤشرات تساعد صاحب السنتر يعرف أين يتدخل",
    ],
  },
  {
    title: "المنصة كـ SaaS",
    desc: "سبورتي نفسها قابلة للتوسع كمنتج يخدم عدد كبير من السناتر والمدرسين.",
    icon: Building2,
    items: [
      "خطط وFeatures وEntitlements حسب الباقة",
      "اشتراكات المنصة وإدارة التجديد",
      "Platform Admin لإدارة مساحات العمل",
      "طلبات إنشاء Workspace ودعوات الفريق",
      "Impersonation مقيد ومُسجّل لأغراض الدعم",
      "فصل كامل للبيانات بين كل Tenant",
    ],
  },
  {
    title: "الأمان والاستمرارية",
    desc: "البنية من البداية معمولة عشان تكبر بدون ما نفقد السيطرة.",
    icon: FileText,
    items: [
      "Tenant isolation على مستوى التطبيق وقاعدة البيانات",
      "Audit Logs للعمليات الحساسة",
      "Backups خارج السيرفر وخطة Restore",
      "Validation وصلاحيات من البداية",
      "اختبارات Integration وRegression وLoad قبل الإطلاق",
      "مراقبة وأخطاء وHealth Checks وCI/CD",
    ],
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200 sm:size-11"><GraduationCap size={24}/></span>
      <div><b className="block text-sm sm:text-[15px]">سبورتي | Saboraty</b><span className="hidden text-[11px] text-[#858197] sm:block">منصة تشغيل وتعليم للتعليم الخاص</span></div>
    </Link>
  );
}

function HeroVisual() {
  const bars = [58, 82, 68, 94, 73, 87, 64];
  return (
    <div className="relative min-h-[390px] w-full overflow-hidden rounded-[28px] border border-[#e7e1f6] bg-gradient-to-br from-[#eee9ff] via-white to-[#f8f6ff] shadow-[0_28px_80px_rgba(101,71,217,.14)] sm:min-h-[460px] lg:min-h-[520px] xl:min-h-[560px]">
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-[#d7ccff]/55 blur-3xl" />
      <div className="absolute -bottom-20 right-0 size-72 rounded-full bg-[#efeaff] blur-3xl" />
      <div role="img" aria-label="طالب يستخدم اللابتوب للدراسة" className="absolute bottom-0 left-0 h-[64%] w-[54%] bg-cover bg-center opacity-95 sm:h-[70%] sm:w-[48%]" style={{ backgroundImage: "url('https://images.pexels.com/photos/6084091/pexels-photo-6084091.jpeg?auto=compress&dpr=1&h=900&w=1400')" }} />
      <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-transparent via-white/20 to-white" />
      <div className="absolute right-3 top-4 w-[82%] rounded-[24px] border border-white bg-white/95 p-3 shadow-[0_18px_50px_rgba(37,30,70,.13)] backdrop-blur sm:right-6 sm:top-6 sm:w-[76%] sm:p-4 lg:right-8 lg:top-8 lg:w-[72%]">
        <div className="flex items-center justify-between border-b border-[#eeeaf4] pb-3"><div><p className="text-[11px] font-bold text-[#6547d9] sm:text-xs">لوحة الإدارة</p><p className="mt-1 text-[9px] text-[#8b8597] sm:text-[10px]">ملخص التشغيل اليوم</p></div><span className="rounded-full bg-[#e8f7f2] px-2.5 py-1 text-[9px] font-bold text-[#20866a] sm:px-3 sm:text-[10px]">مباشر</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{dashboardStats.map(({ title, value, icon: Icon, color }) => <div key={title} className="rounded-2xl bg-[#faf9fc] p-2 sm:p-2.5"><span className="grid size-6 place-items-center rounded-lg bg-white sm:size-7" style={{ color }}><Icon size={13}/></span><p className="mt-2 text-[8px] text-[#8c879a] sm:text-[9px]">{title}</p><b className="mt-1 block text-[10px] sm:text-xs">{value}</b></div>)}</div>
        <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-[1.35fr_.75fr]"><div className="rounded-2xl border border-[#eeeaf4] p-3"><div className="flex items-center justify-between"><div><b className="text-[11px]">نظرة على الحضور</b><p className="text-[9px] text-[#928ca0]">آخر 7 أيام</p></div><span className="text-[10px] font-bold text-[#6547d9]">91%</span></div><div className="mt-3 flex h-20 items-end gap-1.5 border-b border-[#eeeaf4]">{bars.map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-[#cfc5ff]" style={{height:`${height}%`}} />)}</div></div><div className="rounded-2xl border border-[#eeeaf4] p-3"><b className="text-[11px]">تحصيل الرسوم</b><div className="mx-auto mt-3 grid size-20 place-items-center rounded-full" style={{background:"conic-gradient(#6547d9 0 76%,#ece8f7 76% 100%)"}}><div className="grid size-14 place-items-center rounded-full bg-white"><b className="text-xs">76%</b></div></div></div></div>
      </div>
      <div className="absolute bottom-4 right-4 rounded-2xl border border-[#e5e0f1] bg-white px-3 py-2 shadow-xl sm:bottom-6 sm:right-6 sm:px-4 sm:py-3"><p className="text-[9px] text-[#8c879a] sm:text-[10px]">حضور اليوم</p><b className="text-xs text-[#20866a] sm:text-sm">+892 طالب</b></div>
      <div className="absolute bottom-4 left-4 rounded-2xl border border-[#e5e0f1] bg-white px-3 py-2 shadow-xl sm:bottom-6 sm:left-6 sm:px-4 sm:py-3"><p className="text-[9px] text-[#8c879a] sm:text-[10px]">تشغيل + تعليم</p><b className="text-xs text-[#6547d9] sm:text-sm">منصة واحدة</b></div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div dir="rtl" className="min-h-dvh overflow-hidden bg-[#fbfaff] text-[#17152b]">
      <header className="sticky top-0 z-40 border-b border-[#ece8f4] bg-white/92 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-10 xl:px-14 2xl:px-20"><Logo /><nav className="hidden items-center gap-7 text-sm font-semibold text-[#5f5a70] lg:flex"><a href="#why" className="hover:text-[#6547d9]">ليه سبورتي؟</a><a href="#features" className="hover:text-[#6547d9]">التشغيل</a><a href="#platform" className="hover:text-[#6547d9]">المنصة كاملة</a><a href="#models" className="hover:text-[#6547d9]">لمن؟</a><a href="#roles" className="hover:text-[#6547d9]">الأدوار</a></nav><div className="flex items-center gap-2 sm:gap-3"><Link href="/login" className="hidden rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold sm:block">تسجيل الدخول</Link><Link href="/signup" className="rounded-xl bg-[#6547d9] px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-200 sm:px-4 sm:text-sm">ابدأ مجانًا</Link></div></div>
      </header>

      <main>
        <section className="relative w-full overflow-hidden bg-[radial-gradient(circle_at_10%_20%,rgba(207,197,255,.35),transparent_28%),radial-gradient(circle_at_88%_22%,rgba(238,233,255,.7),transparent_32%),linear-gradient(180deg,#fbfaff_0%,#f8f5ff_100%)]">
          <div className="grid min-h-[calc(100svh-64px)] w-full items-center gap-10 px-4 py-10 sm:min-h-[calc(100svh-80px)] sm:px-6 sm:py-14 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:px-10 lg:py-16 xl:px-14 2xl:px-20">
            <div className="order-1 max-w-[760px] justify-self-stretch lg:order-none lg:justify-self-end"><span className="inline-flex items-center gap-2 rounded-full border border-[#dcd5f3] bg-white px-3 py-1.5 text-[11px] font-bold text-[#6547d9] shadow-sm sm:text-xs"><Sparkles size={14}/> للسنتر التعليمي والمدرس المستقل</span><h1 className="mt-5 max-w-[760px] text-[38px] font-black leading-[1.15] tracking-tight sm:text-[48px] lg:text-[56px] xl:text-[64px] 2xl:text-[72px]">من تسجيل الطالب لحد التشغيل والتعليم والتحصيل<br className="hidden sm:block"/> <span className="text-[#6547d9]">كل حاجة من منصة واحدة.</span></h1><p className="mt-5 max-w-[700px] text-[16px] leading-8 text-[#5f5a70] sm:text-[17px] lg:text-[18px]">سبورتي منصة تشغيل وتعليم للتعليم الخاص: تدير الطلاب والمجموعات والفروع والجداول والحضور والتحصيل والفريق، وتكمل معاك للمحتوى والاختبارات والتواصل والتقارير من نفس المنظومة.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3.5 font-bold text-white shadow-lg shadow-purple-200">ابدأ مجانًا <ArrowLeft size={17}/></Link><a href="#platform" className="rounded-xl border border-[#ddd8e9] bg-white px-6 py-3.5 text-center font-bold text-[#5f5a70] shadow-sm">شوف المنصة كاملة</a></div><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-[#797386] sm:text-xs">{["سنتر أو مدرس مستقل", "تشغيل + تعليم + تحصيل", "بدون تعقيد ERP"].map(item => <span key={item} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#2fab88]"/>{item}</span>)}</div></div>
            <div className="order-2 w-full lg:order-none"><HeroVisual /></div>
          </div>
        </section>

        <section className="border-y border-[#ebe7f2] bg-white py-5"><div className="flex w-full flex-wrap justify-center gap-x-8 gap-y-3 px-4 text-sm font-bold text-[#5f5a70] sm:px-6 lg:px-10 xl:px-14 2xl:px-20">{quickFeatures.map(item => <span key={item} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#6547d9]"/>{item}</span>)}</div></section>

        <section id="why" className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]"><div><span className="text-sm font-bold text-[#6547d9]">مش مجرد برنامج سنتر</span><h2 className="mt-3 text-3xl font-black md:text-4xl">بدل ما تدير الشغل بين أدوات منفصلة، خليه Workflow واحد</h2><p className="mt-5 leading-8 text-[#6f6a80]">الهدف مش إننا نحط Features كتير في شاشة واحدة. الهدف إن رحلة الطالب والتشغيل والتعليم والتحصيل تبقى مترابطة، عشان المعلومة تدخل مرة وتفضل مفيدة في كل خطوة بعدها.</p></div><div className="grid gap-3 sm:grid-cols-2">{painPoints.map((item) => <div key={item} className="rounded-2xl border border-[#e8e3f0] bg-white p-5"><div className="flex gap-3"><span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[#f1edff] text-[#6547d9]">×</span><p className="font-bold leading-7 text-[#5f5a70]">{item}</p></div></div>)}</div></div></section>

        <section id="features" className="bg-white py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><div className="mx-auto max-w-3xl text-center"><span className="text-sm font-bold text-[#6547d9]">من أول اليوم لآخره</span><h2 className="mt-3 text-3xl font-black md:text-4xl">شغّل، تابع، علّم، وحاسب من نفس المكان</h2><p className="mt-4 text-[#6f6a80]">كل عملية متكررة تتحول لمسار واضح بدل ما تبدأ من الصفر كل مرة.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{useCases.map(({icon:Icon,title,desc}) => <article key={title} className="group rounded-3xl border border-[#e8e3f0] bg-[#fbfaff] p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100"><span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9] transition group-hover:bg-[#6547d9] group-hover:text-white"><Icon size={22}/></span><h3 className="mt-5 text-lg font-extrabold">{title}</h3><p className="mt-2 leading-7 text-[#706b80]">{desc}</p></article>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="mx-auto max-w-3xl text-center"><span className="text-sm font-bold text-[#6547d9]">Workflow واحد بدل جزر منفصلة</span><h2 className="mt-3 text-3xl font-black md:text-4xl">رحلة مترابطة من تسجيل الطالب لحد القرار</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{workflow.map((item) => <article key={item.step} className="rounded-3xl border border-[#e7e2ef] bg-white p-6"><span className="text-sm font-black text-[#6547d9]">{item.step}</span><h3 className="mt-3 text-lg font-extrabold">{item.title}</h3><p className="mt-2 leading-7 text-[#777183]">{item.desc}</p></article>)}</div></section>

        <section id="platform" className="bg-[#17152b] py-20 text-white"><div className="mx-auto max-w-7xl px-4 md:px-8"><div className="mx-auto max-w-4xl text-center"><span className="text-sm font-bold text-[#bbaeff]">الرؤية الكاملة للمنتج</span><h2 className="mt-3 text-3xl font-black md:text-5xl">كل ما هو موجود الآن أو داخل خطة سبورتي ظاهر هنا</h2><p className="mt-5 leading-8 text-[#c9c5d7]">بعض المزايا تعمل بالفعل وبعضها ضمن مراحل التطوير التالية، لكن دي هي صورة المنصة المستهدفة كاملة — من التشغيل الأساسي حتى التعليم الرقمي والتحصيل والتواصل وإدارة الـSaaS.</p></div><div className="mt-12 grid gap-5 lg:grid-cols-2">{capabilityGroups.map(({title,desc,icon:Icon,items}) => <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#6547d9]/30 text-[#d6cdff]"><Icon size={22}/></span><div><h3 className="text-xl font-extrabold">{title}</h3><p className="mt-2 leading-7 text-[#c9c5d7]">{desc}</p></div></div><div className="mt-5 grid gap-2">{items.map(item => <div key={item} className="flex gap-2.5 text-sm leading-6 text-[#dedbe8]"><CheckCircle2 size={16} className="mt-1 shrink-0 text-[#8bd7bd]"/><span>{item}</span></div>)}</div></article>)}</div><p className="mx-auto mt-8 max-w-4xl text-center text-sm font-semibold leading-7 text-[#aaa5ba]">المحتوى أعلاه يشرح Target Product بالكامل. توافر كل ميزة في النسخة الحالية يختلف حسب مرحلة التطوير، لكن أي Feature موجودة في الـRoadmap لازم تفضل ظاهرة هنا عشان رؤية المنتج تبقى كاملة لأي شخص بنعرض عليه الفكرة.</p></div></section>

        <section id="models" className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><span className="text-sm font-bold text-[#6547d9]">USP أساسي: نفس المنصة، نموذجين تشغيل</span><h2 className="mt-3 text-3xl font-black md:text-4xl">سواء بتدير سنتر أو بتشتغل لوحدك</h2><p className="mt-5 leading-8 text-[#6f6a80]">مش لازم تستخدم نظام ضخم لو أنت مدرس مستقل، ومش لازم تغيّر نظامك لما تكبر لسنتر. سبورتي يتكيّف مع نموذج التشغيل نفسه ويكبر معاك.</p></div><div className="grid gap-5 md:grid-cols-2"><article className="rounded-3xl border border-[#e7e2ef] bg-white p-7"><Building2 className="text-[#6547d9]"/><h3 className="mt-5 text-xl font-extrabold">سنتر تعليمي</h3><p className="mt-3 leading-7 text-[#6f6a80]">فروع، فريق، أدوار، طلاب، مجموعات، حضور، تحصيل، LMS، اختبارات وتقارير تشغيلية ومالية.</p></article><article className="rounded-3xl border border-[#7660db] bg-[#6547d9] p-7 text-white"><GraduationCap className="text-[#ddd6ff]"/><h3 className="mt-5 text-xl font-extrabold">مدرس مستقل</h3><p className="mt-3 leading-7 text-[#ebe7ff]">نفس الأساس القوي بشكل أخف، لإدارة مجموعاتك وطلابك وحضورك وتحصيلك ومحتواك بنفسك.</p></article></div></div></section>

        <section id="roles" className="bg-white py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><div><span className="text-sm font-bold text-[#6547d9]">كل شخص يشوف اللي يخصه</span><h2 className="mt-3 text-3xl font-black md:text-4xl">تجربة مختلفة لكل Role</h2><p className="mt-4 leading-8 text-[#6f6a80]">المنصة مش Dashboard واحدة للجميع. كل دور له شغله وصلاحياته ومسؤوليته وبياناته.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{roleCards.map((item,index) => <article key={item.title} className="rounded-3xl border border-[#e7e2ef] bg-[#fbfaff] p-6"><span className="text-sm font-black text-[#6547d9]">0{index+1}</span><h3 className="mt-3 font-extrabold">{item.title}</h3><p className="mt-2 leading-7 text-[#777183]">{item.desc}</p></article>)}</div></div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="overflow-hidden rounded-[36px] bg-gradient-to-l from-[#6547d9] to-[#46309f] p-8 text-white md:p-12"><div className="grid items-center gap-10 lg:grid-cols-[1fr_.9fr]"><div><span className="text-sm font-bold text-[#d9d1ff]">القيمة الأساسية</span><h2 className="mt-3 text-3xl font-black md:text-4xl">مش 10 أنظمة جنب بعض — منظومة واحدة بتفهم رحلة الطالب</h2><p className="mt-4 max-w-2xl leading-8 text-[#e3defa]">الطالب يتسجل مرة، وبعدها نفس بياناته تخدم الجدول والحضور والتحصيل والمحتوى والاختبارات والتواصل والتقارير. ده هو الفرق اللي بنبني عليه سبورتي.</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><Video size={20}/><b className="mt-3 block text-sm">تعليم رقمي</b></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><TicketCheck size={20}/><b className="mt-3 block text-sm">اختبارات وتقييم</b></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><Palette size={20}/><b className="mt-3 block text-sm">هوية مخصصة</b></div><div className="rounded-2xl border border-white/15 bg-white/10 p-4"><MessageCircle size={20}/><b className="mt-3 block text-sm">تواصل آلي</b></div></div></div></div></section>

        <section className="px-4 pb-20 md:px-8"><div className="mx-auto max-w-4xl text-center"><h2 className="text-3xl font-black md:text-4xl">منصة واحدة من أول طالب لحد إدارة البيزنس كله</h2><p className="mt-4 text-[#6f6a80]">لو بتدير سنتر أو بتبني شغلك كمدرس مستقل، سبورتي معمولة عشان تبدأ معاك بسيطة وتكبر معاك من غير ما تغيّر نظامك.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-7 py-3.5 font-bold text-white">ابدأ مجانًا <ArrowLeft size={17}/></Link></div></section>
      </main>

      <footer className="border-t border-[#e8e3ef] bg-white"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 text-sm text-[#777183] md:flex-row md:px-8"><Logo/><p>© {new Date().getFullYear()} سبورتي | Saboraty — جميع الحقوق محفوظة.</p></div></footer>
    </div>
  );
}
