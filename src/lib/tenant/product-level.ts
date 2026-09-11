/**
 * البُعد الثاني: مستوى المنتج (Product Level).
 *
 * يحدد ما هو مشتراة ومتاح. لا يغيّر شكل الكتالوج.
 * الترقية بين المستويات لا تُنشئ مساحة جديدة ولا تنقل بيانات.
 * المرجع: docs/PRODUCT_VISION.md §2 و docs/adr/0001.
 */
export const productLevels = ["operations", "management_platform", "learning_platform"] as const;

export type ProductLevel = (typeof productLevels)[number];

export const productLevelLabelsAr: Record<ProductLevel, string> = {
  operations: "العمليات",
  management_platform: "منصة الإدارة",
  learning_platform: "منصة التعلم الكاملة",
};

export const productLevelDescriptionsAr: Record<ProductLevel, string> = {
  operations:
    "إدارة البيزنس الداخلية فقط: الطلاب والمجموعات والجداول والحضور والرسوم والأقساط والمدفوعات والمتأخرات والمصروفات والتقارير. لا يحتاج الطلاب أو أولياء الأمور حسابًا على المنصة.",
  management_platform:
    "كل ما في العمليات + حسابات وبوابات للطلاب وأولياء الأمور والمدرسين، والواجبات والاختبارات والنتائج والملفات ومتابعة التقدم.",
  learning_platform:
    "كل ما في منصة الإدارة + الكورسات والدروس ومحتوى الفيديو والتسجيل في الكورسات وتتبع تقدم التعلم الرقمي.",
};

/** ترتيب المستويات من الأقل إلى الأعلى — للترقية والتخفيض والمقارنة. */
export const productLevelRank: Record<ProductLevel, number> = {
  operations: 1,
  management_platform: 2,
  learning_platform: 3,
};

export function isProductLevel(value: unknown): value is ProductLevel {
  return typeof value === "string" && (productLevels as readonly string[]).includes(value);
}

/** هل يغطي المستوى المطلوب المستوى المطلوب مقارنةً به؟ (يشمل المستوى نفسه). */
export function levelIncludes(level: ProductLevel, required: ProductLevel): boolean {
  return productLevelRank[level] >= productLevelRank[required];
}
