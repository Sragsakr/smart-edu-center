/**
 * مصدر منح القدرة.
 *
 * `plan` تأتي من مستوى المنتج المشترى، والباقي يتطلب مرجعًا صريحًا (`sourceRef`)
 * حتى يكون كل منح فوق المستوى أو استثناء قابلًا للتتبع.
 */
export const entitlementSources = ["plan", "addon", "trial", "manual", "promotion"] as const;

export type EntitlementSource = (typeof entitlementSources)[number];

export const entitlementSourceLabelsAr: Record<EntitlementSource, string> = {
  plan: "مستوى المنتج",
  addon: "إضافة مشتراة",
  trial: "فترة تجريبية",
  manual: "منح يدوي",
  promotion: "عرض ترويجي",
};
