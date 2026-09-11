/**
 * ربط البوابات بالقدرة التجارية التي تفتحها.
 *
 * القاعدة: وجود العلاقة في قاعدة البيانات لا يفتح البوابة وحده.
 * البوابة تُفتح بـ`Entitlement AND Relationship`، وغياب الاشتراك حالة واجهة
 * مقصودة تُشرح للمستخدم، وليست خطأ.
 *
 * المرجع: docs/PRODUCT_VISION.md §3 و docs/adr/0002.
 */
export const portalKinds = ["student", "guardian"] as const;
export type PortalKind = (typeof portalKinds)[number];

/** القدرة التي يجب أن تكون نشطة على مساحة العمل ليفتح البوابة. */
export const portalEntitlementKeys: Record<PortalKind, string> = {
  student: "platform.portal.student",
  guardian: "platform.portal.guardian",
};

/** المفتاح التجاري الذي يفتح بوابة معيّنة. */
export function portalEntitlementKey(kind: PortalKind): string {
  return portalEntitlementKeys[kind];
}

/**
 * هل يفتح هذا المستوى البوابة المطلوبة؟
 *
 * يُستخدم في الاختبارات وفي الواجهة للتوضيح، أما الفرض الفعلي فيبقى على الخادم
 * عبر قراءة `tenant_entitlements` قبل إرجاع أي بيانات.
 */
export function isPortalEntitled(kind: PortalKind, activeCapabilityKeys: Iterable<string>): boolean {
  const required = portalEntitlementKey(kind);
  for (const key of activeCapabilityKeys) {
    if (key === required) return true;
  }
  return false;
}

/** شرح يظهر للمستخدم عند غياب الاشتراك: ما ينقص وما الذي يضيفه. */
export const portalUpgradeCopy: Record<PortalKind, { title: string; explanation: string; requirement: string }> = {
  student: {
    title: "بوابة الطالب غير مفعّلة في هذه المساحة",
    explanation:
      "مساحة العمل هذه مشتركة في مستوى العمليات، وهو يدير الطلاب والحضور والتحصيل دون إصدار حسابات دخول للطلاب.",
    requirement: "لتفعيل بوابة الطالب، تحتاج المساحة إلى مستوى منصة الإدارة أو أعلى.",
  },
  guardian: {
    title: "بوابة ولي الأمر غير مفعّلة في هذه المساحة",
    explanation:
      "مساحة العمل هذه مشتركة في مستوى العمليات، وهو يحفظ بيانات أولياء الأمور للتواصل دون إصدار حسابات دخول لهم.",
    requirement: "لتفعيل بوابة ولي الأمر، تحتاج المساحة إلى مستوى منصة الإدارة أو أعلى.",
  },
};
