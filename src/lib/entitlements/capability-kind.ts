/**
 * نوع القدرة في كتالوج القدرات.
 *
 * - `feature`: قدرة مضمّنة داخل مستوى منتج ويجب أن تحمل `includedFromLevel`.
 * - `addon`: قدرة تُشترى منفصلة عن المستوى ويمكن تفعيلها فوق أي مستوى.
 * - `limit`: سقف استخدام قابل للقياس (طلاب/فروع/موظفون/تخزين) لا يُمنح بذاته.
 */
export const capabilityKinds = ["feature", "addon", "limit"] as const;

export type CapabilityKind = (typeof capabilityKinds)[number];
