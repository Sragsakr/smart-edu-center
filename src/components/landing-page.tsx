import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  LineChart,
  MessageCircle,
  Palette,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

const quickFeatures = [
  "الطلاب والمجموعات",
  "الحضور والغياب",
  "التحصيل والفواتير",
  "صلاحيات الفريق",
  "متابعة ولي الأمر",
  "تقارير التشغيل",
];

const painPoints = [
  "دفاتر وشيتات منفصلة لكل جزء من الشغل",
  "رسائل واتساب مبعثرة ومعلومات صعب تلاقيها",
  "متأخرات وتحصيل غير واضحين لحظة بلحظة",
  "حسابات مشتركة تخلي الصلاحيات والمسؤولية ضايعين",
];

const useCases: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: CalendarCheck, title: "الحضور في ثواني", desc: "اعرف مين حضر ومين غاب من غير دفاتر أو شيتات منفصلة." },
  { icon: Wallet, title: "فلوسك واضحة", desc: "شوف المدفوع، المتأخر، الفواتير والاستحقاقات من مكان واحد." },
  { icon: Users, title: "كل طالب له ملف كامل", desc: "بيانات الطالب، مجموعاته، حضوره، تحصيله وتاريخه التشغيلي." },
  { icon: UsersRound, title: "فريقك بصلاحيات واضحة", desc: "مالك، مشرف، مدرس، استقبال ومحاسب؛ كل شخص يشوف اللي يخصه." },
  { icon: MessageCircle, title: "ولي الأمر متابع", desc: "بوابة ولي أمر تدعم أكثر من ابن وتعرض بيانات كل طالب بشكل منفصل." },
  { icon: LineChart, title: "قرارك مبني على أرقام", desc: "مؤشرات تشغيلية للحضور والتحصيل والطلاب تساعدك تتحرك بسرعة." },
];

const workflow = [
  { step: "01", title: "سجّل الطالب", desc: "بياناته وولي أمره ومجموعته في سجل واحد." },
  { step: "02", title: "شغّل اليوم", desc: "جدول، حضور، فريق، وفروع من نفس النظام." },
  { step: "03", title: "تابع التحصيل", desc: "الفواتير والمدفوع والمتأخر واضحين بدون حسابات يدوية." },
  { step: "04", title: "اتخذ قرار", desc: "تقارير تشغيلية بدل التخمين وتجميع الشيتات آخر اليوم." },
];

const roleCards = [
  { title: "صاحب السنتر", desc: "الصورة الكاملة: الفروع، الفريق، الحضور، التحصيل والتقارير." },
  { title: "الاستقبال والإدارة", desc: "تسجيل الطلاب، المجموعات، التحصيل والعمليات اليومية." },
  { title: "المدرس", desc: "مجموعاته، طلابه وحضوره من غير تشتيت باقي بيانات السنتر." },
  { title: "ولي الأمر والطالب", desc: "بوابات منفصلة للمتابعة والوصول لما يخصهم فقط." },
];

const dashboardStats: Array<{ title: string; value: string; icon: LucideIcon; color: string }> = [
  { title: "إجمالي الطلاب", value: "1,248", icon: Users, color: "#6547d9" },
  { title: "حضور اليوم", value: "892", icon: UserCheck, color: "#2fab88" },
  { title: "تحصيل الشهر", value: "84,250 ج", icon: CircleDollarSign, color: "#e09d36" },
  { title: "متأخرات", value: "12,800 ج", icon: Wallet, color: "#e96b7a" },
];

const roadmapFeatures: Array<{ icon: LucideIcon; label: string }> = [
  { icon: BookOpen, label: "كورسات وفيديو" },
  { icon: TicketCheck, label: "اختبارات وأكواد تفعيل" },
  { icon: Palette, label: "هوية ودومين مخصص" },
  { icon: MessageCircle, label: "تواصل وتنبيهات آلية" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200 sm:size-11"><GraduationCap size={24}/></span>
      <div><b className="block text-sm sm:text-[15px]">سبورتي | Saboraty</b><span className="hidden text-[11px] text-[#858197] sm:block">منصة تشغيل للتعليم الخاص</span></div>
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
      <div className="absolute bottom-4 left-4 rounded-2xl border border-[#e5e0f1] bg-white px-3 py-2 shadow-xl sm:bottom-6 sm:left-6 sm:px-4 sm:py-3"><p className="text-[9px] text-[#8c879a] sm:text-[10px]">متابعة ذكية</p><b className="text-xs text-[#6547d9] sm:text-sm">كل يوم أوضح</b></div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div dir="rtl" className="min-h-dvh overflow-hidden bg-[#fbfaff] text-[#17152b]">
      <header className="sticky top-0 z-40 border-b border-[#ece8f4] bg-white/92 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-10 xl:px-14 2xl:px-20"><Logo /><nav className="hidden items-center gap-7 text-sm font-semibold text-[#5f5a70] lg:flex"><a href="#why" className="hover:text-[#6547d9]">ليه سبورتي؟</a><a href="#features" className="hover:text-[#6547d9]">التشغيل</a><a href="#models" className="hover:text-[#6547d9]">لمن؟</a><a href="#roles" className="hover:text-[#6547d9]">الصلاحيات</a></nav><div className="flex items-center gap-2 sm:gap-3"><Link href="/login" className="hidden rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold sm:block">تسجيل الدخول</Link><Link href="/signup" className="rounded-xl bg-[#6547d9] px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-200 sm:px-4 sm:text-sm">ابدأ مجانًا</Link></div></div>
      </header>

      <main>
        <section className="relative w-full overflow-hidden bg-[radial-gradient(circle_at_10%_20%,rgba(207,197,255,.35),transparent_28%),radial-gradient(circle_at_88%_22%,rgba(238,233,255,.7),transparent_32%),linear-gradient(180deg,#fbfaff_0%,#f8f5ff_100%)]">
          <div className="grid min-h-[calc(100svh-64px)] w-full items-center gap-10 px-4 py-10 sm:min-h-[calc(100svh-80px)] sm:px-6 sm:py-14 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:px-10 lg:py-16 xl:px-14 2xl:px-20">
            <div className="order-1 max-w-[760px] justify-self-stretch lg:order-none lg:justify-self-end"><span className="inline-flex items-center gap-2 rounded-full border border-[#dcd5f3] bg-white px-3 py-1.5 text-[11px] font-bold text-[#6547d9] shadow-sm sm:text-xs"><Sparkles size={14}/> للسنتر التعليمي والمدرس المستقل</span><h1 className="mt-5 max-w-[760px] text-[38px] font-black leading-[1.15] tracking-tight sm:text-[48px] lg:text-[56px] xl:text-[64px] 2xl:text-[72px]">من تسجيل الطالب لحد الحضور والتحصيل<br className="hidden sm:block"/> <span className="text-[#6547d9]">شغّلك كله من نظام واحد.</span></h1><p className="mt-5 max-w-[700px] text-[16px] leading-8 text-[#5f5a70] sm:text-[17px] lg:text-[18px]">سبورتي منصة تشغيل للتعليم الخاص تجمع الطلاب والمجموعات والحضور والتحصيل والفريق والتقارير في مسار واحد، وتتكيّف مع طريقة شغلك سواء عندك سنتر أو بتدير مجموعاتك بنفسك.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3.5 font-bold text-white shadow-lg shadow-purple-200">ابدأ مجانًا <ArrowLeft size={17}/></Link><a href="#why" className="rounded-xl border border-[#ddd8e9] bg-white px-6 py-3.5 text-center font-bold text-[#5f5a70] shadow-sm">شوف الفرق</a></div><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-[#797386] sm:text-xs">{["7 أيام تجربة", "إعداد سريع", "بدون تعقيد ERP"].map(item => <span key={item} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#2fab88]"/>{item}</span>)}</div></div>
            <div className="order-2 w-full lg:order-none"><HeroVisual /></div>
          </div>
        </section>

        <section className="border-y border-[#ebe7f2] bg-white py-5"><div className="flex w-full flex-wrap justify-center gap-x-8 gap-y-3 px-4 text-sm font-bold text-[#5f5a70] sm:px-6 lg:px-10 xl:px-14 2xl:px-20">{quickFeatures.map(item => <span key={item} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#6547d9]"/>{item}</span>)}</div></section>

        <section id="why" className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]"><div><span className="text-sm font-bold text-[#6547d9]">مش مجرد برنامج سنتر</span><h2 className="mt-3 text-3xl font-black md:text-4xl">بدل ما تدير الشغل بين 4 أدوات، خليه Workflow واحد</h2><p className="mt-5 leading-8 text-[#6f6a80]">الهدف مش إننا نحط Features كتير في شاشة واحدة. الهدف إن رحلة الطالب والتشغيل والتحصيل تبقى مترابطة، عشان المعلومة تدخل مرة وتفضل مفيدة في كل خطوة بعدها.</p></div><div className="grid gap-3 sm:grid-cols-2">{painPoints.map((item) => <div key={item} className="rounded-2xl border border-[#e8e3f0] bg-white p-5"><div className="flex gap-3"><span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-[#f1edff] text-[#6547d9]">×</span><p className="font-bold leading-7 text-[#5f5a70]">{item}</p></div></div>)}</div></div></section>

        <section id="features" className="bg-white py-20"><div className="mx-auto max-w-7xl px-4 md:px-8"><div className="mx-auto max-w-3xl text-center"><span className="text-sm font-bold text-[#6547d9]">من أول اليوم لآخره</span><h2 className="mt-3 text-3xl font-black md:text-4xl">شغّل، تابع، وحاسب من نفس المكان</h2><p className="mt-4 text-[#6f6a80]">كل عملية متكررة تتحول لمسار واضح بدل ما تبدأ من الصفر كل مرة.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{useCases.map(({icon:Icon,title,desc}) => <article key={title} className="group rounded-3xl border border-[#e8e3f0] bg-[#fbfaff] p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100"><span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9] transition group-hover:bg-[#6547d9] group-hover:text-white"><Icon size={22}/></span><h3 className="mt-5 text-lg font-extrabold">{title}</h3><p className="mt-2 leading-7 text-[#706b80]">{desc}</p></article>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="mx-auto max-w-3xl text-center"><span className="text-sm font-bold text-[#6547d9]">Workflow واحد بدل جزر منفصلة</span><h2 className="mt-3 text-3xl font-black md:text-4xl">رحلة تشغيل مترابطة من البداية للنهاية</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{workflow.map((item) => <article key={item.step} className="rounded-3xl border border-[#e7e2ef] bg-white p-6"><span className="text-sm font-black text-[#6547d9]">{item.step}</span><h3 className="mt-3 text-lg font-extrabold">{item.title}</h3><p className="mt-2 leading-7 text-[#777183]">{item.desc}</p></article>)}</div></section>

        <section id="models" className="bg-[#17152b] py-20 text-white"><div className="mx-auto max-w-7xl px-4 md:px-8"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><span className="text-sm font-bold text-[#bbaeff]">USP أساسي: نفس المنصة، نموذجين تشغيل</span><h2 className="mt-3 text-3xl font-black md:text-4xl">سواء بتدير سنتر أو بتشتغل لوحدك</h2><p className="mt-5 leading-8 text-[#c9c5d7]">مش لازم تستخدم نظام ضخم لو أنت مدرس مستقل، ومش لازم تغيّر نظامك لما تكبر لسنتر. سبورتي يتكيّف مع نموذج التشغيل نفسه.</p></div><div className="grid gap-5 md:grid-cols-2"><article className="rounded-3xl border border-white/10 bg-white/5 p-7"><Building2 className="text-[#bbaeff]"/><h3 className="mt-5 text-xl font-extrabold">سنتر تعليمي</h3><p className="mt-3 leading-7 text-[#c9c5d7]">فروع، فريق، أدوار، طلاب، مجموعات، حضور، تحصيل وتقارير تشغيلية.</p></article><article className="rounded-3xl border border-[#7660db] bg-[#6547d9]/20 p-7"><GraduationCap className="text-[#cbbfff]"/><h3 className="mt-5 text-xl font-extrabold">مدرس مستقل</h3><p className="mt-3 leading-7 text-[#c9c5d7]">نفس الأساس القوي بشكل أخف، لإدارة مجموعاتك وطلابك وحضورك وتحصيلك بنفسك.</p></article></div></div></div></section>

        <section id="roles" className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><span className="text-sm font-bold text-[#6547d9]">كل شخص يشوف اللي يخصه</span><h2 className="mt-3 text-3xl font-black md:text-4xl">صلاحيات بدل الحساب المشترك</h2><p className="mt-4 leading-8 text-[#6f6a80]">ابعد عن مشاركة الباسورد بين الفريق. كل دور له وصوله ومسؤوليته داخل نفس مساحة العمل.</p></div><div className="grid gap-4 sm:grid-cols-2">{roleCards.map((item,index) => <article key={item.title} className="rounded-3xl border border-[#e7e2ef] bg-white p-6"><span className="text-sm font-black text-[#6547d9]">0{index+1}</span><h3 className="mt-3 font-extrabold">{item.title}</h3><p className="mt-2 leading-7 text-[#777183]">{item.desc}</p></article>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8"><div className="overflow-hidden rounded-[36px] bg-gradient-to-l from-[#6547d9] to-[#46309f] p-8 text-white md:p-12"><div className="grid items-center gap-10 lg:grid-cols-[1fr_.9fr]"><div><span className="text-sm font-bold text-[#d9d1ff]">المنصة تكبر معاك</span><h2 className="mt-3 text-3xl font-black md:text-4xl">والطريق مكمل للتعليم الرقمي والتواصل</h2><p className="mt-4 max-w-2xl leading-8 text-[#e3defa]">إحنا بنبني الأساس التشغيلي الأول. وبعده ضمن خارطة المنتج: LMS، اختبارات وواجبات، تنبيهات وتواصل آلي، وهوية ودومين مخصص.</p><p className="mt-3 text-sm font-bold text-[#d9d1ff]">المزايا دي ضمن خارطة التطوير وليست كلها متاحة حاليًا.</p></div><div className="grid grid-cols-2 gap-3">{roadmapFeatures.map(({icon:Icon,label}) => <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4"><Icon size={20}/><b className="mt-3 block text-sm">{label}</b></div>)}</div></div></div></section>

        <section className="px-4 pb-20 md:px-8"><div className="mx-auto max-w-4xl text-center"><h2 className="text-3xl font-black md:text-4xl">ابدأ ترتّب التشغيل قبل ما الفوضى تكبر</h2><p className="mt-4 text-[#6f6a80]">جرّب سبورتي، جهّز مساحة العمل وابدأ بطلابك ومجموعاتك.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-7 py-3.5 font-bold text-white">ابدأ مجانًا <ArrowLeft size={17}/></Link></div></section>
      </main>

      <footer className="border-t border-[#e8e3ef] bg-white"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 text-sm text-[#777183] md:flex-row md:px-8"><Logo/><p>© {new Date().getFullYear()} سبورتي | Saboraty — جميع الحقوق محفوظة.</p></div></footer>
    </div>
  );
}
