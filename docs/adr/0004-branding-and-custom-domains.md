# ADR-0004 — Branding وCustom Domains بدون codebase منفصل

- **Status:** Accepted
- **Date:** 2026-09-11
- **Related:** [`PRODUCT_VISION.md`](../PRODUCT_VISION.md) · [ADR-0002](0002-entitlements-over-rbac.md)

## Context

قرار المالك: **لا يوجد codebase منفصل لكل عميل أبدًا.** المعمارية هي:

```text
ONE CODEBASE → MULTI-TENANT → MULTI-BRAND → MULTI-DOMAIN
```

ويجب أن يعمل Tenant في وضعين: **Saboraty Hosted** (`teacher-name.saboraty.online`) و**White-label / Custom Domain** (`academy.com`)، مع تحكم الـTenant configuration في العلامة والشعار والألوان والاسم العام والدومين والميزات المفعّلة.

المخطط الحالي لا يحتوي أي تمثيل لـBranding أو Domains، ولا يوجد قرار موثق كيف تُخدَم الهوية لكل Host ولا كيف يتحدد الـTenant من الطلب.

## Decision

1. **إضافة جدولين** إلى المخطط الكانوني:
   - `tenant_branding` (1:1 اختياري مع الـTenant): `public_name`, `tagline`, `logo_ref`, `favicon_ref`, `primary_color`, `secondary_color`, `theme_mode`, `support_email`, `support_phone`.
   - `tenant_domains`: `hostname` (unique عالميًا)، `kind` (`subdomain`/`custom`)، `status` (`pending`/`verified`/`active`/`failed`)، `is_primary`، `ssl_status`، `verified_at`.

2. **حسم الـTenant من الـHost** يكون عبر `tenant_domains`، مع مسار افتراضي لمنصة سبورتي نفسها، وسلوك محدد لـHost غير معروف (لا يُخمَّن Tenant).

3. **تنفيذ الـDomain routing مؤجل** إلى `P15-07` (White-label & custom domain verification/SSL/isolation)، لكن **الـschema يُبنى الآن** لأن إضافته لاحقًا على قاعدة مأهولة أغلى وأخطر.

4. **Custom domain ليس Deployment منفصلًا**، ولا Codebase منفصلًا، ولا قاعدة بيانات منفصلة. نفس التطبيق ونفس الـruntime وبيانات معزولة بـtenant scope.

5. **الوضع مدفوع بـEntitlement**: `branding.custom_domain` و`branding.white_label` add-ons، وليس بمجرد وجود دومين في الجدول.

6. **خيار enterprise** (بنية تحتية/قاعدة بيانات مخصصة) مسموح معمارياً لاحقًا، لكنه **ليس النموذج الافتراضي** ولا يُبنى قبل حاجة مثبتة وقرار موثق.

## Consequences

**إيجابيات:**
- عميل الدومين المخصص يعمل على نفس الكود، فكل تحسين يصل لكل العملاء.
- الهوية متغيرات بيانات، فيمكن تطبيق White-label بلا fork.
- إضافة الـschema الآن بتكلفة قريبة من الصفر وقبل وجود بيانات حقيقية.

**سلبيات/تكاليف:**
- الـHost يصبح مدخلًا غير موثوق يجب التحقق منه قبل أي قراءة (Host header spoofing).
- الـCaching والـ`metadata` والتوليد الساكن يجب أن يراعوا تعدد الدومينات.
- التحقق من الدومين وشهادات SSL مسؤولية تشغيلية لاحقة (عقد Coolify).
- يؤثر على `P08` (PWA/ثيم) و`P15-07`.

## Alternatives considered

| البديل | سبب الرفض |
|---|---|
| Deployment منفصل لكل عميل | مرفوض صراحةً؛ يجعل كل إصلاح N مرات |
| Fork الـcodebase للعملاء المميزين | يفسد الصيانة ويخالف القرار |
| تأجيل الـschema إلى `P15` | إضافته على قاعدة حيّة تمثل مخاطرة على العزل والـRLS |
| الاعتماد على `slug` كدومين | لا يدعم دومينًا مخصصًا حقيقيًا ولا SSL ولا تحقق ملكية |

## Compliance

- الـschema في `P01-06`، والتنفيذ في `P15-07`.
- مطلوب اختبارات: Host غير معروف، دومين غير مُتحقق، entitlement مفقود، وعزل بيانات Tenant عند الطلب من دومين Tenant آخر.
