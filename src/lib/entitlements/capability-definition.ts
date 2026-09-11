import type { CapabilityKind } from "@/lib/entitlements/capability-kind";
import type { ProductLevel } from "@/lib/tenant/product-level";

/** تعريف قدرة واحدة في الكتالوج. */
export type CapabilityDefinition = {
  /** المفتاح الثابت بصيغة `namespace.name` — لا يتغير بعد الإطلاق. */
  key: string;
  kind: CapabilityKind;
  /** المستوى الذي تبدأ منه القدرة المضمّنة؛ `null` لكل ما ليس `feature`. */
  includedFromLevel: ProductLevel | null;
  titleAr: string;
  descriptionAr: string;
  sortOrder: number;
};

/** قدرة ممنوحة فعليًا لمساحة عمل، مع حدودها ومصدرها. */
export type TenantEntitlement = {
  key: string;
  state: "active" | "pending" | "expired" | "revoked";
  source: "plan" | "addon" | "trial" | "manual" | "promotion";
  sourceRef: string | null;
  limits: Record<string, number>;
  effectiveFrom: string;
  effectiveTo: string | null;
};
