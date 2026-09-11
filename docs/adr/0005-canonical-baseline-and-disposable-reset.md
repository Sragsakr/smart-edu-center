# ADR-0005 — Baseline كانوني واحد وReset قابل للتنفيذ قبل Schema Freeze

- **Status:** Accepted
- **Date:** 2026-09-11
- **Related:** [`ENGINEERING_PRINCIPLES.md`](../ENGINEERING_PRINCIPLES.md) · [`MASTER_EXECUTION_PLAN.md`](../MASTER_EXECUTION_PLAN.md)

## Context

عند تغير نموذج المجال بشكل جذري (تفكيك الكتالوج الأكاديمي وإضافة الطبقة التجارية)، يوجد خياران: بناء migrations توافقية للحفاظ على بيانات تجريبية قابلة للحذف، أو إعادة بناء مخطط نظيف.

البيانات الحالية بيانات تطوير/تجريبية: 3 مستخدمين و2 Tenants في قاعدة `saboraty`، ولا يوجد عملاء حقيقيون ولا Production data contract.

## Decision

1. **نموذج المجال النظيف له الأولوية على البيانات التجريبية.** لا تُكتب migrations غرضها الوحيد الحفاظ على صفوف demo قديمة أو مخطط تطويري قديم.
2. **Baseline كانوني واحد**: `postgres/baseline/0001_smart_edu_center_clean.sql` هو المخطط الوحيد القابل للتطبيق. `postgres/migrations/` تبقى فارغة حتى Schema Freeze.
3. **قبل أي Reset مدمر**: أخذ snapshot للبيانات المفيدة، ثم إعادة الإنشاء من الـbaseline، ثم Seed كانوني.
4. **التحقق الإلزامي قبل Reset للقاعدة الحقيقية**: تطبيق الـbaseline على قاعدة **PostgreSQL قابلة للحذف** أولًا، ثم نجاح فحص المخطط + قيود عزل الـTenants + lint/typecheck/tests/build/check. بدون ذلك لا Reset.
5. **Auth**: لا تُنقل password hashes قديمة ولا sessions قديمة من أنظمة Auth متقاعدة (Supabase أو غيرها). تُعاد Fresh Auth demo credentials بأمان بعد الـReset.
6. **التسلسل بعد الـReset**: تطبيق الـbaseline فقط → canonical demo seed → إعادة إنشاء Platform Admin → seed نموذج المدرس → seed نموذج السنتر → reconciliation → smoke tests.
7. **الحماية أثناء الـReset**: قاعدة `saboraty` لا تُستخدم كقاعدة اختبارات، وIntegration tests تستخدم `TEST_DATABASE_URL` منفصلًا على loopback لا يساوي `DATABASE_URL`.
8. **بعد Schema Freeze** ينتهي هذا مباشرةً: كل تغيير يصبح forward-only reviewed migration مع خطة Restore/Rollback.

## Consequences

**إيجابيات:**
- الوصول إلى المخطط الصحيح مباشرةً بدون دين تقني من مخطط تطويري قديم.
- Baseline واحد قابل لإعادة البناء، ومخرجات reset قابلة للتكرار.
- لا وقت مهدر على توافق بيانات قابلة للحذف.

**سلبيات/تكاليف:**
- فقدان بيانات demo الحالية، وتحتاج إعادة Seed (مقبول ومقصود).
- قاعدة `saboraty` تحتاج Reset صريحًا من المالك في وقته.
- يجب إثبات أن الـbaseline الجديد يعمل فعليًا قبل لمس قاعدة التطوير.

## Alternatives considered

| البديل | سبب الرفض |
|---|---|
| Migrations توافقية متسلسلة | وقت كبير مقابل الحفاظ على بيانات بلا قيمة إنتاجية |
| إبقاء `cohorts.subject` وتطويره تدريجيًا | يثبّت الخطأ المعماري في قلب نظام التسجيل |
| Reset بدون تحقق مسبق على قاعدة قابلة للحذف | مخاطرة بفقد بيانات بلا إثبات أن الـbaseline صالح |
| نسخ password hashes القديمة | ممنوع: أسرار وdigests من نظام متقاعد لا تُنقل |

## Compliance

- يُنفَّذ عبر `P01-08` (التحقق) و`P01-09` (Reset + Seed) في [`MASTER_EXECUTION_PLAN.md`](../MASTER_EXECUTION_PLAN.md).
- **قرار الإصدار:** **PostgreSQL 18 هو الإصدار المعتمد لكل البيئات.** بيئة التطوير المحلية الحالية على 16.13 وتُرقّى إلى 18 قبل `P01-08`، ويُجرى التحقق على 18.
- **قرار سير العمل:** العمل اليومي كله على قاعدة **التطوير**. لا يُلمس Production أثناء البناء؛ وقبل الإطلاق يُنقل العمل إلى **Staging** ويُنفَّذ فلو التسليم المعتاد (`feature/* → staging → main` مع rehearsal وrollback).
