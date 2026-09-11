import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

import { assertValidCapabilityCatalog } from "../../src/lib/entitlements/capability-catalog-rules.mjs";

const { Client } = pg;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CATALOG_FILE = path.join(REPO_ROOT, "src", "lib", "entitlements", "capability-catalog.json");

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export class CapabilityCatalogSeedError extends Error {}

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new CapabilityCatalogSeedError(
      "DATABASE_URL is not set. The capability catalog seed needs an explicit target database.",
    );
  }
  return url;
}

async function readCatalog() {
  const catalog = JSON.parse(await readFile(CATALOG_FILE, "utf8"));
  assertValidCapabilityCatalog(catalog);
  return catalog;
}

/**
 * يطبّق كتالوج القدرات على قاعدة البيانات في Transaction واحدة.
 *
 * العملية Idempotent: تُحدّث الصفوف الموجودة، وتُضيف الجديدة، وتحذف ما أُزيل من الكتالوج.
 * الحذف محمي بـ`on delete restrict` من `tenant_entitlements`، فلا يمكن إزالة قدرة ما زالت ممنوحة لمساحة.
 *
 * @param {string} targetUrl
 * @param {ReadonlyArray<{key:string;kind:string;includedFromLevel:string|null;titleAr:string;descriptionAr:string;sortOrder:number}>} catalog
 */
export async function seedCapabilityCatalog(targetUrl = databaseUrl(), catalog = undefined) {
  const entries = catalog ?? (await readCatalog());
  const client = new Client({ connectionString: targetUrl });
  await client.connect();
  try {
    await client.query("begin");
    for (const entry of entries) {
      await client.query(
        `insert into public.capability_catalog (key, kind, included_from_level, title_ar, description_ar, sort_order)
         values ($1, $2::public.capability_kind, $3::public.product_level, $4, $5, $6)
         on conflict (key) do update set
           kind = excluded.kind,
           included_from_level = excluded.included_from_level,
           title_ar = excluded.title_ar,
           description_ar = excluded.description_ar,
           sort_order = excluded.sort_order`,
        [entry.key, entry.kind, entry.includedFromLevel, entry.titleAr, entry.descriptionAr, entry.sortOrder],
      );
    }

    const keys = entries.map((entry) => entry.key);
    await client.query(`delete from public.capability_catalog where key <> all($1::text[])`, [keys]);

    const counts = await client.query(
      `select
         count(*)::int as total,
         count(*) filter (where kind = 'feature')::int as features,
         count(*) filter (where kind = 'addon')::int as addons,
         count(*) filter (where kind = 'limit')::int as limits
       from public.capability_catalog`,
    );

    const expected = {
      total: entries.length,
      features: entries.filter((entry) => entry.kind === "feature").length,
      addons: entries.filter((entry) => entry.kind === "addon").length,
      limits: entries.filter((entry) => entry.kind === "limit").length,
    };
    const actual = counts.rows[0];

    if (
      actual.total !== expected.total ||
      actual.features !== expected.features ||
      actual.addons !== expected.addons ||
      actual.limits !== expected.limits
    ) {
      throw new CapabilityCatalogSeedError(
        `capability catalog reconciliation failed: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`,
      );
    }

    await client.query("commit");
    return { expected, actual };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const targetUrl = databaseUrl();
  const hostname = new URL(targetUrl).hostname;
  const allowRemote = process.argv.includes("--allow-remote");
  if (!LOOPBACK_HOSTS.has(hostname) && !allowRemote) {
    throw new CapabilityCatalogSeedError(
      `DATABASE_URL host "${hostname}" is not loopback. Re-run with --allow-remote when this is the intended environment.`,
    );
  }

  const { actual } = await seedCapabilityCatalog(targetUrl);
  console.log(
    `Capability catalog applied: ${actual.total} capabilities (${actual.features} feature, ${actual.addons} addon, ${actual.limits} limit).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
