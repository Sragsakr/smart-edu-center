import { capabilityCatalog } from "@/lib/entitlements/capability-catalog";
import { levelIncludes, productLevels, type ProductLevel } from "@/lib/tenant/product-level";

/**
 * الاشتقاق الوحيد لقدرات المستوى.
 *
 * أي قدرة `feature` لها `includedFromLevel` تُمنح لكل مستوى يغطي ذلك المستوى،
 * لأن كل مستوى يشمل ما قبله. لا تُكرَّر هذه القائمة في أي مكان آخر.
 * المرجع: docs/PRODUCT_VISION.md §2 و docs/adr/0002.
 */
export function defaultEntitlementsForLevel(level: ProductLevel): string[] {
  return capabilityCatalog
    .filter(
      (capability) =>
        capability.kind === "feature" &&
        capability.includedFromLevel !== null &&
        levelIncludes(level, capability.includedFromLevel),
    )
    .map((capability) => capability.key)
    .sort();
}

/** كل مفاتيح القدرات المضمّنة في أي مستوى — لتمييزها عن الإضافات. */
export function planCapabilityKeys(): string[] {
  return productLevels.flatMap((level) => defaultEntitlementsForLevel(level)).filter(unique);
}

function unique(value: string, index: number, all: string[]): boolean {
  return all.indexOf(value) === index;
}
