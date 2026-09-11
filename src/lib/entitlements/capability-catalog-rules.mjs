/**
 * قواعد كتالوج القدرات — مصدر واحد للتحقق، يشترك فيه كود التطبيق وسكربت الـSeed.
 *
 * مكتوب بـJavaScript صريح ليمكن استيراده من TypeScript (عبر allowJs) ومن سكربتات Node
 * بلا أي خطوة بناء، فلا تتكرر قواعد التحقق في مكانين.
 */

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const CAPABILITY_KINDS = ["feature", "addon", "limit"];

const PRODUCT_LEVELS = ["operations", "management_platform", "learning_platform"];

/**
 * @typedef {object} RawCapability
 * @property {string} key
 * @property {string} kind
 * @property {string | null} includedFromLevel
 * @property {string} titleAr
 * @property {string} descriptionAr
 * @property {number} sortOrder
 */

/**
 * يتحقق أن الكتالوج متسق ويرفع خطأ واضحًا عند أي انحراف.
 *
 * القاعدة الملزمة: `feature` لها `includedFromLevel` دائمًا، وغيرها بلا مستوى،
 * والمفاتيح فريدة وتتبع صيغة `namespace.name`.
 *
 * @param {ReadonlyArray<RawCapability>} entries
 * @returns {void}
 */
export function assertValidCapabilityCatalog(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("capability catalog: expected a non-empty array");
  }

  const seen = new Set();
  for (const entry of entries) {
    if (!KEY_PATTERN.test(entry.key)) {
      throw new Error(`capability catalog: invalid key "${entry.key}"`);
    }
    if (seen.has(entry.key)) {
      throw new Error(`capability catalog: duplicate key "${entry.key}"`);
    }
    seen.add(entry.key);

    if (!CAPABILITY_KINDS.includes(entry.kind)) {
      throw new Error(`capability catalog: unsupported kind for "${entry.key}"`);
    }
    if (entry.includedFromLevel !== null && !PRODUCT_LEVELS.includes(entry.includedFromLevel)) {
      throw new Error(`capability catalog: unsupported level for "${entry.key}"`);
    }
    if ((entry.kind === "feature") !== (entry.includedFromLevel !== null)) {
      throw new Error(
        `capability catalog: "feature" must define includedFromLevel and nothing else may (key "${entry.key}")`,
      );
    }
    if (typeof entry.titleAr !== "string" || entry.titleAr.trim().length < 2) {
      throw new Error(`capability catalog: missing Arabic title for "${entry.key}"`);
    }
    if (typeof entry.descriptionAr !== "string" || entry.descriptionAr.trim().length < 2) {
      throw new Error(`capability catalog: missing Arabic description for "${entry.key}"`);
    }
    if (!Number.isInteger(entry.sortOrder)) {
      throw new Error(`capability catalog: sortOrder must be an integer (key "${entry.key}")`);
    }
  }
}

export { CAPABILITY_KINDS, KEY_PATTERN, PRODUCT_LEVELS };
