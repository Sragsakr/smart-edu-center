import "server-only";

import type { SqlExecutor } from "@/lib/database/sql-executor";

/**
 * قراءة الاستحقاقات الفعلية لمساحة عمل.
 *
 * مصدر الحقيقة هو `tenant_entitlements` مع `tenants.product_level`، ولا يُبنى
 * أي قرار تجاري على `tenant_type`. القدرة تُعدّ نشطة فقط إذا كانت حالتها `active`
 * وداخل نافذة فعاليتها — وهذا يجعل الانتهاء والسحب والاستثناء التجاري كلها ممثلة
 * ببيانات لا بشروط متناثرة في الكود.
 *
 * المرجع: docs/adr/0002.
 */

type EntitlementRow = { capability_key: string };

/**
 * مفاتيح القدرات النشطة لمساحة عمل — قراءة محدودة (سقف صريح) ولا تُصدر صفوفًا زائدة.
 */
export async function activeEntitlementKeys(sql: SqlExecutor, tenantId: string): Promise<Set<string>> {
  const result = await sql.query<EntitlementRow>(
    `select capability_key
     from public.tenant_entitlements
     where tenant_id = $1
       and state = 'active'
       and effective_from <= now()
       and (effective_to is null or effective_to > now())
     order by capability_key
     limit 500`,
    [tenantId],
  );
  return new Set(result.rows.map((row) => row.capability_key));
}

/** هل المساحة تملك قدرة معيّنة نشطة الآن؟ */
export async function hasActiveEntitlement(
  sql: SqlExecutor,
  tenantId: string,
  capabilityKey: string,
): Promise<boolean> {
  const result = await sql.query<{ entitled: boolean }>(
    `select exists(
       select 1
       from public.tenant_entitlements
       where tenant_id = $1
         and capability_key = $2
         and state = 'active'
         and effective_from <= now()
         and (effective_to is null or effective_to > now())
     ) as entitled`,
    [tenantId, capabilityKey],
  );
  return result.rows[0]?.entitled === true;
}
