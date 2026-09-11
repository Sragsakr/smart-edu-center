import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Boxes,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers,
  LineChart,
  MessageCircle,
  Palette,
  QrCode,
  School,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import type { FeatureStatus } from "@/lib/product/feature-status";

/**
 * مصدر الحقيقة الوحيد لمحتوى صفحة الرؤية على الـLanding Page.
 * أي تغيير في نموذج المنتج يبدأ من docs/PRODUCT_VISION.md ثم يُنعكس هنا.
 */

export type RoadmapItem = { label: string; status: FeatureStatus };

export type CustomerType = {
  key: "teacher" | "center";
  nameAr: string;
  desc: string;
  catalogShape: string;
  icon: LucideIcon;
  examples: string[];
};

export type ProductLevelKey = "operations" | "management_platform" | "learning_platform";

export type ProductLevel = {
  key: ProductLevelKey;
  nameAr: string;
  nameEn: string;
  tagline: string;
  status: FeatureStatus;
  stage: string;
  includes: string[];
  adds: RoadmapItem[];
};

export type CatalogStep = { label: string; hint: string };
export type CatalogPath = { label: string; audience: string; steps: CatalogStep[] };
export type CatalogExample = { key: "teacher" | "center"; title: string; note: string; tree: string[] };

export type HostingMode = {
  key: "hosted" | "white_label";
  nameAr: string;
  hostname: string;
  desc: string;
  status: FeatureStatus;
  icon: LucideIcon;
};

/** البُعد الأول: نوع العميل — يحدد شكل الكتالوج والتنقل فقط. */
export const customerTypes: CustomerType[] = [
  {
    key: "teacher",
    nameAr: "مدرس مستقل",
    desc: "يدير مجموعاته وطلابه وحضوره وتحصيله ومحتواه بنفسه، بدون فروع أو فريق موظفين معقّد.",
    catalogShape: "كتالوج مسطّح: صف ← مواد/مقررات يدرّسها المدرس.",
    icon: GraduationCap,
    examples: ["الصف العاشر ← الجبر", "الصف العاشر ← الهندسة", "الصف العاشر ← حساب المثلثات"],
  },
  {
    key: "center",
    nameAr: "سنتر تعليمي",
    desc: "عدة مراحل وصفوف ومواد، وعدة مدرسين للمادة نفسها، وفروع وقاعات وفريق بأدوار.",
    catalogShape: "كتالوج متعدد المسارات: مرحلة ← صف ← مادة ← مدرس ← مقرر.",
    icon: Building2,
    examples: ["الصف العاشر ← رياضيات ← أ. أحمد ← الجبر", "نفس المادة ← أ. منى ← الجبر أيضًا"],
  },
];

/** البُعد الثاني: مستوى المنتج — يحدد ما هو مشتراة فقط. */
export const productLevels: ProductLevel[] = [
  {
    key: "operations",
    nameAr: "العمليات",
    nameEn: "Operations",
    tagline: "إدارة البيزنس الداخلية فقط — نقطة الدخول للسوق.",
    status: "coming_soon",
    stage: "PHASE-03 → PHASE-07",
    includes: [
      "الطلاب وأولياء الأمور وبيانات الاتصال",
      "المجموعات والجداول والقاعات والفروع",
      "الحضور والغياب",
      "الرسوم والأقساط والمدفوعات والمتأخرات",
      "المصروفات والتقارير التشغيلية والمالية",
      "الفريق والمدرسون والصلاحيات",
    ],
    adds: [
      { label: "الطلاب وأولياء الأمور بدون حسابات على المنصة", status: "coming_soon" },
    ],
  },
  {
    key: "management_platform",
    nameAr: "منصة الإدارة",
    nameEn: "Management Platform",
    tagline: "تشغيل كامل + منصة رقمية حقيقية للطلاب وأولياء الأمور والمدرسين.",
    status: "planned",
    stage: "PHASE-08 → PHASE-11 و PHASE-14",
    includes: ["كل ما في مستوى العمليات"],
    adds: [
      { label: "حسابات الطلاب وأولياء الأمور", status: "planned" },
      { label: "بوابة الطالب وبوابة ولي الأمر وبوابة المدرس", status: "planned" },
      { label: "الواجبات والتسليمات", status: "planned" },
      { label: "الاختبارات والنتائج والتقييم", status: "planned" },
      { label: "الملفات والمواد ومتابعة تقدم الطالب", status: "planned" },
      { label: "الإشعارات والمتابعة التعليمية", status: "planned" },
    ],
  },
  {
    key: "learning_platform",
    nameAr: "منصة التعلم الكاملة",
    nameEn: "Full Learning Platform",
    tagline: "كل ما سبق + التعليم الرقمي بالكورسات والفيديو.",
    status: "planned",
    stage: "PHASE-12 → PHASE-14",
    includes: ["كل ما في منصة الإدارة"],
    adds: [
      { label: "الكورسات والدروس", status: "planned" },
      { label: "محتوى الفيديو والمواد الرقمية", status: "planned" },
      { label: "الوصول للمحتوى والصلاحيات", status: "planned" },
      { label: "التسجيل في الكورسات وتتبّع التقدم", status: "planned" },
      { label: "الجلسات المباشرة", status: "planned" },
    ],
  },
];

/** الإضافات المستقلة عن المستوى، تُشترى منفصلة. */
export const addOns = [
  "الدومين المخصص",
  "White-label كامل",
  "الفيديو والتخزين",
  "WhatsApp",
  "SMS",
  "مساحة تخزين إضافية",
  "فروع إضافية",
  "مستخدمون إضافيون",
  "تقارير متقدمة",
];

/** مسارات التنقل والفلترة الواجب دعمها في الكتالوج. */
export const catalogPaths: CatalogPath[] = [
  {
    label: "مرحلة ← صف ← مادة ← مدرس ← مقرر",
    audience: "الأساسي للسنتر",
    steps: [
      { label: "مرحلة", hint: "ابتدائي / إعدادي / ثانوي" },
      { label: "صف", hint: "الصف العاشر" },
      { label: "مادة", hint: "رياضيات" },
      { label: "مدرس", hint: "أ. أحمد" },
      { label: "مقرر", hint: "الجبر" },
    ],
  },
  {
    label: "مرحلة ← صف ← مدرس ← مقرراته",
    audience: "السنتر والمدرس المستقل",
    steps: [
      { label: "مرحلة", hint: "ثانوي" },
      { label: "صف", hint: "الصف العاشر" },
      { label: "مدرس", hint: "أ. منى" },
      { label: "مقرراته", hint: "الجبر، الهندسة" },
    ],
  },
  {
    label: "كتالوج عام بفلاتر متعددة",
    audience: "كل الأبعاد معًا",
    steps: [
      { label: "مرحلة", hint: "فلتر" },
      { label: "صف", hint: "فلتر" },
      { label: "مادة", hint: "فلتر" },
      { label: "مدرس", hint: "فلتر" },
      { label: "السعر", hint: "فلتر" },
    ],
  },
];

export const catalogExamples: CatalogExample[] = [
  {
    key: "teacher",
    title: "مدرس مستقل",
    note: "نفس المدرس يدرّس أكثر من مقرر داخل الصف نفسه.",
    tree: ["الصف العاشر", "├── الجبر", "├── الهندسة", "└── حساب المثلثات"],
  },
  {
    key: "center",
    title: "سنتر تعليمي",
    note: "المادة الواحدة قد يدرّسها أكثر من مدرس، ولكل مدرس مقرراته.",
    tree: [
      "الصف العاشر",
      "└── الرياضيات",
      "    ├── أ. أحمد",
      "    │   ├── الجبر",
      "    │   └── الهندسة",
      "    └── أ. منى",
      "        └── الجبر",
    ],
  },
];

/** وضعا الاستضافة — نفس الكود ونفس الـruntime في الحالتين. */
export const hostingModes: HostingMode[] = [
  {
    key: "hosted",
    nameAr: "مستضاف على سبورتي",
    hostname: "teacher-name.saboraty.online",
    desc: "تبدأ فورًا على نطاق فرعي خاص بمساحتك على منصة سبورتي، دون أي إعداد بنية تحتية.",
    status: "coming_soon",
    icon: Boxes,
  },
  {
    key: "white_label",
    nameAr: "هوية كاملة ودومين مخصص",
    hostname: "academy.com",
    desc: "اسمك وشعارك وألوانك ودومينك الخاص على نفس التطبيق ونفس الـruntime — لا نسخة منفصلة ولا deployment منفصل.",
    status: "planned",
    icon: Palette,
  },
];

/** ضمانات الترقية — لا تُنشئ مساحة جديدة ولا تنقل بيانات. */
export const upgradeGuarantees = [
  "نفس المساحة ونفس البيانات تستمر كما هي",
  "لا حاجة لإنشاء حساب مساحة جديد",
  "لا نقل بيانات ولا إعادة إدخال",
  "لا تغيير في النظام أو إعادة بناء",
  "التخفيض يوقف الوصول فقط ولا يحذف بياناتك",
];

export const upgradePath = [
  { step: "العمليات", status: "coming_soon" as FeatureStatus },
  { step: "منصة الإدارة", status: "planned" as FeatureStatus },
  { step: "منصة التعلم الكاملة", status: "planned" as FeatureStatus },
  { step: "هوية كاملة ودومين مخصص", status: "planned" as FeatureStatus },
];

/** شريط الحالة الصريح أعلى الصفحة — الحقيقة كما هي اليوم. */
export const currentStateSummary: RoadmapItem[] = [
  { label: "تسجيل المساحة ومراجعتها من إدارة المنصة", status: "available" },
  { label: "الدخول الآمن وإدارة الجلسات والدعوات والفريق", status: "available" },
  { label: "بوابتا الطالب وولي الأمر (قراءة أساسية)", status: "available" },
  { label: "الكتالوج والجداول والحضور والتحصيل", status: "coming_soon" },
  { label: "الكورسات والفيديو والاختبارات", status: "planned" },
];

/** ما يليها من قدرات قادمة فعليًا في خطة التنفيذ. */
export const workingOn: string[] = [
  "إعدادات المساحة والكتالوج الأكاديمي والمقررات القابلة للبيع",
  "المجموعات والجداول ومنع التعارض",
  "الطلاب وأولياء الأمور والتسجيل في العروض",
  "الحضور والغياب",
  "الرسوم والأقساط والمدفوعات",
];

export const painPoints = [
  "دفاتر وشيتات منفصلة لكل جزء من الشغل",
  "رسائل واتساب مبعثرة ومعلومات صعب تلاقيها",
  "متأخرات وتحصيل غير واضحين لحظة بلحظة",
  "حسابات مشتركة تخلي الصلاحيات والمسؤولية ضايعين",
];

export type UseCase = { icon: LucideIcon; title: string; desc: string; status: FeatureStatus; level: string };

export const useCases: UseCase[] = [
  {
    icon: CalendarCheck,
    title: "الحضور في ثواني",
    desc: "حضور يومي واضح مع سجل كامل لكل طالب ومسار تصحيح موثق.",
    status: "coming_soon",
    level: "العمليات",
  },
  {
    icon: Wallet,
    title: "فلوسك واضحة",
    desc: "فواتير ودفعات ومتأخرات وأقساط وتقارير مالية في نفس النظام.",
    status: "coming_soon",
    level: "العمليات",
  },
  {
    icon: Users,
    title: "كل طالب له ملف كامل",
    desc: "بياناته وولي أمره ومجموعاته وحضوره وتحصيله في مسار واحد.",
    status: "coming_soon",
    level: "العمليات",
  },
  {
    icon: UsersRound,
    title: "فريقك بصلاحيات واضحة",
    desc: "مالك ومشرف ومدرس واستقبال ومحاسب؛ كل شخص يرى ما يخصه فقط.",
    status: "available",
    level: "العمليات",
  },
  {
    icon: MessageCircle,
    title: "ولي الأمر والطالب متابعين",
    desc: "بوابات منفصلة للحضور والتحصيل والمحتوى والنتائج والتنبيهات.",
    status: "planned",
    level: "منصة الإدارة",
  },
  {
    icon: LineChart,
    title: "قرارك مبني على أرقام",
    desc: "مؤشرات تشغيلية ومالية وتعليمية تكشف المشكلة قبل أن تكبر.",
    status: "planned",
    level: "منصة الإدارة",
  },
];

export type WorkflowStep = { step: string; title: string; desc: string; status: FeatureStatus };

export const workflow: WorkflowStep[] = [
  {
    step: "01",
    title: "ابنِ الكتالوج",
    desc: "مراحل وصفوف ومواد ومدرسون ومقررات، ثم عروض قابلة للبيع بالسعر والسعة.",
    status: "coming_soon",
  },
  {
    step: "02",
    title: "سجّل الطالب",
    desc: "بياناته وولي أمره وتسجيله في العرض مع منع التكرار والسعة الزائدة.",
    status: "coming_soon",
  },
  {
    step: "03",
    title: "نظّم التشغيل",
    desc: "مجموعات وجداول وحصص بدون تعارض في المدرس أو القاعة أو الوقت.",
    status: "coming_soon",
  },
  {
    step: "04",
    title: "شغّل اليوم",
    desc: "حضور وتحصيل ومتابعة وتصحيحات موثقة من نفس المكان.",
    status: "coming_soon",
  },
  {
    step: "05",
    title: "علّم Online",
    desc: "كورسات ودروس وفيديو واختبارات داخل نفس تجربة الطالب.",
    status: "planned",
  },
  {
    step: "06",
    title: "اتخذ قرار",
    desc: "تقارير تشغيل ومال وتعليم وتسويات المدرسين بدل التخمين.",
    status: "planned",
  },
];

export type RoleCard = { title: string; desc: string; status: FeatureStatus };

export const roleCards: RoleCard[] = [
  {
    title: "صاحب السنتر",
    desc: "الصورة الكاملة: الفروع والفريق والحضور والتحصيل والتعليم والتقارير.",
    status: "coming_soon",
  },
  {
    title: "الاستقبال والإدارة",
    desc: "تسجيل الطلاب والمجموعات والجداول والتحصيل والعمليات اليومية.",
    status: "coming_soon",
  },
  {
    title: "المحاسب",
    desc: "الفواتير والدفعات والخزنة والمتأخرات والتسويات والمراجعة.",
    status: "coming_soon",
  },
  {
    title: "المدرس",
    desc: "عروضه ومجموعاته وطلابه وحضوره ومحتواه ومستحقاته.",
    status: "planned",
  },
  {
    title: "ولي الأمر",
    desc: "أبناؤه والحضور والتحصيل والنتائج والتنبيهات من بوابة واحدة.",
    status: "planned",
  },
  {
    title: "الطالب",
    desc: "جدوله وحضوره ومحتواه وفيديوهاته واختباراته ونتائجه.",
    status: "planned",
  },
];

export type CapabilityGroup = {
  key: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  items: RoadmapItem[];
};

/** خريطة القدرات الكاملة بالمستويات والحالة الحقيقية لكل بند. */
export const roadmapGroups: CapabilityGroup[] = [
  {
    key: "workspace",
    title: "مساحة العمل والكتالوج",
    desc: "الأساس الذي يُبنى عليه كل شيء: من إعدادات المساحة حتى عرض قابل للبيع.",
    icon: School,
    items: [
      { label: "مساحة عمل للسنتر أو المدرس المستقل", status: "available" },
      { label: "فريق ودعوات وأدوار بصلاحيات", status: "available" },
      { label: "إعدادات المساحة: العملة والمنطقة الزمنية واللغة", status: "coming_soon" },
      { label: "فروع وقاعات وسعة استيعابية", status: "coming_soon" },
      { label: "مراحل وصفوف ومواد", status: "coming_soon" },
      { label: "مدرسون كسجلات مستقلة عن حسابات الدخول", status: "coming_soon" },
      { label: "مقررات وربط أكثر من مدرس بالمقرر", status: "coming_soon" },
      { label: "عروض قابلة للبيع: مقرر + مدرس + فرع + قاعة + سعر + سعة", status: "coming_soon" },
      { label: "كتالوج عام بفلاتر المرحلة والصف والمادة والمدرس والسعر", status: "coming_soon" },
    ],
  },
  {
    key: "students",
    title: "الطلاب وأولياء الأمور",
    desc: "رحلة الطالب كاملة من التسجيل حتى تاريخ التعامل معه.",
    icon: Users,
    items: [
      { label: "ملف طالب كامل وكود فريد داخل المساحة", status: "coming_soon" },
      { label: "ولي أمر واحد أو أكثر وربط أكثر من ابن", status: "coming_soon" },
      { label: "جهة اتصال أساسية وعلاقات القرابة", status: "coming_soon" },
      { label: "تسجيل الطالب في العرض مع منع التكرار والسعة الزائدة", status: "coming_soon" },
      { label: "استيراد الطلاب على مراحل مع مراجعة قبل الاعتماد", status: "coming_soon" },
      { label: "بحث سريع وفلاتر وتقسيم صفحات", status: "coming_soon" },
      { label: "مسار زمني للحضور والتحصيل والتقييم", status: "coming_soon" },
      { label: "دمج السجلات المكررة بدون فقد التاريخ", status: "coming_soon" },
    ],
  },
  {
    key: "attendance",
    title: "الحضور والغياب",
    desc: "حضور سريع مع مراجعة وتصحيح موثق ومتابعة لولي الأمر.",
    icon: QrCode,
    items: [
      { label: "حضور مجموعة كاملة في عملية واحدة", status: "coming_soon" },
      { label: "QR ورمز الطالب لتسجيل الحضور", status: "coming_soon" },
      { label: "منع تكرار حضور الطالب لنفس الحصة", status: "coming_soon" },
      { label: "حاضر / غائب / متأخر / بعذر", status: "coming_soon" },
      { label: "تصحيح الحضور مع القديم والجديد والسبب والموافق", status: "coming_soon" },
      { label: "سجل تدقيق لكل تعديل", status: "coming_soon" },
      { label: "تنبيهات بعد تثبيت الحضور", status: "planned" },
    ],
  },
  {
    key: "finance",
    title: "التحصيل والفواتير",
    desc: "من الرسوم الدراسية حتى التسوية والمراجعة المالية.",
    icon: Wallet,
    items: [
      { label: "خطط رسوم دراسية وعدد حصص", status: "coming_soon" },
      { label: "أقساط واشتراكات وحالات واضحة", status: "coming_soon" },
      { label: "إنشاء فواتير تلقائي بدون تكرار", status: "coming_soon" },
      { label: "دفع كامل أو جزئي ومنع التحصيل الزائد بالخطأ", status: "coming_soon" },
      { label: "خصومات وإشعارات دائنة واسترداد", status: "coming_soon" },
      { label: "تسلسل إيصالات لكل فرع", status: "coming_soon" },
      { label: "ورديات كاشير وتسوية الخزنة", status: "coming_soon" },
      { label: "تقارير أعمار الديون والمتأخرات", status: "coming_soon" },
      { label: "مدفوعات إلكترونية ومطابقة التحصيل", status: "planned" },
    ],
  },
  {
    key: "portals",
    title: "البوابات والتجربة حسب الدور",
    desc: "كل مستخدم يدخل على تجربة تناسب علاقته ودوره فقط.",
    icon: ShieldCheck,
    items: [
      { label: "بوابة الطالب (قراءة أساسية لبياناته وحضوره واشتراكاته)", status: "available" },
      { label: "بوابة ولي الأمر (قراءة أساسية لأبنائه المصرّح لهم)", status: "available" },
      { label: "تبديل السياق لمن لديه أكثر من علاقة", status: "available" },
      { label: "فتح البوابات مرتبط باشتراك المساحة في الميزة", status: "coming_soon" },
      { label: "لوحة إدارة من بيانات حقيقية", status: "coming_soon" },
      { label: "بوابة المدرس", status: "planned" },
      { label: "تطبيق ويب مثبّت ويعمل بلا اتصال للهيكل فقط", status: "planned" },
      { label: "صلاحيات حسب الدور والفعل وليس مجرد إخفاء شاشات", status: "coming_soon" },
    ],
  },
  {
    key: "learning",
    title: "التعلم والمحتوى",
    desc: "تحويل المنصة من تشغيل فقط إلى تجربة تعليمية كاملة.",
    icon: BookOpen,
    items: [
      { label: "كورسات ووحدات ودروس ومواد تعليمية", status: "planned" },
      { label: "محتوى فيديو وتشغيل محمي بروابط موقعة", status: "planned" },
      { label: "صلاحيات ووصول للمحتوى حسب الاشتراك والتسجيل", status: "planned" },
      { label: "تتبّع تقدم الطالب داخل الكورس", status: "planned" },
      { label: "جلسات مباشرة مرتبطة بالطالب والمجموعة", status: "planned" },
      { label: "حماية المحتوى بعلامة تحمل اسم الطالب", status: "planned" },
    ],
  },
  {
    key: "assessment",
    title: "الاختبارات والتقييم",
    desc: "قياس فعلي لتقدم الطالب بدل الاعتماد على الحضور فقط.",
    icon: ClipboardCheck,
    items: [
      { label: "بنك أسئلة وتصنيفات ومستويات صعوبة", status: "planned" },
      { label: "نسخ وإصدارات للاختبار بدل تعديل نتائج قديمة", status: "planned" },
      { label: "محاولات بوقت محدد على الخادم وحفظ الإجابات", status: "planned" },
      { label: "تصحيح آلي وإرسال النتائج", status: "planned" },
      { label: "نتائج وتقارير للطالب وولي الأمر والمدرس", status: "planned" },
      { label: "واجبات وتسليمات وملفات خاصة", status: "planned" },
    ],
  },
  {
    key: "comms",
    title: "التواصل والإشعارات",
    desc: "المعلومة تتحول تلقائيًا لتنبيه بدل المتابعة اليدوية.",
    icon: MessageCircle,
    items: [
      { label: "صندوق إشعارات داخل التطبيق وحالة القراءة", status: "planned" },
      { label: "قوالب رسائل ونسخ وإصدارات ومعاينة واعتماد", status: "planned" },
      { label: "إرسال موثوق يمنع ضياع الرسائل أو تكرارها", status: "planned" },
      { label: "قناة WhatsApp", status: "planned" },
      { label: "قناة SMS والبريد الإلكتروني", status: "planned" },
      { label: "موافقة المستخدم وإلغاء الاشتراك وحفظ السجل", status: "planned" },
    ],
  },
  {
    key: "teachers",
    title: "المدرسون والتسويات",
    desc: "إدارة العلاقة التشغيلية والمالية مع المدرس داخل نفس النظام.",
    icon: GraduationCap,
    items: [
      { label: "ملف مدرس مرتبط اختياريًا بحساب دخول", status: "coming_soon" },
      { label: "عقود وآليات احتساب مستحقات بنسخ متعددة", status: "planned" },
      { label: "تسويات حسب الحصص أو النسب أو القواعد المتفق عليها", status: "planned" },
      { label: "سجل مستحقات ومراجعة واعتماد وصرف", status: "planned" },
      { label: "تقارير أداء وتشغيل للمدرس وعروضه", status: "planned" },
    ],
  },
  {
    key: "reports",
    title: "التقارير والإدارة",
    desc: "صورة واحدة تجمع التشغيل والمال والتعليم.",
    icon: LineChart,
    items: [
      { label: "تقارير المنصة للمشرف العام", status: "available" },
      { label: "لوحة تشغيلية يومية للمساحة", status: "planned" },
      { label: "تقارير الحضور والطلاب والمجموعات", status: "planned" },
      { label: "تقارير التحصيل والمتأخرات والخزنة", status: "planned" },
      { label: "تقارير التعليم والتقدم والاختبارات", status: "planned" },
      { label: "فلاتر حسب الفرع والمدرس والمرحلة والمادة والفترة", status: "planned" },
      { label: "تصدير من الخادم بحدود وصلاحيات وسجل تدقيق", status: "planned" },
    ],
  },
  {
    key: "saas",
    title: "المنصة كمنتج",
    desc: "سبورتي نفسها منتج قابل للتوسع يخدم عددًا كبيرًا من السناتر والمدرسين.",
    icon: Layers,
    items: [
      { label: "تسجيل المساحة ومراجعة الطلب وقبوله", status: "available" },
      { label: "إدارة المساحات والمستخدمين من لوحة المنصة", status: "available" },
      { label: "استعادة كلمة المرور عبر مراجعة إدارة المنصة", status: "available" },
      { label: "الطبقة التجارية: المستويات والاشتراكات والقدرات", status: "coming_soon" },
      { label: "إضافات مستقلة: الدومين المخصص والهوية والقنوات", status: "planned" },
      { label: "اشتراكات المنصة والتجديد والفواتير", status: "planned" },
      { label: "دعم مؤقت ومقيّد بوقت وبسجل تدقيق", status: "planned" },
    ],
  },
  {
    key: "security",
    title: "الأمان والاستمرارية",
    desc: "البنية من البداية معمولة لتكبر بدون فقد السيطرة.",
    icon: FileText,
    items: [
      { label: "دخول وكلمات مرور مخزّنة كبصمة مشتقة وجلسات موقعة", status: "available" },
      { label: "عزل بيانات المساحات بقيود قاعدة البيانات واختبارات عزل", status: "available" },
      { label: "سجلات تدقيق للعمليات الحساسة", status: "available" },
      { label: "بناء وتحقق آلي مستمر مع فحوص أسرار وترحيل", status: "available" },
      { label: "نسخ احتياطي مشفّر خارج السيرفر مع خطة استعادة", status: "planned" },
      { label: "مراقبة وتنبيهات وتتبّع أخطاء مع حجب البيانات الشخصية", status: "planned" },
      { label: "اختبارات حمل وتجربة استعادة دورية قبل الإطلاق", status: "planned" },
    ],
  },
];

export const productValueHighlights = [
  { icon: BookOpen, label: "تعليم رقمي", status: "planned" as FeatureStatus },
  { icon: ClipboardCheck, label: "اختبارات وتقييم", status: "planned" as FeatureStatus },
  { icon: Palette, label: "هوية مخصصة", status: "planned" as FeatureStatus },
  { icon: MessageCircle, label: "تواصل آلي", status: "planned" as FeatureStatus },
];
