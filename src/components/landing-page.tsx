import Link from "next/link";
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

const useCases = [
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
  { title: "المدرس", desc: "مجموعاته، طلابه وحضورهم من غير تشتيت باقي بيانات السنتر." },
  { title: "ولي الأمر والطالب", desc: "بوابات منفصلة للمتابعة والوصول لما يخصهم فقط." },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-[#6547d9] text-white shadow-lg shadow-purple-200"><GraduationCap size={25}/></span>
      <div><b className="block text-[15px]">Smart Edu Center</b><span className="text-[11px] text-[#858197]">إدارة تعليمية أبسط وأوضح</span></div>
    </Link>
  );
}

function DashboardPreview() {
  const bars = [58, 82, 68, 94, 73, 87, 64];
  return (
    <div className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[40px] bg-[#dcd4ff]/55 blur-3xl" />
      <div className="overflow-hidden rounded-[28px] border border-[#e5e0f1] bg-white shadow-2xl shadow-purple-200/50">
        <div className="flex items-center justify-between border-b border-[#eeeaf4] px-5 py-4">
          <div><p className="text-xs font-bold text-[#6547d9]">لوحة الإدارة</p><p className="mt-1 text-xs text-[#888294]">ملخص التشغيل اليوم</p></div>
          <span className="rounded-full bg-[#e8f7f2] px-3 py-1 text-[10px] font-bold text-[#20866a]">مباشر</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
          {[
            ["إجمالي الطلاب", "1,248", Users, "#6547d9"],
            ["حضور اليوم", "892", UserCheck, "#2fab88"],
            ["تحصيل الشهر", "84,250 ج", CircleDollarSign, "#e09d36"],
            ["متأخرات", "12,800 ج", Wallet, "#e96b7a"],
          ].map(([title, value, Icon, color]) => (
            <div key={String(title)} className="rounded-2xl bg-[#faf9fc] p-3">
              <span className="grid size-8 place-items-center rounded-xl bg-white" style={{color: String(color)}}><Icon size={16}/></span>
              <p className="mt-3 text-[10px] text-[#8c879a]">{title}</p><b className="mt-1 block text-sm">{value}</b>
            </div>
          ))}
        </div>
        <div className="grid gap-4 px-4 pb-4 lg:grid-cols-[1.35fr_.75fr]">
          <div className="rounded-2xl border border-[#eeeaf4] p-4">
            <div className="flex items-center justify-between"><div><b className="text-xs">نظرة على الحضور</b><p className="text-[10px] text-[#928ca0]">آخر 7 أيام</p></div><span className="text-[10px] font-bold text-[#6547d9]">91%</span></div>
            <div className="mt-4 flex h-28 items-end gap-2 border-b border-[#eeeaf4]">{bars.map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-[#d9d2ff]" style={{height:`${height}%`}} />)}</div>
          </div>
          <div className="rounded-2xl border border-[#eeeaf4] p-4">
            <b className="text-xs">تحصيل الرسوم</b>
            <div className="mx-auto mt-4 grid size-24 place-items-center rounded-full" style={{background:"conic-gradient(#6547d9 0 76%,#ece8f7 76% 100%)"}}><div className="grid size-16 place-items-center rounded-full bg-white"><b className="text-sm">76%</b></div></div>
            <p className="mt-3 text-center text-[10px] text-[#8c879a]">تم تحصيل معظم مستحقات الشهر</p>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -right-4 rounded-2xl border border-[#e5e0f1] bg-white px-4 py-3 shadow-lg"><p className="text-[10px] text-[#8c879a]">حضور اليوم</p><b className="text-sm text-[#20866a]">+892 طالب</b></div>
      <div className="absolute -left-3 top-24 rounded-2xl border border-[#e5e0f1] bg-white px-4 py-3 shadow-lg"><p className="text-[10px] text-[#8c879a]">متأخرات تحتاج متابعة</p><b className="text-sm text-[#d95567]">12,800 ج</b></div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div dir="rtl" className="min-h-dvh overflow-hidden bg-[#f7f6fb] text-[#17152b]">
      <header className="sticky top-0 z-40 border-b border-[#e8e5ef] bg-[#f7f6fb]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-[#5f5a70] lg:flex">
            <a href="#features" className="hover:text-[#6547d9]">المزايا</a><a href="#models" className="hover:text-[#6547d9]">طريقة الشغل</a><a href="#roles" className="hover:text-[#6547d9]">الصلاحيات</a><a href="#lms" className="hover:text-[#6547d9]">الكورسات Online</a>
          </nav>
          <div className="flex items-center gap-3"><Link href="/login" className="hidden rounded-xl border border-[#ddd8e9] px-4 py-2 text-sm font-bold sm:block">تسجيل الدخول</Link><Link href="/login" className="rounded-xl bg-[#6547d9] px-4 py-2 text-sm font-bold text-white">ابدأ مجانًا</Link></div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 md:px-8 lg:grid-cols-[.9fr_1.1fr] lg:py-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dcd5f3] bg-white px-3 py-1.5 text-xs font-bold text-[#6547d9]"><Sparkles size={14}/> للمدرس المستقل والسنتر التعليمي</span>
            <h1 className="mt-6 text-4xl font-black leading-[1.18] tracking-tight md:text-6xl">كل شغل السنتر أو مجموعاتك<br/><span className="text-[#6547d9]">في مكان واحد.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f5a70]">طلاب، حضور، تحصيل، مجموعات، فريق وتقارير. Smart Edu يخليك تشوف يومك كله بوضوح بدل الدفاتر والشيتات ورسائل الواتساب المتناثرة.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-6 py-3.5 font-bold text-white shadow-lg shadow-purple-200">ابدأ مجانًا <ArrowLeft size={17}/></Link><a href="#features" className="rounded-xl border border-[#ddd8e9] bg-white px-6 py-3.5 font-bold text-[#5f5a70]">شوف النظام بيعمل إيه</a></div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#797386]">{["7 أيام تجربة", "إعداد سريع", "بدون تعقيد تقني"].map(item => <span key={item} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#2fab88]"/>{item}</span>)}</div>
          </div>
          <DashboardPreview />
        </section>

        <section className="border-y border-[#ebe7f2] bg-white/80 py-5"><div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-3 px-4 text-sm font-bold text-[#5f5a70] md:px-8">{quickFeatures.map(item => <span key={item} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#6547d9]"/>{item}</span>)}</div></section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mx-auto max-w-3xl text-center"><span className="text-sm font-bold text-[#6547d9]">من الفوضى لليوم المنظم</span><h2 className="mt-3 text-3xl font-black md:text-4xl">بدل الدفاتر والشيتات ورسائل الواتساب المبعثرة</h2><p className="mt-4 text-[#6f6a80]">كل عملية متكررة في السنتر تتحول لمسار واضح وسريع داخل النظام.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{useCases.map(({icon:Icon,title,desc}) => <article key={title} className="group rounded-3xl border border-[#e8e3f0] bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100"><span className="grid size-12 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9] transition group-hover:bg-[#6547d9] group-hover:text-white"><Icon size={22}/></span><h3 className="mt-5 text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-7 text-[#6f6a80]">{desc}</p></article>)}</div>
        </section>

        <section id="models" className="bg-[#17152b] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="mx-auto max-w-3xl text-center"><span className="text-sm font-bold text-[#b9aaff]">النظام بيتشكل على شغلك</span><h2 className="mt-3 text-3xl font-black md:text-4xl">سنتر كامل؟ ولا مدرس مستقل؟</h2><p className="mt-4 text-[#c9c5d8]">نفس المحرك، لكن التجربة والصلاحيات تتظبط حسب نموذج التشغيل من أول يوم.</p></div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-7"><Building2 className="size-8 text-[#b9aaff]"/><h3 className="mt-5 text-2xl font-extrabold">سنتر تعليمي</h3><p className="mt-2 leading-7 text-[#c9c5d8]">فروع، قاعات، فريق، صلاحيات، طلاب ومجموعات وتحصيل وتقارير تشغيلية كاملة.</p><ul className="mt-5 space-y-3 text-sm">{["فروع وقاعات", "فريق ودعوات وصلاحيات", "تشغيل مركزي لكل الفروع", "تقارير للإدارة"].map(item => <li key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#b9aaff]"/>{item}</li>)}</ul></article>
              <article className="rounded-3xl border border-[#7d67e8] bg-[#251f45] p-7"><GraduationCap className="size-8 text-[#b9aaff]"/><h3 className="mt-5 text-2xl font-extrabold">مدرس مستقل</h3><p className="mt-2 leading-7 text-[#c9c5d8]">واجهة أبسط للمدرس اللي محتاج مجموعاته وطلابه وحضوره وتحصيله من غير تعقيد السناتر.</p><ul className="mt-5 space-y-3 text-sm">{["مجموعات وطلاب", "حضور وتحصيل", "متابعة يومية بسيطة", "قابل للتوسع لسنتر لاحقًا"].map(item => <li key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#b9aaff]"/>{item}</li>)}</ul></article>
            </div>
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-7xl px-4 py-20 md:px-8"><div className="mx-auto max-w-3xl text-center"><span className="text-sm font-bold text-[#6547d9]">كل شخص يشوف اللي يخصه</span><h2 className="mt-3 text-3xl font-black md:text-4xl">نفس النظام، تجارب مختلفة حسب الدور</h2></div><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{roleCards.map((role,index) => <article key={role.title} className="rounded-3xl border border-[#e8e3f0] bg-white p-6"><span className="grid size-10 place-items-center rounded-xl bg-[#eeeaff] text-sm font-black text-[#6547d9]">0{index+1}</span><h3 className="mt-5 font-extrabold">{role.title}</h3><p className="mt-2 text-sm leading-7 text-[#6f6a80]">{role.desc}</p></article>)}</div></section>

        <section id="lms" className="mx-auto max-w-7xl px-4 pb-20 md:px-8"><div className="overflow-hidden rounded-[32px] border border-[#ded7f2] bg-gradient-to-l from-[#eeeaff] to-white p-8 md:p-12"><div className="grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-center"><div><span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6547d9]">مرحلة التوسع</span><h2 className="mt-5 text-3xl font-black md:text-4xl">ولما تكون جاهز تبيع كورسات Online… مش محتاج تغير النظام.</h2><p className="mt-4 max-w-2xl leading-8 text-[#625d70]">الـLMS منتج اختياري مستقل: Shared Academy أو Branded Academy باسمك ودومينك، مع كورسات وأكواد تفعيل واختبارات وتتبع تقدم.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{[[BookOpen,"كورسات وفيديو"],[TicketCheck,"أكواد تفعيل"],[Palette,"هوية ودومين مخصص"],[ShieldCheck,"صلاحيات وصول منفصلة"]].map(([Icon,label]) => <div key={String(label)} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[#eeeaff] text-[#6547d9]"><Icon size={18}/></span><b className="text-sm">{label}</b></div>)}</div></div></div></section>

        <section className="bg-white py-20"><div className="mx-auto max-w-4xl px-4 text-center md:px-8"><h2 className="text-3xl font-black md:text-4xl">ابدأ تنظيم شغلك من أول يوم</h2><p className="mt-4 text-[#6f6a80]">ابدأ بنظام الإدارة، وبعدها وسّع المنتج لما شغلك يحتاج.</p><Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#6547d9] px-7 py-4 font-bold text-white shadow-lg shadow-purple-200">ابدأ تجربتك <ArrowLeft size={17}/></Link></div></section>
      </main>

      <footer className="border-t border-[#e8e5ef] bg-white px-4 py-8 md:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row"><Logo/><p className="text-xs text-[#6f6a80]">© {new Date().getFullYear()} Smart Edu Center. جميع الحقوق محفوظة.</p></div></footer>
    </div>
  );
}
