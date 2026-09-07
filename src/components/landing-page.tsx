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

const quickFeatures = ["الحضور والغياب", "التحصيل والفواتير", "المجموعات والجداول", "صلاحيات الفريق", "متابعة ولي الأمر", "تقارير التشغيل"];

const useCases: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: CalendarCheck, title: "الحضور في ثواني", desc: "اعرف مين حضر ومين غاب من غير دفاتر أو شيتات منفصلة." },
  { icon: Wallet, title: "فلوسك واضحة", desc: "شوف المدفوع، المتأخر، الفواتير والاستحقاقات من مكان واحد." },
  { icon: Users, title: "كل طالب له ملف كامل", desc: "بيانات الطالب، مجموعاته، حضوره، تحصيله وتاريخه التشغيلي." },
  { icon: UsersRound, title: "فريقك بصلاحيات واضحة", desc: "مالك، مشرف، مدرس، استقبال ومحاسب؛ كل شخص يشوف اللي يخصه." },
  { icon: MessageCircle, title: "ولي الأمر متابع", desc: "بوابة ولي أمر تدعم أكثر من ابن وتعرض بيانات كل طالب بشكل منفصل." },
  { icon: LineChart, title: "قرارك مبني على أرقام", desc: "مؤشرات تشغيلية للحضور والتحصيل والطلاب تساعدك تتحرك بسرعة." },
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

const lmsFeatures: Array<{ icon: LucideIcon; label: string }> = [
  { icon: BookOpen, label: "كورسات وفيديو" },
  { icon: TicketCheck, label: "أكواد تفعيل" },
  { icon: Palette, label: "هوية ودومين مخصص" },
  { icon: ShieldCheck, label: "صلاحيات وصول منفصلة" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200"><GraduationCap size={25}/></span>
      <div><b className="block text-[15px]">سبورتي | Saboraty</b><span className="text-[11px] text-[#858197]">إدارة تعليمية أبسط وأوضح</span></div>
    </Link>
  );
}

function HeroVisual() {
  const bars = [58, 82, 68, 94, 73, 87, 64];
  return (
    <div className="relative mx-auto min-h-[430px] w-full max-w-[590px] overflow-hidden rounded-[32px] border border-[#e7e1f6] bg-gradient-to-br from-[#eee9ff] via-white to-[#f8f6ff] shadow-[0_28px_80px_rgba(101,71,217,.14)] lg:min-h-[475px]">
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-[#d7ccff]/55 blur-3xl" />
      <div
        role="img"
        aria-label="طالبة عربية تستخدم اللابتوب للدراسة"
        className="absolute bottom-0 left-0 h-[66%] w-[54%] bg-cover bg-center opacity-90"
        style={{ backgroundImage: "url('https://images.pexels.com/photos/6084091/pexels-photo-6084091.jpeg?auto=compress&dpr=1&h=750&w=1260')" }}
      />
      <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-transparent via-white/20 to-white" />

      <div className="absolute right-5 top-5 w-[76%] rounded-[26px] border border-white bg-white/95 p-4 shadow-[0_18px_50px_rgba(37,30,70,.13)] backdrop-blur md:right-7 md:top-7">
        <div className="flex items-center justify-between border-b border-[#eeeaf4] pb-3">
          <div><p className="text-xs font-bold text-[#6547d9]">لوحة الإدارة</p><p className="mt-1 text-[10px] text-[#8b8597]">ملخص التشغيل اليوم</p></div>
          <span className="rounded-full bg-[#e8f7f2] px-3 py-1 text-[10px] font-bold text-[#20866a]">مباشر</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {dashboardStats.map(({ title, value, icon: Icon, color }) => (
            <div key={title} className="rounded-2xl bg-[#faf9fc] p-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-white" style={{ color }}><Icon size={14}/></span>
              <p className="mt-2 text-[9px] text-[#8c879a]">{title}</p><b className="mt-1 block text-xs">{value}</b>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1.35fr_.75fr]">
          <div className="rounded-2xl border border-[#eeeaf4] p-3">
            <div className="flex items-center justify-between"><div><b className="text-[11px]">نظرة على الحضور</b><p className="text-[9px] text-[#928ca0]">آخر 7 أيام</p></div><span className="text-[10px] font-bold text-[#6547d9]">91%</span></div>
            <div className="mt-3 flex h-20 items-end gap-1.5 border-b border-[#eeeaf4]">{bars.map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-[#cfc5ff]" style={{height:`${height}%`}} />)}</div>
          </div>
          <div className="rounded-2xl border border-[#eeeaf4] p-3">
            <b className="text-[11px]">تحصيل الرسوم</b>
            <div className="mx-auto mt-3 grid size-20 place-items-center rounded-full" style={{background:"conic-gradient(#6547d9 0 76%,#ece8f7 76% 100%)"}}><div className="grid size-14 place-items-center rounded-full bg-white"><b className="text-xs">76%</b></div></div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 rounded-2xl border border-[#e5e0f1] bg-white px-4 py-3 shadow-xl"><p className="text-[10px] text-[#8c879a]">حضور اليوم</p><b className="text-sm text-[#20866a]">+892 طالب</b></div>
      <div className="absolute bottom-6 left-6 rounded-2xl border border-[#e5e0f1] bg-white px-4 py-3 shadow-xl"><p className="text-[10px] text-[#8c879a]">متابعة ذكية</p><b className="text-sm text-[#6547d9]">كل يوم أوضح</b></div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div dir="rtl" className="min-h-dvh overflow-hidden bg-[#fbfaff] text-[#17152b]">
      <header className="sticky top-0 z-40 border-b border-[#ece8f4] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1180px] items-center justify-between px-5 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#5f5a70] lg:flex">
            <a href="#features" className="hover:text-[#6547d9]">المزايا</a><a href="#models" className="hover:text-[#6547d9]">طريقة الشغل</a><a href="#roles" className="hover:text-[#6547d9]">الصلاحيات</a><a href="#lms" className="hover:text-[#6547d9]">الكورسات Online</a>
          </nav>
          <div className="flex items-center gap-3"><Link href="/login" className="hidden rounded-xl border border-[#ddd8e9] bg-white px-4 py-2 text-sm font-bold sm:block">تسجيل الدخول</Link><Link href="/signup" className="rounded-xl bg-[#6547d9] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-purple-200">ابدأ مجانًا</Link></div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[610px] max-w-[1180px] items-center gap-14 px-5 py-16 md:px-8 lg:grid-cols-[1fr_1fr] lg:py-20">
          <div className="relative z-10 max-w-[560px] justify-self-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dcd5f3] bg-white px-3 py-1.5 text-xs font-bold text-[#6547d9] shadow-sm"><Sparkles size={14}/> للمدرس المستقل والسنتر التعليمي</span>
            <h1 className="mt-6 text-[42px] font-black leading-[1.16] tracking-tight md:text-[56px]">كل شغل السنتر أو<br/>مجموعاتك <span className="whitespace-nowrap text-[#6547d9]">في مكان واحد.</span></h1>
            <p className="mt-6 max-w-[540px] text-[17px] leading-8 text-[#5f5a70]">طلاب، حضور، تحصيل، مجموعات، فريق وتقارير. سبورتي يخليك تشوف يومك كله بوضوح بدل الدفاتر والشيتات ورسائل الواتساب المتناثرة.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3.5 font-bold text-white shadow-lg shadow-purple-200">ابدأ مجانًا <ArrowLeft size={17}/></Link><a href="#features" className="rounded-xl border border-[#ddd8e9] bg-white px-6 py-3.5 font-bold text-[#5f5a70] shadow-sm">شوف النظام بيعمل إيه</a></div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#797386]">{["7 أيام تجربة", "إعداد سريع", "بدون تعقيد تقني"].map(item => <span key={item} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#2fab88]"/>{item}</span>)}</div>
          </div>
          <HeroVisual />
        </section>

        <section className="border-y border-[#ebe7f2] bg-white py-5"><div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-3 px-4 text-sm font-bold text-[#5f5a70] md:px-8">{quickFeatures.map(item => <span key={item} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#6547d9]"/>{item}</span>)}</div></section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mx-auto max-w-3xl text-center"><span className="text-sm font-bold text-[#6547d9]">من الفوضى لليوم المنظم</span><h2 className="mt-3 text-3xl font-black md:text-4xl">كل ما تحتاجه لتشغيل السنتر بوضوح</h2><p className="mt-4 text-[#6f6a80]">كل عملية متكررة تتحول لمسار واضح وسريع داخل النظام.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{useCases.map(({icon:Icon,title,desc}) => <article key={title} className="group rounded-3xl border border-[#e8e3f0] bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100"><span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9] transition group-hover:bg-[#6547d9] group-hover:text-white"><Icon size={22}/></span><h3 className="mt-5 text-lg font-extrabold">{title}</h3><p className="mt-2 leading-7 text-[#706b80]">{desc}</p></article>)}</div>
        </section>

        <section id="models" className="bg-[#17152b] py-20 text-white"><div className="mx-auto max-w-7xl px-4 md:px-8"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><span className="text-sm font-bold text-[#bbaeff]">نفس المنصة. نموذجين تشغيل.</span><h2 className="mt-3 text-3xl font-black md:text-4xl">سواء بتدير سنتر أو بتشتغل لوحدك</h2><p className="mt-5 leading-8 text-[#c9c5d7]">سبورتي مصمم من البداية ليستوعب نموذج السنتر متعدد الأدوار ونموذج المدرس المستقل من غير ما يفرض عليك تعقيد مش محتاجه.</p></div><div className="grid gap-5 md:grid-cols-2"><article className="rounded-3xl border border-white/10 bg-white/5 p-7"><Building2 className="text-[#bbaeff]"/><h3 className="mt-5 text-xl font-extrabold">سنتر تعليمي</h3><p className="mt-3 leading-7 text-[#c9c5d7]">إدارة كاملة للفريق، الفروع، الطلاب، المجموعات، التحصيل والصلاحيات.</p></article><article className="rounded-3xl border border-[#7660db] bg-[#6547d9]/20 p-7"><GraduationCap className="text-[#cbbfff]"/><h3 className="mt-5 text-xl font-extrabold">مدرس مستقل</h3><p className="mt-3 leading-7 text-[#c9c5d7]">نفس القوة بشكل أخف لإدارة مجموعاتك وطلابك وحضورك وتحصيلك بنفسك.</p></article></div></div></div></section>

        <section id="roles" className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><span className="text-sm font-bold text-[#6547d9]">كل شخص يشوف اللي يخصه</span><h2 className="mt-3 text-3xl font-black md:text-4xl">صلاحيات بدل الحساب المشترك</h2><p className="mt-4 leading-8 text-[#6f6a80]">ابعد عن مشاركة الباسورد بين الفريق. كل دور له وصوله ومسؤوليته داخل نفس مساحة العمل.</p></div><div className="grid gap-4 sm:grid-cols-2">{roleCards.map((item,index) => <article key={item.title} className="rounded-3xl border border-[#e7e2ef] bg-white p-6"><span className="text-sm font-black text-[#6547d9]">0{index+1}</span><h3 className="mt-3 font-extrabold">{item.title}</h3><p className="mt-2 leading-7 text-[#777183]">{item.desc}</p></article>)}</div></div></section>

        <section id="lms" className="mx-auto max-w-7xl px-4 pb-20 md:px-8"><div className="overflow-hidden rounded-[36px] bg-gradient-to-l from-[#6547d9] to-[#46309f] p-8 text-white md:p-12"><div className="grid items-center gap-10 lg:grid-cols-[1fr_.9fr]"><div><span className="text-sm font-bold text-[#d9d1ff]">أكتر من إدارة سنتر</span><h2 className="mt-3 text-3xl font-black md:text-4xl">بيع كورساتك Online من نفس المنصة</h2><p className="mt-4 max-w-2xl leading-8 text-[#e3defa]">فعّل الـLMS، ارفع محتواك، أنشئ أكواد تفعيل وقدم تجربة منفصلة للطالب بهويتك ودومينك.</p></div><div className="grid grid-cols-2 gap-3">{lmsFeatures.map(({icon:Icon,label}) => <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4"><Icon size={20}/><b className="mt-3 block text-sm">{label}</b></div>)}</div></div></div></section>

        <section className="px-4 pb-20 md:px-8"><div className="mx-auto max-w-4xl text-center"><h2 className="text-3xl font-black md:text-4xl">ابدأ تشغيلك بشكل أوضح من النهارده</h2><p className="mt-4 text-[#6f6a80]">جرّب سبورتي، جهّز مساحة العمل وابدأ بطلابك ومجموعاتك.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-7 py-3.5 font-bold text-white">ابدأ مجانًا <ArrowLeft size={17}/></Link></div></section>
      </main>

      <footer className="border-t border-[#e8e3ef] bg-white"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 text-sm text-[#777183] md:flex-row md:px-8"><Logo/><p>© {new Date().getFullYear()} سبورتي | Saboraty — جميع الحقوق محفوظة.</p></div></footer>
    </div>
  );
}
