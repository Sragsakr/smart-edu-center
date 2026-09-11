import capabilityCatalogData from "@/lib/entitlements/capability-catalog.json";
import { assertValidCapabilityCatalog } from "@/lib/entitlements/capability-catalog-rules.mjs";
import { capabilityKinds, type CapabilityKind } from "@/lib/entitlements/capability-kind";
import type { CapabilityDefinition } from "@/lib/entitlements/capability-definition";
import { productLevels, type ProductLevel } from "@/lib/tenant/product-level";

/**
 * كتالوج القدرات — مصدر الحقيقة الوحيد لتعريفات القدرات.
 *
 * البيانات في `capability-catalog.json` ليشترك فيها كود التطبيق وسكربت الـSeed من مصدر واحد،
 * وقواعد التحقق في `capability-catalog-rules.mjs` ليشتركا فيها أيضًا.
 *
 * جدول `capability_catalog` في قاعدة البيانات مرجعي للتقارير، وليس مصدر حقيقة ثانيًا.
 * المرجع: docs/PRODUCT_VISION.md §3.1 و docs/adr/0002.
 */

export type RawCapability = {
  key: string;
  kind: string;
  includedFromLevel: string | null;
  titleAr: string;
  descriptionAr: string;
  sortOrder: number;
};

const rawCapabilities: readonly RawCapability[] = capabilityCatalogData;

function isCapabilityKind(value: unknown): value is CapabilityKind {
  return typeof value === "string" && (capabilityKinds as readonly string[]).includes(value);
}

function isProductLevel(value: unknown): value is ProductLevel {
  return typeof value === "string" && (productLevels as readonly string[]).includes(value);
}

// التحقق يعمل عند تحميل الوحدة: أي كتالوج غير متسق يفشل مبكرًا وبرسالة واضحة.
assertValidCapabilityCatalog(rawCapabilities);

export const capabilityCatalog: readonly CapabilityDefinition[] = rawCapabilities.map((entry) => {
  if (!isCapabilityKind(entry.kind) || (entry.includedFromLevel !== null && !isProductLevel(entry.includedFromLevel))) {
    throw new Error(`capability catalog: untyped entry for "${entry.key}"`);
  }
  return {
    key: entry.key,
    kind: entry.kind,
    includedFromLevel: entry.includedFromLevel,
    titleAr: entry.titleAr,
    descriptionAr: entry.descriptionAr,
    sortOrder: entry.sortOrder,
  };
});

export function findCapability(key: string): CapabilityDefinition | undefined {
  return capabilityCatalog.find((capability) => capability.key === key);
}

export function isKnownCapability(key: string): boolean {
  return findCapability(key) !== undefined;
}

/** القدرات المضمّنة ابتداءً من مستوى معيّن، مرتبة حسب `sortOrder`. */
export function capabilitiesForLevel(level: ProductLevel): CapabilityDefinition[] {
  return capabilityCatalog
    .filter((capability) => capability.kind === "feature" && capability.includedFromLevel === level)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function addOnCapabilities(): CapabilityDefinition[] {
  return capabilityCatalog
    .filter((capability) => capability.kind === "addon")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
