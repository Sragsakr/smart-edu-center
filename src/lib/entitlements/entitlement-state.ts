/**
 * حالة منح القدرة لمساحة عمل معيّنة.
 *
 * `active` هي الوحيدة التي تفتح الوصول؛ الباقي يُعامل كعدم وجود قدرة.
 */
export const entitlementStates = ["active", "pending", "expired", "revoked"] as const;

export type EntitlementState = (typeof entitlementStates)[number];

export const entitlementStateLabelsAr: Record<EntitlementState, string> = {
  active: "مفعّلة",
  pending: "بانتظار التفعيل",
  expired: "منتهية",
  revoked: "مسحوبة",
};
