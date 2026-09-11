/**
 * البُعد الأول: نوع العميل (Customer Type).
 *
 * يحدد شكل الكتالوج والتنقل والتنظيم فقط.
 * لا يمنح ولا يمنع أي ميزة — القرار التجاري يتم عبر طبقة الـEntitlement.
 * المرجع: docs/PRODUCT_VISION.md §1 و docs/adr/0001.
 */
export const tenantTypes = ["teacher", "center"] as const;

export type TenantType = (typeof tenantTypes)[number];

export const tenantTypeLabelsAr: Record<TenantType, string> = {
  teacher: "مدرس مستقل",
  center: "سنتر تعليمي",
};

export function isTenantType(value: unknown): value is TenantType {
  return typeof value === "string" && (tenantTypes as readonly string[]).includes(value);
}
