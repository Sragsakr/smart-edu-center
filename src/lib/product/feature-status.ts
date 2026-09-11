/**
 * الحالة المعلنة لأي ميزة تُعرض للمستخدم.
 *
 * العقد: أي شاشة تعرض المنتج لعميل محتمل (Landing/Pricing) يجب أن تُميّز بصراحة
 * بين المتاح والمخطط، وألا تقدّم ميزة مخطط لها كأنها متاحة.
 * المرجع: docs/PRODUCT_VISION.md §6
 */
export const featureStatuses = ["available", "coming_soon", "planned"] as const;

export type FeatureStatus = (typeof featureStatuses)[number];

/** التسمية الكاملة المستخدمة في الشرح والتفاصيل. */
export const featureStatusLabels: Record<FeatureStatus, string> = {
  available: "متاح الآن",
  coming_soon: "قريبًا",
  planned: "مخطط له",
};

/** التسمية المختصرة المستخدمة داخل الـChips. */
export const featureStatusShortLabels: Record<FeatureStatus, string> = {
  available: "متاح",
  coming_soon: "قريبًا",
  planned: "مخطط",
};

/** معنى كل حالة، يُعرض في مفتاح الحالات أسفل الأقسام. */
export const featureStatusDescriptions: Record<FeatureStatus, string> = {
  available: "مبنية وتعمل في النسخة المنشورة حاليًا.",
  coming_soon: "داخل مرحلة تنفيذ معتمدة ولها Task فعلية في خطة التنفيذ.",
  planned: "داخل رؤية المنتج، ولم تبدأ مرحلة تنفيذها بعد.",
};
