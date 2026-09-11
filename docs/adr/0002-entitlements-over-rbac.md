# ADR-0002 — Entitlements فوق RBAC وScope

- **Status:** Accepted
- **Date:** 2026-09-11
- **Related:** [ADR-0001](0001-product-dimensions-and-levels.md) · [`RBAC_MATRIX.md`](../RBAC_MATRIX.md)

## Context

النظام الحالي يفرض طبقتين فقط: RBAC (الدور × الفعل) وScope (نطاق المورد)، وكلتاهما موجودتان في `src/lib/authorization/policy.ts`.

لا توجد طبقة تجارية. النتيجة أن أي مستخدم له علاقة طالب/ولي أمر يستطيع فتح `/student` أو `/parent` بغض النظر عن المنتج المشترى. كما أن كل ميزة LMS/بوابات ستحتاج لاحقًا شرطًا تجاريًا سيُكتب متناثرًا في الكود إن لم توجد طبقة واحدة.

كذلك، لا يمكن حاليًا التعبير عن: add-on مفعّل فوق المستوى، أو استثناء تجاري مسحوب، أو حدود استخدام (Limits).

## Decision

نضيف طبقة **Entitlement** مستقلة، وتصبح قرارات الوصول ثلاث طبقات متتالية لا تُدمج:

```text
Effective Access = Entitlement(tenant, capability) AND RBAC(role, action) AND Scope(resource)
```

**مصادر الحقيقة:**

| الطبقة | المصدر |
|---|---|
| Entitlement | `tenants.product_level` + `tenant_entitlements` |
| RBAC | `docs/RBAC_MATRIX.md` + `src/lib/authorization/policy.ts` |
| Scope | علاقات قاعدة البيانات (offering / cohort / student) |

**آلية التمثيل:**

- `capability_catalog` — تعريف القدرات (تُشتق من ملف TS واحد هو مصدر الحقيقة، والجدول مرجعي للتقارير فقط).
- `tenant_entitlements` — الحالة الفعلية لكل قدرة لكل Tenant: `state`, `source`, `limits jsonb`, `effective_from/to`, `granted_by`.
- `defaultEntitlementsForLevel(level)` — دالة واحدة تُشتق منها قدرات المستوى، فلا قوائم مكررة.

المنح يمكن أن يكون: `plan` أو `addon` أو `trial` أو `manual` أو `promotion` — ولهذا `product_level` وحده لا يكفي للحسم.

**قاعدة إلزامية:** الميزة غير المشتراة لا تُبنى واجهتها ولا منطقها في المسار العام؛ التخفي في الواجهة ليس حماية. الـEntitlement يُفرض على الخادم، والأخطاء تُرجع حالات واضحة (`no_entitlement`).

## Consequences

**إيجابيات:**
- منع اختلاط القرار التجاري مع صلاحيات الأدوار.
- الترقية/التخفيض = بيانات، لا كود ولا migration.
- حدود الاستخدام (طلاب/موظفون/فروع/تخزين) قابلة للتمثيل صراحةً.
- إغلاق ثغرة البوابات المفتوحة لأي علاقة طالب/ولي أمر.

**سلبيات/تكاليف:**
- طبقة إضافية يجب فرضها في الـDAL قبل كل قراءة حساسة.
- يلزم حذر من إبطاء القراءات: الـEntitlements تُقرأ مع سياق الجلسة لا في كل استعلام منفرد.
- يلزم تعريف سلوك Grace عند التخفيض/انتهاء الاشتراك.

## Alternatives considered

| البديل | سبب الرفض |
|---|---|
| شروط `tenant.product_level === ...` متناثرة | تكرار، وتنسى مواضع، ولا تعبر عن add-ons أو limits |
| استخدام `tenant_type` كبديل عن الميزة | خلط البعدين — مرفوض في [`ADR-0001`](0001-product-dimensions-and-levels.md) |
| عمود `features jsonb` على `tenants` | لا تاريخ فعالية، لا مصدر، لا تدقيق، ولا حدود قابلة للاستعلام |
| جداول منفصلة لكل ميزة | تعقيد وهشاشة عند إضافة ميزة |

## Compliance

- يُنفَّذ في `P01-06` (الجدولان والـcatalog) ويُفرض في `PHASE-02`.
- اختبارات مطلوبة: no-entitlement، expired، suspended، add-on فوق المستوى، تخفيض لا يحذف بيانات.
