# Smart Edu Center — Master Execution Plan

> **المصدر الوحيد لترتيب وتنفيذ العمل في المشروع.** لا توجد خطة موازية أو Technical Backlog منفصلة. المراجع التخصصية لا تحدد ترتيب العمل ولا تملك مؤشر Task.

## 1. مؤشر التنفيذ الحالي

```text
CURRENT_PHASE: PHASE-01 — البنية البديلة وجاهزية Staging
CURRENT_TASK: P02-07 — نقل الملكية Transactionally ومنع إزالة/تعطيل آخر Owner
NEXT_TASK: P02-08 — إدارة الجلسات والأجهزة: list، revoke one، logout all
SELECTED_OUT_OF_ORDER: `P02-11` نُفّذت قبل `P02-05` بقرار مالك: تسريب تخمين كلمات المرور خطر قابل للاستغلال اليوم، بخلاف مصفوفة صلاحيات لم تُثبت فيها ثغرة.
CURRENT_PRIORITY: P0 — Release blocker
PRODUCT_FEATURE_FREEZE: ACTIVE حتى اكتمال PHASE-02
SCHEMA_MODE: BUILD MODE — reset/reseed مصرح به؛ البيانات الحالية تجريبية بالكامل
DATABASE_VERSION: PostgreSQL 18 — الإصدار المعتمد لكل البيئات (ترقية المحلي من 16.13 في `P01-08`)
WORKFLOW_MODE: العمل اليومي على قاعدة التطوير؛ Staging ثم فلو التسليم قبل Production
LAST_VERIFIED_AUTOMATED_GATE: `npm run check` كامل ناجح (lint + typecheck + 123 unit + 93 integration + migrations + secrets + build + client-secrets + retired-runtime-dependency) بعد `P01-10..P01-15` و`P02-00..P02-02`، مع تطبيق الـbaseline على PostgreSQL 18.6 و51/51 smoke checks وClean Reset + canonical demo seed وRestore drill (46/46 بعد الاستعادة، RTO 0.3s) وتحقق بصري فعلي لفرض الاستحقاق
```

لا يجوز بدء `NEXT_TASK` أو أي Task أخرى قبل تحويل `CURRENT_TASK` إلى `DONE`، إلا إذا أصبحت `BLOCKED` وسُجل السبب واختيرت Task مستقلة عنها صراحة داخل هذا الملف.

## 2. طريقة استخدام الخطة

### 2.1 حالات التاسك

- `[ ] TODO`: غير جاهزة بسبب اعتماديات سابقة أو لم يأت دورها.
- `[>] READY`: اعتمادياتها مكتملة ويمكن أن تصبح التاسك الحالية.
- `[-] IN_PROGRESS`: هي التاسك الحالية الوحيدة الجاري تنفيذها.
- `[M] MANUAL`: تحتاج تنفيذًا أو قرارًا بشريًا موثقًا.
- `[!] BLOCKED`: متوقفة مع سبب ومالك قرار.
- `[x] DONE`: اكتملت مع Acceptance وQuality Gate ودليل مسجل.
- `[-N/A-]`: ثبت أنها غير مطلوبة، مع تسجيل سبب القرار.

### 2.2 الأولويات

| الأولوية | المعنى | القاعدة |
|---|---|---|
| `P0` | سلامة/بنية تمنع استمرار البناء | لا يبدأ Product work قبل إغلاقها. |
| `P1` | Management MVP الأساسي | يبنى بالترتيب حتى تصبح رحلة السنتر والمدرس قابلة للاستخدام. |
| `P2` | Pilot وتشغيل فعلي | مطلوب قبل إدخال عميل Pilot أو بيانات حقيقية. |
| `P3` | LMS والتوسع التجاري | يبدأ بعد إثبات Management MVP، إلا لقرار تجاري موثق. |
| `P4` | توسع وتحسينات لاحقة | لا يزاحم P0–P3. |

### 2.3 بروتوكول التنفيذ

1. اقرأ `AGENTS.md` و`README.md` وهذا الملف والمراجع المرتبطة بالتاسك.
2. نفّذ `CURRENT_TASK` فقط، ولا تتجاوز Dependency غير مكتملة.
3. افحص التغييرات القائمة ولا تكتب فوق عمل غير مرتبط.
4. نفّذ أصغر Vertical Slice مكتملة، وليس طبقة ضخمة بلا رحلة مستخدم.
5. اختبر حالات النجاح والفشل والصلاحيات والعزل المناسبة.
6. حدّث هذا الملف وREADME/AGENTS وأي مرجع تخصصي تغير عقده.
7. بعد النجاح: حوّل التاسك إلى `DONE`، أضف دليلًا مختصرًا إلى سجل التنفيذ، وانقل المؤشرين.
8. لا تعتبر Commit أو PR أو Preview بديلًا عن Acceptance، ولا تعتبر UI hiding حماية.

## 3. تعريف الاكتمال العام

أي Task لا تعتبر `DONE` إلا عند تحقق المناسب منها:

- Acceptance Criteria الوظيفية والسلبية ناجحة.
- Validation على الخادم لكل مدخل غير موثوق.
- Tenant/relationship scope مفروض في DAL وقاعدة البيانات حسب التصميم المستهدف.
- طبقات القرار الثلاث محترمة عند لمس الوصول: Entitlement ثم RBAC ثم Scope — ولا يُفتح مورد بميزة غير مشتراة أو بصلاحية دور بلا نطاق.
- لا قرار تجاري مبني على `tenant_type`، ولا خلط بين Customer Type وProduct Level.
- عند لمس الواجهة التسويقية: كل ميزة مميزة بصراحة بـAvailable/Coming Soon/Planned.
- العمليات متعددة الخطوات الحساسة Transactional وIdempotent حيث يلزم.
- Audit للماليات والحضور والصلاحيات والعمليات الحساسة.
- Loading/Empty/Error/Unauthorized states عند لمس الواجهة.
- RTL وKeyboard وMobile/Desktop عند لمس الواجهة.
- `npm run lint` و`npm run typecheck` والاختبارات المناسبة و`npm run build` ناجحة.
- `npm run check:migrations` و`npm run check:secrets` عند لمس DB/configuration.
- تحديث التوثيق ومؤشر التنفيذ وسجل النتيجة.

راجع أيضًا [`ENGINEERING_PRINCIPLES.md`](ENGINEERING_PRINCIPLES.md) و[`RBAC_MATRIX.md`](RBAC_MATRIX.md).

## 4. قواعد المنتج والمعمارية غير القابلة للكسر

عقد المنتج المرجعي: [`PRODUCT_VISION.md`](PRODUCT_VISION.md). قرارات المعمارية: [`adr/`](adr/README.md).

- المنتج Web PWA عربي RTL لنموذجي `teacher` و`center` (Customer Type)، ومستويات المنتج `operations` و`management_platform` و`learning_platform`.
- **البُعدان مستقلان تمامًا**: `tenant_type` يحدد شكل الكتالوج والتنقل فقط، و`product_level` يحدد ما هو مشتراة فقط. لا يُخلطان، ويُمنع أي قرار تجاري مبني على `tenant_type` في الكود.
- **ثلاث طبقات قرار إلزامية**: `Entitlement(tenant, capability)` AND `RBAC(role, action)` AND `Scope(resource)`. الميزة غير المشتراة لا تُفتح بحجة وجود صلاحية دور.
- **Subject وTeacher وCourse وCourse Offering مفاهيم منفصلة**: لا hard-link واحد بين Subject وTeacher، والوحدة القابلة للبيع والتنظيم هي `course_offering`، والمجموعة وحدة تسليم/جدولة فقط.
- **الترقية بدون فقدان**: الترقية بين المستويات أو إلى White-label لا تُنشئ Tenant جديدًا ولا تنقل بيانات ولا تغيّر codebase؛ التخفيض لا يحذف بيانات العميل.
- **Baseline كانوني واحد**: `postgres/baseline/0001_smart_edu_center_clean.sql` فقط، و`postgres/migrations/` تبقى فارغة حتى Schema Freeze.
- PostgreSQL self-managed هو application database الوحيد، وFresh Auth مملوك للتطبيق.
- Center Student وOnline Student علاقتان منفصلتان لهوية واحدة؛ لا `student_type` وحيد يخلطهما.
- Platform Admin له `/platform-control/login` و`/platform-admin` منفصلان.
- Management/Student/Parent يستخدمون `/login`، وتحدد العلاقات المحمية الـcontext بعد المصادقة.
- Student وGuardian ليسا Tenant memberships.
- Server Components افتراضيًا؛ `use client` عند أصغر interactive boundary.
- القراءات في Server-only DAL، والـUI mutations في Server Actions، والـwebhooks في Route Handlers.
- لا codebase ولا deployment منفصل لأي عميل؛ Branding وCustom Domain بيانات، لا fork.
- لا Marketplace بين Tenants ولا ERP كامل ولا بث فيديو مملوك ولا microservices/Redis/queues دون حاجة مثبتة.
- Platform Admin لا يملك قراءة دائمة مفتوحة لبيانات الطلاب؛ دعم Tenant مستقبلًا مؤقت ومدقق.
- أي عرض للمنتج (Landing/تسعير) يميّز بصراحة Available / Coming Soon / Planned، ولا يقدّم ميزة مخطط لها كمتاحة.

## 5. Build Mode وقاعدة البيانات

الحالة الحالية `BUILD MODE`. حتى إعلان المالك صراحة `SCHEMA FREEZE / PRODUCTION DATA MODE`:

1. الـcanonical schema هو `postgres/baseline/0001_smart_edu_center_clean.sql`، وهو المخطط الوحيد القابل للتطبيق.
2. **لا يوجد عملاء حقيقيون ولا Production customer data تُحفظ.** البيانات الحالية (مستخدمون وTenants وطلاب وجلسات وبيانات اختبار) **تجريبية بالكامل وقابلة للحذف**.
3. **Clean Reset / Rebuild / Reseed مُعتمد** عند تغيّر الـcanonical target schema. لا تُبنى migrations توافقية للحفاظ على بيانات تطوير قابلة للحذف، ولا تُحفظ بنى مخطط قديمة لأن بيانات demo تستخدمها.
4. نموذج المجال النظيف والمعمارية الصحيحة لهما الأولوية على البيانات التجريبية. أي بيانات demo مفيدة تُؤخذ لها snapshot قبل الـReset ثم يُعاد Seed للقيم المفيدة فقط، أو يُعاد بناء الـcanonical demo من الصفر.
5. **بوابة إلزامية قبل Reset للقاعدة الحقيقية**: تطبيق الـbaseline على قاعدة **PostgreSQL قابلة للحذف** أولًا، ونجاح فحص المخطط + قيود عزل الـTenants + `lint`/`typecheck`/`tests`/`build`/`check`. بدون هذه الشروط لا Reset.
6. **Auth**: لا تُنقل password hashes ولا sessions من أي نظام Auth متقاعد، وتُعاد Fresh Auth demo credentials بأمان بعد الـReset.
7. التسلسل المعتمد بعد الـReset: تطبيق الـbaseline فقط → canonical demo seed → إعادة إنشاء Platform Admin → seed نموذج المدرس → seed نموذج السنتر → reconciliation counts → application smoke tests.
8. قاعدة `saboraty` لا تُستخدم كقاعدة اختبارات ولا تُمس من test reset scripts.
9. Integration tests تستخدم `TEST_DATABASE_URL` منفصلًا على loopback، ولا يساوي `DATABASE_URL`.
10. Seed/import يكون deterministic وبترتيب Foreign Keys مع reconciliation.
11. Production/Coolify يمكن إعادة بنائه نظيفًا لاحقًا قبل الإطلاق لعدم وجود عملاء، لكن **لا يُعدّل Production ضمن خطوات التصميم/الـschema** إلا بتنفيذ خطوة بنية تحتية معتمدة صريحة.
12. بعد Schema Freeze ينتهي هذا الأسلوب فورًا: كل تغيير يصبح forward-only reviewed migration مع Restore/Rollback planning، وبيانات الإنتاج لا تُعامل بهذه الطريقة أبدًا.
13. **سير العمل اليومي على قاعدة التطوير.** لا يُعدّل Production أثناء البناء. وقبل الإطلاق يُنقل العمل إلى Staging ويُنفَّذ فلو التسليم المعتاد (`feature/* → staging → main` مع rehearsal وrollback).

القرار الكامل: [`adr/0005`](adr/0005-canonical-baseline-and-disposable-reset.md).

## 6. خريطة المراحل والاعتماديات

```text
PHASE-00 Fresh Auth closure
    ↓
PHASE-01 Replacement infrastructure & staging readiness
    ↓
PHASE-02 Authorization, ownership, sessions & isolation
    ↓
PHASE-03 Tenant management foundation
    ↓
PHASE-04 Academic operations
    ↓
PHASE-05 Students & guardians
    ├──────────────┐
    ↓              ↓
PHASE-06 Billing   PHASE-07 Attendance (يعتمد أيضًا على PHASE-04)
    └──────┬───────┘
           ↓
PHASE-08 User portals & PWA
           ↓
PHASE-09 Reporting & teacher settlements
           ↓
PHASE-10 Communications & notifications
           ↓
PHASE-11 Management pilot & limited launch
           ↓
PHASE-12 LMS commercial foundation
           ↓
PHASE-13 Courses, content, video & live learning
           ↓
PHASE-14 Assignments & assessments
           ↓
PHASE-15 SaaS billing, support & white-label
           ↓
PHASE-16 Production hardening & general availability
```

Security، accessibility، audit، observability، documentation والاختبارات متطلبات Cross-cutting داخل كل مرحلة وليست أعمالًا مؤجلة إلى النهاية.

```text
PHASE-01 (تفصيل): 
  إغلاق البنية (P01-01..P01-03) 
    ↓
  عقد المنتج: PRODUCT_VISION + ADRs           (P01-04)
    ↓
  Landing Page بالرؤية الكاملة                (P01-05)
    ↓
  Commercial Foundation في الـschema          (P01-06)
    ↓
  Academic Catalog Foundation                 (P01-07)
    ↓
  تحقق Baseline + Clean Reset + Seed          (P01-08..P01-09)
    ↓
  Backup/Restore/Monitoring/Staging           (P01-10..P01-15)
    ↓
  Exit Gate G01 → PHASE-02
```

هذا الترتيب مقصود: الـschema والأدبيات تُثبَّت **قبل** أي Seed، حتى لا تُبنى بيانات demo على نموذج سيُلغى.

---

# PHASE-00 — إغلاق PostgreSQL وFresh Auth

**Priority:** `P0`
**Dependencies:** لا يوجد.
**الهدف:** إغلاق الهجرة الحالية بدليل آلي ويدوي واضح قبل أي Feature جديدة.

## الحالة المثبتة

- [x] `P00-01` Clean PostgreSQL baseline وFresh Auth credentials/scrypt وopaque sessions.
- [x] `P00-02` نقل login/logout/signup/onboarding/workspace approval إلى PostgreSQL-only runtime.
- [x] `P00-03` نقل Team/invitations/password recovery/Platform Admin/Student/Parent reads.
- [x] `P00-04` Integration harness آمن و56 اختبارًا على PostgreSQL حقيقيًا، تشمل Auth/bootstrap/platform/team/workspace recovery و16 اختبار عزل، مع 42 Unit tests وكل بوابات الجودة ناجحة.
- [x] `P00-05` أُغلقت بقرار المالك دون تنفيذ دورة يدوية شاملة مستقلة؛ ستُعاد مراجعة كل Persona وصلاحياتها ورحلاتها بصورة منظمة داخل مراحل بنائها (`P02` و`P08` وما يرتبط بهما):
  - التسجيل ثم onboarding ثم إنشاء workspace request والخروج.
  - مراجعة Platform Admin للطلب: قبول ورفض ومحاولة تكرار.
  - دخول Management بعد القبول والخروج.
  - إنشاء/إعادة إرسال/إلغاء/قبول دعوة وانتهاء token/replay.
  - طلب استعادة كلمة المرور، إصدار الكود، المحاولات الخاطئة، التغيير، وإلغاء الجلسات القديمة.
  - Platform Admin login/authorization/logout.
  - Student login وقراءة بياناته فقط.
  - Parent login والتبديل بين الأبناء المسموحين فقط.
  - `/choose-context` لمستخدم متعدد العلاقات.
  - حالات unauthorized/expired/revoked وواجهات الخطأ.
  - RTL وموبايل وديسكتوب للمسارات المتغيرة.
- [x] `P00-06` أُغلق INFRA-011: أصبح Runtime وCI وبيئة التشغيل PostgreSQL/Fresh Auth فقط، وحُذفت إعدادات وفروع OAuth/backend الخارجية، وأُحيلت أدوات الهجرة والتحقق القديمة إلى `postgres/reference/` للتاريخ فقط. نجح `npm run check` و`npm run test:integration` نهائيًا على Node.js `22.23.2`.

**Exit Gate G00:** تغطية Auth/portal contexts آليًا على PostgreSQL ناجحة، ولا raw secrets/tokens أو regression أو تسريب tenant/relationship معروف. المالك اعتمد ترحيل التحقق اليدوي التفصيلي لكل Persona إلى مراحل الصلاحيات والبوابات `P02` و`P08` بدل دورة مستقلة في `P00-05`.

---

# PHASE-01 — البنية البديلة وجاهزية Staging

**Priority:** `P0`
**Dependencies:** `G00`.
**الهدف:** Staging قابلة لإعادة البناء والاستعادة والمراقبة على البنية المملوكة للمشروع.

- [x] `P01-01` جرى جرد الحالة الفعلية: مشروع Coolify قائم ببيئتي production وstaging، مورد التطبيق مرتبط بـGitHub، PostgreSQL داخل شبكة Coolify الداخلية، المتغير التشغيلي المطلوب هو `DATABASE_URL` فقط، أُزيلت أسرار Supabase والمتغيرات المتقاعدة ودُوّرت القيم التي ظهرت في لقطة الإعداد، وفُصل GitHub عن Vercel. أكد المالك إعداد domains/TLS؛ يعاد Smoke الفعلي بعد نشر `P01-02`.
- [x] `P01-02` فُصل مسار التسليم إلى `feature/* → staging → main` ونشر Coolify Staging عبر HTTPS. أُنشئت PostgreSQL Production مستقلة، وأثبت اختلاف `system_identifier` فصل الـclusters، ثم حُفظت Internal `DATABASE_URL` الخاصة بها في تطبيق Production دون Deploy؛ بقي Staging متصلًا بقاعدته وعمل Health، وبقي Production على نسخته المنشورة السابقة.
- [x] `P01-03` طُبقت الـcanonical baseline ذريًا على قاعدتي Staging وProduction المستقلتين بعد إثبات خلوهما؛ نجحت 21/21 smoke checks و58 integration tests، وأضيف `/api/readiness` لتمييز الاتصال عن اكتمال الـSchema. نُشر نفس Runtime على البيئتين وأعاد Health وReadiness `200`.
- [x] `P01-04` أُثبت عقد المنتج في الوثائق: `docs/PRODUCT_VISION.md` (البُعدان المستقلان، المستويات الثلاثة، كتالوج القدرات، طبقات Entitlement/RBAC/Scope، النموذج التجاري، الاستضافة وWhite-label، سياسة Available/Coming Soon/Planned)، وADRs `0001..0005`، وتحديث `MASTER_EXECUTION_PLAN` (القسم 4، 5، 6، 3، 8، 9، 12 وإعادة ترقيم PHASE-01) و`RBAC_MATRIX` (فصل طبقة Entitlement ونقل Teacher scope إلى `course_offerings.teacher_id`) و`AGENTS.md` و`README.md`. لا كود ولا database. (**STEP 0**)
- [x] `P01-05` أُعيد بناء Landing Page حول الرؤية الكاملة: نظام وسم موحّد `ProductStatusChip` + `feature-status` كمصدر واحد للحالات، و`product-vision-content` كمصدر واحد لمحتوى الرؤية، وأقسام جديدة للبُعدين والمستويات الثلاثة والكتالوج ومسارات التنقل والاستضافة/White-label وقاعدة الترقية ومفتاح الحالات، وشريط «إحنا دلوقتي فين بالظبط» بالحالة الحقيقية. رُوجعت `quickFeatures`/`useCases`/`workflow`/`roleCards`/`capabilityGroups` وأُضيف لكل بند حالته؛ وأُزيل وعد «ابدأ مجانًا» واستُبدل بطلب مساحة يوضح مراجعة إدارة المنصة، ووُسم العرض البصري بأنه توضيحي، وأُزيل رابط `/platform-control/login` من الصفحة العامة. تحقق: 143 وسم حالة (18 متاح / 51 قريبًا / 74 مخطط)، 14 قسمًا، صفر Overflow عند 390/768/1280، وصفر أخطاء Console، و`npm run check` كامل ناجح. (**STEP 1**)
- [x] `P01-06` نُفّذت الطبقة التجارية في الـcanonical schema: enum `tenant_type`/`product_level`/`capability_kind`/`entitlement_state`/`entitlement_source`/`domain_kind`/`domain_status`/`theme_mode`؛ `tenants.tenant_type` بدل `account_type` مع `product_level` و`currency` و`timezone` و`locale`؛ جداول `capability_catalog` (نطاق المنصة) و`tenant_entitlements` (state/source/limits/effective window/granted_by) و`tenant_branding` و`tenant_domains`؛ `workspace_requests.tenant_type` + `requested_product_level`؛ ومصادر حقيقة في الكود (`capability-catalog.json` + `capability-catalog-rules.mjs` + `capability-catalog.ts` + `default-entitlements.ts`) مع `defaultEntitlementsForLevel()` كاشتقاق وحيد، وسكربت Seed idempotent محمي. تحقق: baseline مطبّق على PostgreSQL 18.6 نظيفًا، 32/32 smoke checks، 57 unit + 64 integration، و`npm run check` كامل ناجح. (**STEP 2**)
- [x] `P01-07` نُفّذ الكتالوج الأكاديمي في الـcanonical schema: `rooms`، `stages`، `grades`، `subjects`، `teachers` (سجل مستقل عن `memberships` مع ربط اختياري)، `courses`، `course_teachers` (N:N مؤكَّد بـ`unique(tenant_id, course_id, teacher_id)`)، `course_offerings` (مقرر + مدرس + فرع + قاعة + نمط + سعة + سعر + عملة) مع قيد يمنع عرضًا بمدرس غير مسند للمقرر، و`cohorts` أُعيد بناؤها على `course_offering_id` بلا `subject` أو مدرس مباشر، و`cohort_members` لوحدة التسليم، و`enrollments` على العرض، و`students.grade` نصًا → `students.grade_id`، و`students.user_id`/`guardians.user_id` → `unique(tenant_id, user_id)`، مع كل الفهارس وقيود العزل. تحقق: 51/51 smoke checks على PostgreSQL 18.6، و74 integration (منها 12 اختبار عزل جديد للكتالوج)، و`npm run check` كامل ناجح. (**STEP 3**)
- [x] `P01-08` الـbaseline الكانوني موحّد في ملف واحد `postgres/baseline/0001_smart_edu_center_clean.sql` (26 → 33 جدولًا) وطُبّق نظيفًا على **قاعدة PostgreSQL 18.6 قابلة للحذف** قبل لمس قاعدة التطوير: 51/51 smoke checks + فحص المخطط + قيود عزل الـTenants + `lint`/`typecheck`/57 unit/74 integration/`build`/`check`. أُضيف `vitest.config.mts` لحل مسار `@`، وأُزيلت `on delete` المخالفة. إصدار PostgreSQL محسوم: **18**. (**STEP 4**)
- [x] `P01-09` نُفّذ Clean Reset بعد نجاح `P01-08` فقط: قاعدة `saboraty` أُعيد إنشاؤها على PostgreSQL 18 (المنفذ `5433`) من الـbaseline وحده → `seed:capability-catalog` (25 قدرة) → `seed:canonical-demo` الذي يعيد إنشاء Fresh Auth credentials لكل الحسابات ثم يبذر نموذج `teacher` (`demo-teacher`, `learning_platform`, 15 قدرة) ونموذج `center` (`demo-center`, `management_platform`, 10 قدرات) بفرعين و3 قاعات و3 مراحل و4 صفوف و4 مواد و4 مدرسين و8 مقررات و9 عروض و6 مجموعات و8 طلاب و5 أولياء أمور و12 تسجيلًا و6 حصص و8 فواتير و4 مدفوعات → reconciliation counts → application smoke tests. الـSeed idempotent (تشغيل مكرر بنفس الأعداد). (**STEP 4**)
- [x] `P01-10` حُسم عقد التخزين الخاص في [`adr/0006`](adr/0006-private-storage-contract.md): ملفات خاصة افتراضيًا، مفاتيح tenant-scoped، روابط موقعة قصيرة العمر من الخادم فقط، تحقق MIME/حجم على الخادم، وتدقيق للرفع/الحذف. **مزوّد الفئة الصغيرة** (شعار المساحة، `P03-02`) هو تخزين داخل PostgreSQL خلف منفذ `PrivateStorage` لأنه مشمول بالـbackup والاستعادة أصلًا ولا يضيف مزوّدًا لحاجة غير مثبتة، و**مزوّد الفئة الكبيرة** (فيديو `P13-03`) يُحسم بـADR مقارنة في وقته. (كانت `P01-05`)
- [x] `P01-11` `postgres/scripts/backup-database.mjs`: dump بصيغة custom → تشفير AES-256-PBKDF2 بمفتاح من ملف لا من سطر الأوامر → checksum sha256 → manifest سطرية → **تحقق عكسي إلزامي** قبل اعتبار النسخة صالحة → retention قابل للضبط لا يحذف ملفًا لا يطابق الصيغة. يرفض التشغيل بلا `BACKUP_DIR` أو بلا مفتاح، ويفشل برمز غير صفري ورسالة `BACKUP FAILED`. 12 اختبار وحدة. تشغيل فعلي: نسخة 133,616 بايت ببصمة مسجّلة. (كانت `P01-06`)
- [x] `P01-12` `postgres/scripts/restore-drill.mjs`: يفكّ التشفير ويتحقق من البصمة، ثم يستعيد في قاعدة **قابلة للحذف** محمية بحراسة ترفض `saboraty`/`postgres`/`template*`/مطابقة `DATABASE_URL`/غير loopback. التحقق بعد الاستعادة: 46/46 smoke + كلمة مرور Platform Admin تُتحقق بمُتحقّق التطبيق + تخزين بصمات فقط + رفض إدخال عابر للمساحات + استحقاقات محفوظة. 6 اختبارات حراسة. النتيجة: RTO 0.3s وRPO 121s. (كانت `P01-07`)
- [x] `P01-13` الجزء البرمجي: سجل منظم JSON سطر واحد (`src/lib/observability/server-logger.ts`) يمر كل سياقه على تنقيح PII (`redact-pii.ts`) يحجب البريد والهاتف والرموز وبصمات الجلسات وسلاسل الاتصال، **ويحتفظ بـUUID والطوابع الزمنية** لتبقى السجلات قابلة للربط، مع سقف عمق وعدد عناصر وكشف الدوران. موصّل بمسار فشل حقيقي في `platform-admin/requests/actions.ts`. 19 اختبار وحدة. (كانت `P01-08`)
- [x] `P01-14` الجزء البرمجي: `scripts/check-runtime-dependencies.mjs` يمنع آليًا رجوع Supabase/Vercel إلى الـruntime (متغيّرات، SDK، مسار `/auth/callback`، مُحدِّد `DATA_BACKEND`)، ومدمج في `npm run check`، مع 5 اختبارات. (كانت `P01-09`)
- [x] `P01-15` [`docs/OPERATIONS_RUNBOOK.md`](OPERATIONS_RUNBOOK.md): إجراء النسخ الاحتياطي، حراسة تجربة الاستعادة وقراءة RPO/RTO، المراقبة، ومسار Rollback/Cutover مع **شروط إزالة البنية القديمة** (لا تُحذف قبل إثبات النسخة والاستعادة ونجاح فحص الاعتماد المتقاعد). (كانت `P01-10`)
- [M] `P01-13-M` **إجراء مالك:** مراقبة توفّر خارجية على `/api/health` و`/api/readiness` من خارج الشبكة، ولوحة CPU/RAM/disk/اتصالات، والتأكد أن Coolify يجمع stdout/stderr. اختيار مزوّد تتبّع أخطاء مؤجل حتى حاجة مثبتة، وعند إضافته يمر عبر نفس التنقيح وبـDSN خادمي فقط.
- [!] `P01-14-M` **BLOCKED (بنية تحتية):** تطبيق الـbaseline الجديد على Staging واختبار الرحلات الحرجة هناك. يتطلب وصولًا لـCoolify و`DATABASE_URL` الخاصة بـStaging غير المتاحين محليًا. المالك: مالك المشروع.

> **خريطة إعادة الترقيم:** `P01-04` القديمة (seed) استُبدلت بـ`P01-09` لأنها كانت ستبني بيانات demo على schema سيُلغى؛ `P01-05..P01-10` القديمة أُزيحت إلى `P01-10..P01-15`. السبب: STEP 0–4 تُنفَّذ قبل أي Seed لضمان بناء البيانات على الـtarget schema الصحيح.

**Exit Gate G01:** Staging PostgreSQL-only مستقرة على الـcanonical baseline الجديد، deployment قابل للتكرار، backup وrestore مختبران، monitoring نشط، ولا database public exposure، والـcanonical demo seed يمثل نموذجي `teacher` و`center` على النموذج الجديد.

> **حالة G01:** مكتمل هندسيًا ومحليًا (الـbaseline، الـseed، الـbackup، الـrestore drill، السجل المنقّح، فحص الاعتماد المتقاعد). **الباقي إجراء مالك:** `P01-13-M` (مراقبة خارجية ولوحة موارد) و`P01-14-M` (تطبيق الـbaseline على Staging واختبار الرحلات الحرجة هناك). يُثبت `P01-14-M` على Staging عند توفر الوصول.

---

# PHASE-02 — الصلاحيات والملكية والجلسات والعزل

**Priority:** `P0`
**Dependencies:** `G01`.
**الهدف:** إغلاق بوابة IAM قبل توسيع بيانات وعمليات العملاء.

مرجع الصلاحيات الملزم: [`RBAC_MATRIX.md`](RBAC_MATRIX.md).

- [x] `P02-00` **فرض الاستحقاق على البوابات** — أُغلقت ثغرة كانت تسمح لأي مساحة بمستوى `operations` بفتح `/student` و`/parent` بمجرد وجود العلاقة. الفرض الآن على الخادم قبل أي قراءة بيانات، وغياب الاشتراك حالة واجهة مقصودة. (**مهمة مستقلة اختيرت صراحةً لتعطّل `P01-14-M`**)
- [x] `P02-01` عقد القرار المركزي في `src/lib/authorization/access-contract.ts`: دالة `evaluateAccess` واحدة تجمع الطبقات الثلاث بترتيب مقصود (المساحة → العضوية → **الاستحقاق** → الدور → النطاق)، وتُرجع `decision` مع `reason` ([`tenant_missing`, `tenant_inactive`, `membership_missing`, `membership_inactive`, `no_entitlement`, `role_denied`, `scope_required`]) و`missingEntitlement` للترقية، و`entitlementForTenantCapability` يعلن المتطلب التجاري لكل قدرة دور، ورسائل رفض عربية مميزة لكل سبب. 16 اختبار وحدة. الاستحقاق يُفحص **قبل** الدور عمدًا ليظهر `no_entitlement` بدل `role_denied` عندما تكون الميزة غير مشتراة. (**STEP PHASE-02**)
- [x] `P02-02` DAL مركزي في `src/lib/authorization/server.ts`: `getTenantAuthorizationContext` يقرأ المساحة والعضوية والاستحقاقات النشطة (داخل نافذة فعاليتها) في قراءات محدودة، و`requireTenantCapability` و`requireTenantCapabilityWithScope` يقرران عبر `evaluateAccess` وحده، و`tenantCapabilityReport` يعرض القدرات للواجهة، و`EntitlementError` منفصل عن `AuthorizationError` لأن الواجهة تعرض الأول كحالة ترقية لا كخطأ صلاحية. فحص النطاق **لا يعمل** إذا فشل الاستحقاق. 11 اختبار تكامل.
- [x] `P02-03` **عزل RLS مُلزم فعليًا.** [`adr/0007`](adr/0007-tenant-isolation-row-level-security.md) + 132 سياسة على 33 جدولًا بـ`FORCE ROW LEVEL SECURITY`، وسياسات bootstrap لحل السياق، وسياق داخل معاملة واحدة بـ`set_config(..., true)` فلا يتسرّب. **اكتشاف بالقياس:** `FORCE RLS` لا يُلزم الـsuperuser، فصارت الأدوار اثنين: `saboraty_app` (`NOSUPERUSER NOBYPASSRLS`) للـruntime ودور المالك للتطبيق والبذر، مع سكربت تزويد يرفض أي دور يتجاوز RLS. **12 اختبار إلزام RLS بدور التطبيق نفسه** + 105 integration + 123 unit، وتحقق بصري فعلي تحت RLS مُلزم.
- [x] `P02-04` الواجهة تُعرض من قرار الخادم لا من الدور وحده. `capabilityReport` يحسب كل قدرة بـ`evaluateAccess` (اشتراك + دور) ويُرجع `allowed` و`reason` و`missingEntitlement`، ودالتا `isEntitlementBlocked`/`isRoleBlocked` تختاران الرسالة. **ثغرة أُغلقت:** كانت `/team` تحسب الأزرار من `capabilitiesForRole` وحدها، فمساحة بلا ميزة مشتراة كانت تُظهر أزرارًا لا تعمل. صارت الصفحة تفرّق بين رسالة ترقية («غير مشمولة في مستوى مساحتك») ورسالة دور، وتحجب قائمة الفريق عند سقوط `team.read`. الخادم يبقى السلطة: كل إجراء يعيد الفحص عبر `requireTenantCapability`.
- [x] `P02-04-F` **علتان مكتشفتان بالتحقق البصري لا بالاختبار الآلي:** (١) سياسة `tenants` لم تكن تسمح للعضو بقراءة مساحته، فأعادت قائمة المساحات فراغًا وأدى ذلك إلى 307 إلى `/login`؛ أُضيفت `tenants_member_read`. (٢) سياسة `app_users` (صف شخصي) جعلت قائمة الفريق تعرض العضو نفسه فقط لأن صف الزميل غير مسموح؛ أُضيفت `app_users_colleague_read` بحدود «نفس المساحة وعضوية نشطة في الطرفين». الحالتان مغطاتان الآن باختبارات RLS، ومعهما اختبار عدم التسريب بعد تعطيل العضوية.
- [x] `P02-05` **المصفوفة صارت قابلة للفرض وقابلة للاختبار.** ثلاث نتائج: (١) **فجوة حقيقية أُغلقت:** المصفوفة كانت توثّق صلاحيات على الفروع والقاعات والمراحل والصفوف والمواد وسجلات المدرسين والمقررات والعروض، ولم تكن في `tenantCapabilities` أي قدرة لهذه الموارد الستة — أي أن 6 صفوف كاملة كانت موثّقة وغير قابلة للفرض. أُضيفت 12 قدرة (`*.read`/`*.manage`) بترجمة أمينة للجدول، فيصبح المجموع 46 قدرة. (٢) **فحص نطاق المدرس مُنفَّذ** في `src/lib/authorization/resource-scope.ts` عبر `course_offerings.teacher_id` ثم التفريع للطلاب والمجموعات والحصص — لا عمود مدرس على المجموعة. (٣) **مطابقة الوثيقة بالكود مُختبرة**: `rbac-matrix-conformance.test.ts` يحوّل جدول §4 إلى بيانات ويفشل عند أي انحراف. 24 اختبار مطابقة + 22 اختبار تكامل للنطاق (موجب وسالب) وحدود المالية.
- [x] `P02-05-F` **تصادم فضاءَي تسمية اكتشفه الاختبار:** `payments.read` (صلاحية دور) كان يجاور `payments.online` (استحقاق)، ونفس الحالة في `branches.` — وهو ما يسهّل الخطأ عند إضافة قدرة جديدة. أُعيدت تسمية المفتاحين إلى `ops.online_payments` و`ops.extra_branches`، وأُضيفت قاعدة `assertNoRbacNamespaceCollision` تفشل تحميل الكتالوج عند أي تقاطع مستقبلي، مع اختبار يثبت أن التصادم يُكتشف فعلًا.
- [x] `P02-06` **مسار موثوق لربط الهوية مُنفَّذ ومختبر حيًّا.** جدول `portal_invitations` مع `private.portal_invitation_by_token`، وصفحة `/claim`، وخدمة القبول التي تشترط ثلاثة شروط معًا: حيازة الرمز، وتطابق البريد الموثّق مع البريد المدعو، وأن يكون السجل غير مربوط. **قبل هذه المهمة لم يكن في التطبيق أي مسار يكتب `students.user_id`/`guardians.user_id`** — البذر فقط. 25 اختبار تكامل: موجب (طالب/ولي أمر/مطابقة غير حساسة لحالة الأحرف) وسالب (انتحال ببريد مختلف، رمز غير موجود، إعادة استخدام، دعوة ملغاة، منتهية، سجل مرتبط بغيره، سجل ثانٍ لنفس الهوية).
- [x] `P02-06-F` **ثلاث علل كشفتها الاختبارات:** (١) المفتاح الأجنبي الواحد `subject_id` كان يمنع دعوات أولياء الأمور — فُصل إلى `student_id`/`guardian_id` بفحص يضمن تطابق العمود مع النوع. (٢) قيد فريد على العمودين منفردين لا يمنع التكرار لأن PostgreSQL يعدّ NULL متمايزًا — استُبدل بفهرس تعبيري `coalesce(student_id, guardian_id)`. (٣) `students` لم يكن يحوي `updated_at` بخلاف `guardians` — أُضيف لاتساق المخطط.
- [x] `P02-06-R` **اكتشاف PostgreSQL دقيق:** `SELECT ... FOR UPDATE` يُطبّق سياسة **UPDATE** لا SELECT وحدها، فقفل صف الدعوة من مسار الرمز (بلا سياق مساحة) كان يُرجع صفرًا رغم نجاح القراءة العادية. أُعيد الترتيب: حلّ الرمز بالدالة المحدودة، ثم الدخول إلى المساحة، ثم القفل وإعادة التحقق.
- [ ] `P02-07` نقل الملكية Transactionally ومنع إزالة/تعطيل آخر Owner، مع confirmation وaudit.
- [ ] `P02-08` إدارة الجلسات والأجهزة: list، revoke one، logout all، وتعطيل جلسات الحساب عند الحاجة.
- [ ] `P02-09` تعطيل membership يمنع الإجراءات الحساسة فورًا دون التأثير على memberships في Tenants أخرى.
- [ ] `P02-10` IDOR/BOLA tests لكل Server Action/Route Handler قائم، وcross-tenant CRUD matrix.
- [x] `P02-11` **تحديد معدّل المحاولات مُنفَّذ ومختبر حيًّا** (أُنجزت قبل `P02-05` بقرار مالك، والسبب مسجّل في المؤشر أعلاه). جدول `private.auth_attempts` وبنتا `record_auth_attempt`/`clear_auth_attempts` بصلاحية المالك: لا يملك التطبيق أي قراءة مباشرة للجدول (يُثبته اختبار: `permission denied`)، والمخزَّن بصمات sha256 فقط بلا بريد أو IP خام. التسجيل والعدّ في نداء واحد مع قفل استشاري لكل مفتاح، فلا يُتجاوز الحدّ بمحاولات متزامنة. **حدّان لا حدّ واحد:** حدّ الحساب ضيّق وحدّ المصدر أوسع، حتى لا يُقفل سنتر كامل خلف عنوان واحد بسبب خطأ مستخدم — وهي علّة اكتُشفت بالاختبار الحي وأُصلحت. 7 مسارات مغطاة: `login` `platform_login` `signup` `password_reset_request` `password_reset_redeem` `invite_accept` `bootstrap`. والنجاح يمحو محاولات صاحبه. 18 اختبار وحدة + 12 تكامل، وتحقّق حي: الحادي عشر على الدخول مرفوض، والسابع على كود الاستعادة مرفوض، وحساب آخر من نفس المصدر يمرّ بنجاح.
- [ ] `P02-11-M` threat model مكتوب لـAuth/tenant boundaries. الجزء التنفيذي (rate limiting) أُنجز؛ يتبقى توثيق النموذج والتهديدات المرتبطة به.

**Exit Gate G02:** صفر وصول عابر معروف، لا role escalation، لا فقد آخر Owner، والجلسات المسحوبة/المعطلة لا تمنح صلاحيات.

**عند G02:** ينتهي `PRODUCT_FEATURE_FREEZE` وتبدأ أولوية Management MVP.

---

# PHASE-03 — أساس إدارة الـTenant

**Priority:** `P1`
**Dependencies:** `G02`.
**الهدف:** مساحة عمل قابلة للإعداد الفعلي لنموذجي `teacher` و`center`، مع كتالوج أكاديمي حقيقي.

- [ ] `P03-01` إعدادات Tenant: الاسم، `tenant_type`، `product_level` المعروض، بيانات التواصل، المنطقة الزمنية، العملة، اللغة والحالة.
- [ ] `P03-02` الشعار والهوية عبر Private Storage approved design مع MIME/size validation وروابط آمنة، وتعبئة `tenant_branding`.
- [ ] `P03-03` CRUD الفروع للسنتر مع archive بدل الحذف عند وجود تبعيات.
- [ ] `P03-04` CRUD القاعات والطاقة الاستيعابية وtenant-composite constraints.
- [ ] `P03-05` CRUD المراحل والصفوف والمواد: uniqueness وترتيب وأرشفة داخل Tenant.
- [ ] `P03-06` CRUD المدرسين كـtenant records (يمكن إنشاؤه بلا حساب مستخدم) مع ربط اختياري بـ`membership` عند وجودها.
- [ ] `P03-07` CRUD المقررات: `courses` + `course_teachers` (علاقة N:N) دون hard-link بين Subject وTeacher.
- [ ] `P03-08` CRUD الـCourse Offerings: مقرر + مدرس + فرع + قاعة + نمط + سعة + سعر، والتحقق من كل علاقة tenant-scoped.
- [ ] `P03-09` الكتالوج العام والتنقل: مسار Stage→Grade→Subject→Teacher→Course ومسار Stage→Grade→Teacher→Courses، مع فلاتر Stage/Grade/Subject/Teacher/Price.
- [ ] `P03-10` ملفات الموظفين والمدرسين مرتبطة بالmembership وحالة active/inactive.
- [ ] `P03-11` إعداد Navigation/labels حسب `tenant_type` فقط، وإخفاء تعقيد الفرع/الموظفين غير اللازم للمدرس المستقل، دون استخدام `tenant_type` كقرار تجاري.
- [ ] `P03-12` عرض الـEntitlements للمالك (قراءة فقط): المستوى الحالي، القدرات المضمّنة، والـAdd-ons المتاحة، مع حدود الاستخدام.
- [ ] `P03-13` Empty/loading/error/unauthorized/no-entitlement states وresponsive RTL.
- [ ] `P03-14` E2E لإعداد مساحة `center` ومساحة `teacher` من مساحة مقبولة وفارغة حتى offering قابل للبيع.

**Exit Gate G03:** يمكن للنموذجين إعداد مساحة تشغيل صحيحة وكتالوج وofferings دون بيانات ثابتة أو علاقات cross-tenant، ودون أي قرار تجاري مبني على `tenant_type`.

---

# PHASE-04 — التشغيل الأكاديمي

**Priority:** `P1`
**Dependencies:** `G03`.
**الهدف:** إنشاء المجموعات والجداول والحصص دون تعارض.

- [ ] `P04-01` Cohort model: cohort تشير إلى `course_offering` (لا subject/teacher مباشرة عليها)، مع قاعة واسم وسعة وحالة.
- [ ] `P04-02` CRUD المجموعات مع validation لكل tenant-scoped relation، وربط إلزامي بـ`course_offering` ضمن نفس الـTenant.
- [ ] `P04-03` Recurring weekly schedules مع timezone واضح.
- [ ] `P04-04` Holidays وschedule exceptions.
- [ ] `P04-05` كاشف تعارض المدرس/القاعة/الوقت والطاقة الاستيعابية.
- [ ] `P04-06` توليد `class_sessions` idempotently لنطاق زمني محدود.
- [ ] `P04-07` نقل/إلغاء الحصة بسبب مسجل وaudit/event لاحق.
- [ ] `P04-08` Calendar/list UI فعالة على الديسكتوب والموبايل.
- [ ] `P04-09` E2E للمجموعة والجدول والتعارض في النموذجين.

**Exit Gate G04:** يمكن إنشاء مجموعة وجدول وتوليد/تعديل الحصص بلا تكرار أو تعارض أو علاقة خارج Tenant.

---

# PHASE-05 — الطلاب وأولياء الأمور والتسجيل

**Priority:** `P1`
**Dependencies:** `G04`.
**الهدف:** رحلة الطالب من السجل إلى المجموعة وولي الأمر قابلة للتتبع.

- [ ] `P05-01` إضافة/تعديل/أرشفة الطالب مع كود فريد داخل Tenant.
- [ ] `P05-02` قائمة Server-rendered ببحث وفلاتر وpagination وحد أدنى من البيانات حسب الدور.
- [ ] `P05-03` صفحة ملف الطالب وحالات Empty/Error/Archived.
- [ ] `P05-04` Guardian CRUD مع normalized phone وقواعد منع التكرار المناسبة.
- [ ] `P05-05` علاقة N:N بين الطلاب والأولياء، relationship وprimary contact.
- [ ] `P05-06` Enrollment على `course_offering` مع capacity validation ومنع التكرار، و`cohort_members` لوحدة التسليم، ودون أي كتابة في `memberships`.
- [ ] `P05-07` نقل/إيقاف enrollment وcohort membership مع تاريخ وسبب وaudit، والتحقق من اتساق العلاقتين (لا cohort member بلا enrollment نشط لنفس الـoffering).
- [ ] `P05-08` Excel template وparser بحدود حجم/صفوف وPreview للأخطاء والتكرار.
- [ ] `P05-09` Import transaction ونتيجة قابلة للتنزيل دون partial hidden writes.
- [ ] `P05-10` تصدير CSV/Excel من الخادم بصلاحيات وحدود وaudit.
- [ ] `P05-11` Student timeline من enrollment/attendance/finance/assessment events عند توفرها.
- [ ] `P05-12` Merge preview وtransaction لدمج السجلات المكررة وإعادة الربط مع audit.

**Exit Gate G05:** لا ازدواج أو cross-tenant relation، والاستيراد/التسجيل/النقل/ربط ولي الأمر قابلة للتتبع.

---

# PHASE-06 — الاشتراكات والتحصيل

**Priority:** `P1`
**Dependencies:** `G05`.
**الهدف:** رصيد الطالب والفاتورة والمدفوع والإيصال متطابقون.

- [ ] `P06-01` Tuition plans/prices/session packages (`tuition_plans` — رسوم دراسية للعميل، وليست باقات اشتراك المنصة) مرتبطة بـ`course_offering`، مع currency وdecimal constraints، وحسم تصادم مصطلح `Plan` مع باقات SaaS في `P15-01`.
- [ ] `P06-02` Subscriptions/installments state machine وتسعير حسب المجموعة والنموذج.
- [ ] `P06-03` توليد invoices idempotently ومنع ازدواج دورة الفوترة.
- [ ] `P06-04` Payment transaction تدعم cash/transfer/card/reference و`received_by` مشتقًا من الجلسة.
- [ ] `P06-05` Partial payment، credit balance، overpayment policy وحالة invoice محسوبة.
- [ ] `P06-06` Discounts/credit notes/refunds/void عبر قيود عكسية لا تعديل السجل الأصلي.
- [ ] `P06-07` Receipt numbering آمن لكل Tenant/فرع وHTML print/PDF/reprint watermark.
- [ ] `P06-08` Cashier shifts، open/close، cash movements وdaily reconciliation.
- [ ] `P06-09` Aging/overdue report وgrace/service policy.
- [ ] `P06-10` Append-only financial audit وصلاحيات الاعتماد والإلغاء والاسترداد.
- [ ] `P06-11` Revenue/collection/receivables queries مع source reconciliation.
- [ ] `P06-12` ADR لمزود الدفع عند الحاجة، ثم checkout idempotency وsigned webhook/replay protection/reconciliation.

**Exit Gate G06:** كل سيناريو partial/credit/refund/void متزن، ولا دفع مكرر أو سجل مالي قابل للمحو.

---

# PHASE-07 — الحضور والتشغيل اليومي

**Priority:** `P1`
**Dependencies:** `G04` + `G05`; التكامل المالي الكامل يستفيد من `G06`.
**الهدف:** تسجيل حضور حصة كاملة بسرعة ودقة وتدقيق.

- [ ] `P07-01` Roster سريع للحصة وحفظ Bulk attendance داخل Transaction.
- [ ] `P07-02` واجهة touch-friendly وkeyboard-friendly لمجموعة كاملة.
- [ ] `P07-03` Signed QR أو student-code lookup مع rate limit.
- [ ] `P07-04` Unique constraint ومنطق يمنع التكرار أو حضور طالب غير ملتحق بالحصة.
- [ ] `P07-05` Reception mode بأقل بيانات حساسة لازمة.
- [ ] `P07-06` Correction workflow: old/new/reason/actor/approver/audit.
- [ ] `P07-07` إنشاء notification event بعد commit، لا قبله.
- [ ] `P07-08` تقارير الطالب/المجموعة/المدرس/الفرع مع timezone صحيح.
- [ ] `P07-09` E2E للحضور اليدوي وQR والتصحيح والعزل.

**Exit Gate G07:** إنهاء حضور مجموعة خلال دقائق، بلا duplicate أو wrong-group attendance، والتصحيح قابل للتتبع.

---

# PHASE-08 — بوابات المستخدمين وPWA

**Priority:** `P1`
**Dependencies:** `G06` + `G07`.
**الهدف:** كل Persona تنجز رحلتها الأساسية من الهاتف دون صلاحيات زائدة.

- [ ] `P08-01` Student dashboard: الهوية، الجدول، الحضور، الاشتراكات والمدفوعات.
- [ ] `P08-02` Parent dashboard: عدة أبناء، تبديل context، الجدول والحضور والمستحقات لكل ابن مصرح.
- [ ] `P08-03` Teacher dashboard: مجموعاته، حصصه، roster والحضور دون بيانات مالية غير لازمة.
- [ ] `P08-04` Management dashboard من بيانات حقيقية مع مؤشرات قابلة للتتبع وempty/stale/error states.
- [ ] `P08-05` Context chooser/switcher واضح للمستخدم متعدد العلاقات دون login جديد.
- [ ] `P08-06` PWA install وoffline shell فقط، مع منع caching للبيانات الحساسة.
- [ ] `P08-07` WCAG focus/labels/contrast/reduced motion وRTL responsive على المتصفحات الأساسية.
- [ ] `P08-08` E2E لكل Persona وحالات unauthorized/relationship isolation.

**Exit Gate G08:** Management/Teacher/Student/Parent journeys الأساسية تعمل من الهاتف والديسكتوب بعزل صحيح.

---

# PHASE-09 — التقارير ومستحقات المدرسين

**Priority:** `P2`
**Dependencies:** `G06` + `G07` + `G08`.
**الهدف:** أرقام التشغيل والمال قابلة للتتبع إلى المصدر.

- [ ] `P09-01` Teacher contract rules versioned: fixed/percentage/per-student/per-session.
- [ ] `P09-02` Settlement periods/calculation snapshots/approval/payment.
- [ ] `P09-03` اختبارات الغياب والاسترداد وتغيير العقد منتصف الفترة.
- [ ] `P09-04` Daily operations وmonthly management reports.
- [ ] `P09-05` KPI Dictionary: formula/source/owner/cadence/timezone.
- [ ] `P09-06` Server exports بحدود rows وredaction وصلاحيات وaudit.
- [ ] `P09-07` Reconciliation tests تربط كل رقم بمصادره وتغطي empty/stale/data-quality states.

**Exit Gate G09:** التقارير والتسويات reproducible ومتطابقة مع سجلات المصدر.

---

# PHASE-10 — التواصل والإشعارات

**Priority:** `P2`
**Dependencies:** `G07` + `G08`; إشعارات المالية تعتمد `G06`.
**الهدف:** إرسال قابل للإثبات مرة واحدة مع consent واحترام الفشل.

- [ ] `P10-01` Notifications/inbox/read state/preferences داخل التطبيق.
- [ ] `P10-02` Template schema/versioning/variables/preview/approval.
- [ ] `P10-03` Outbox مع retry/backoff/dedup/dead-letter state.
- [ ] `P10-04` ADR لمزود WhatsApp والتكلفة والقوالب، ثم provider adapter.
- [ ] `P10-05` Email provider/domain verification/templates؛ SMS fallback للحالات المعتمدة فقط.
- [ ] `P10-06` Consent/preferences/opt-out/retention enforcement.
- [ ] `P10-07` Signed webhooks وحالة delivery مع replay/out-of-order handling.
- [ ] `P10-08` تنبيهات الغياب والاستحقاق والنتائج واختبارات عدم التكرار.

**Exit Gate G10:** كل رسالة لها event وموافقة وحالة، ولا إرسال مكرر أو webhook غير موثوق.

---

# PHASE-11 — Management Pilot والإطلاق المحدود

**Priority:** `P2`
**Dependencies:** `G03..G10`.
**الهدف:** إثبات Management MVP مع مدرس مستقل وسنتر قبل توسيع النطاق.

- [ ] `P11-01` مقابلات واختبار رحلة مع مدرس مستقل وسنتر وموظف تحصيل ومجموعة طلاب/أولياء أمور.
- [ ] `P11-02` Baseline لمقاييس الوقت والتحصيل والغياب والاستفسارات قبل الاستخدام.
- [ ] `P11-03` تجهيز/import بيانات Pilot للمدرس مع reconciliation وتدريب.
- [ ] `P11-04` تجهيز/import سنتر بفرع واحد ومجموعة ودورة تحصيل وحضور.
- [ ] `P11-05` Support SLA وتصنيف P0–P3 وربط كل مشكلة بتاسك.
- [ ] `P11-06` منع تخصيصات غير قابلة للتعميم: Core/Config/Reject decision log.
- [ ] `P11-07` قياس قبل/بعد وقرار Go/Iterate/Stop لكل فرضية.
- [ ] `P11-08` Privacy/Terms/Retention/Delete/Export policies المناسبة للـPilot.
- [ ] `P11-09` Pilot release checklist وrollback ودعم مباشر.

**Exit Gate G11:** رحلات الإدارة الأساسية مستقرة، وPilot قابل للتجديد أو توجد قرارات تعديل مبنية على بيانات.

---

# PHASE-12 — الأساس التجاري للـLMS

**Priority:** `P3`
**Dependencies:** `G11` + `G02`.
**الهدف:** LMS منتج منفصل، لا امتداد ضمني لطالب السنتر.

- [ ] `P12-01` Product catalog وentitlements versioned لـManagement/LMS/both: `capability_catalog` و`tenant_entitlements` كمصدر الحقيقة، مع `defaultEntitlementsForLevel()` ودعم add-ons (`learning.live`، `storage.extra`…).
- [ ] `P12-02` Online learner identity وonline enrollments منفصلة عن center enrollments.
- [ ] `P12-03` LMS access service يجمع tenant entitlement + online enrollment + payment + release policy.
- [ ] `P12-04` Shared Academy tenant routing على نفس runtime.
- [ ] `P12-05` حالات no-entitlement/no-enrollment/expired/suspended في UI والخادم.
- [ ] `P12-06` اختبارات مستخدم Center-only وOnline-only وBoth دون خلط الحسابات أو التقارير.

**Exit Gate G12:** لا يظهر أو يُفتح LMS إلا عبر entitlement وonline enrollment صريحين.

---

# PHASE-13 — الكورسات والمحتوى والفيديو والبث المباشر

**Priority:** `P3`
**Dependencies:** `G12`.
**الهدف:** نشر محتوى خاص وقياس استخدامه بأمان.

- [ ] `P13-01` Courses/modules/lessons/audiences مع ordering وdraft/published/archived lifecycle.
- [ ] `P13-02` Authoring UI وربط المادة/الجمهور المناسب دون خلط domains.
- [ ] `P13-03` Materials metadata وprivate storage وsigned URLs قصيرة العمر.
- [ ] `P13-04` ADR مقارنة Mux/Cloudflare Stream: cost، signed playback، analytics وحدود الحماية.
- [ ] `P13-05` Video asset lifecycle: upload/process/ready/error وplayback tokens من الخادم.
- [ ] `P13-06` Progress events/aggregation وإكمال الدرس دون كتابة مفرطة.
- [ ] `P13-07` Device registration/concurrency/risk events وwatermark باسم/كود الطالب.
- [ ] `P13-08` Zoom/Google Meet links وlive session metadata دون بناء بث مملوك.
- [ ] `P13-09` Security/E2E: unauthorized URL، expired token، wrong tenant، suspended entitlement.

**Exit Gate G13:** الطالب المصرح فقط يصل للمحتوى، والأسرار لا تصل للعميل، والتقدم قابل للقياس.

---

# PHASE-14 — الواجبات والاختبارات

**Priority:** `P3`
**Dependencies:** `G13`.
**الهدف:** رحلة تقييم كاملة بنتائج صحيحة واستكمال آمن.

- [ ] `P14-01` Question bank/questions/options/tags/versioning والصعوبة.
- [ ] `P14-02` MCQ authoring/validation/preview وتصحيح deterministic.
- [ ] `P14-03` Assessments/windows/attempt limits/randomization snapshots.
- [ ] `P14-04` Server-authoritative timer وتسليم idempotent.
- [ ] `P14-05` Assignments/submissions/private files/grading rubric.
- [ ] `P14-06` Result release/ranking/tie rules وتحليل السؤال ونقاط الضعف.
- [ ] `P14-07` Autosave/resume ومحاكاة انقطاع الشبكة ومنع duplicate submission.
- [ ] `P14-08` Suspicious behavior events دون ادعاء منع الغش بالكامل.
- [ ] `P14-09` Student/Parent/Teacher portal integration والخصوصية.

**Exit Gate G14:** اختبار وواجب كاملان بنتائج قابلة لإعادة الحساب واستكمال آمن وصلاحيات صحيحة.

---

# PHASE-15 — اشتراك SaaS والدعم وWhite-label

**Priority:** `P3`
**Dependencies:** `G11`; LMS limits تعتمد `G12`.
**الهدف:** تحويل المنصة إلى SaaS قابل للبيع والتشغيل دون فقد بيانات العميل عند تغير الخطة.

- [ ] `P15-01` SaaS plans/features/limits/versioning للمدرس والسنتر والمؤسسة وLMS، بحسم التسعير على ثلاثة أبعاد: Product Level × Customer Scale × Add-ons.
- [ ] `P15-02` Usage counters وgrace behavior دون حذف بيانات العميل عند التخفيض.
- [ ] `P15-03` Trial/active/past_due/suspended/canceled state machine وترقية/تخفيض.
- [ ] `P15-04` Platform billing provider وsigned webhooks وفواتير اشتراك المنصة.
- [ ] `P15-05` استكمال Platform Admin subscription/usage/growth/collection reports.
- [ ] `P15-06` Support tickets وtemporary impersonation بسبب/مدة/banner/audit؛ لا وصول دائم مفتوح.
- [ ] `P15-07` White-label branding وcustom domain verification/SSL/isolation عبر `tenant_branding` و`tenant_domains`، مع Host→Tenant resolution، وEntitlement `branding.white_label`/`branding.custom_domain`، وبلا deployment أو codebase منفصل.
- [ ] `P15-08` MRR/churn/ARPA ثم LTV/CAC بعد توفر بيانات كافية، من billing events غير قابلة للتلاعب.

**Exit Gate G15:** العميل يجرب ويشترك ويترقى/يتوقف بأمان، والمنصة تقيس الإيراد والاستخدام بدقة.

---

# PHASE-16 — Production Hardening والإطلاق العام

**Priority:** `P4` بعد نجاح Pilot، مع بقاء إصلاحات الأمان الحرجة `P0`.
**Dependencies:** المنتج المراد إطلاقه اجتاز Gates الخاصة به، وعلى الأقل `G11` للإدارة و`G15` للإطلاق التجاري الكامل.
**الهدف:** إطلاق محدود ثم عام بخطة تشغيل واستعادة وحوادث واضحة.

- [ ] `P16-01` Schema Freeze declaration وتثبيت forward-only migration policy.
- [ ] `P16-02` فصل Development/Staging/Production databases/secrets/domains وleast-privilege DB roles.
- [ ] `P16-03` Threat model نهائي ومراجعة Auth/authorization/storage/payment/messaging.
- [ ] `P16-04` SAST/dependencies/secrets/license checks وpatch policy.
- [ ] `P16-05` Load/capacity tests للرحلات الحرجة وSLOs وتنبيهات.
- [ ] `P16-06` Quarterly restore drill وautomated backup verification.
- [ ] `P16-07` Incident runbooks وشدة/مسؤولية/تواصل/postmortem.
- [ ] `P16-08` Data migration/domain/cutover/rollback checklist وإطلاق محدود.
- [ ] `P16-09` Self-service onboarding/help center/support analytics.
- [ ] `P16-10` توسع متعدد الفروع والعملاء تدريجيًا بعد مراقبة الاستقرار.
- [ ] `P16-11` تقييم Flutter فقط من بيانات استخدام وحاجة Offline/Push/Stores؛ إن اعتمد يوضع له Plan مستقل داخل هذه الخطة وقتها.

**Exit Gate G16:** لا ثغرات حرجة، restore ناجح، المراقبة والحوادث فعالتان، والرحلات المدفوعة مستقرة وقابلة للدعم.

---

## 7. بوابات الاختبار حسب نوع التغيير

| نوع التغيير | الحد الأدنى الإلزامي |
|---|---|
| Schema/constraint/isolation | baseline validation + positive/negative tenant tests + rollback/reset safety |
| Repository/DAL | authorized + unauthorized + wrong tenant/relationship + bounded reads |
| Server Action | validation + unauthorized + wrong scope + success + idempotency عند الحاجة |
| Auth/session | malformed/expired/revoked/replay + digest-only persistence + rate limiting |
| Payment | Decimal + duplicate/replay + partial/refund/void + reconciliation |
| UI form | validation + pending + error + keyboard + mobile RTL |
| Report/export | source reconciliation + timezone + empty/stale + limits/redaction |
| Webhook/integration | signature + replay + retry + duplicate + out-of-order |
| PWA/offline | cache boundaries + stale assets + no sensitive response caching |
| Sensitive file | MIME/size + private access + expired/wrong-user signed URL |

## 8. القرارات المؤجلة ومواعيد حسمها

| القرار | لا يُحسم قبل | معيار القرار |
|---|---|---|
| إصدار PostgreSQL | **محسوم** | **PostgreSQL 18** لكل البيئات بقرار المالك؛ تُرقّى بيئة التطوير من 16.13 إلى 18 قبل `P01-08`. |
| Private storage provider | `P03-02` أو `P13-03` | الخصوصية، signed URLs، backup، التكلفة والتشغيل الذاتي. |
| Paymob أم بديل | `P06-12` | الرسوم، settlement، webhook reliability والسوق المستهدف. |
| WhatsApp provider | `P10-04` | اعتماد القوالب، التكلفة، الدعم، delivery webhooks. |
| Mux أم Cloudflare Stream | `P13-04` | التكلفة، signed playback، analytics وحدود الحماية. |
| إطلاق White-label/custom domain تجاريًا | `P15-07` | جاهزية التحقق وSSL وسياسة الدعم، وإثبات أن السوق يدفع مقابل الـadd-on. |
| أسعار وحدود الباقات على الأبعاد الثلاثة | `P15-01` بعد Pilot | استعداد الدفع والاستخدام الفعلي، لا التخمين. |
| بنية تحتية/قاعدة بيانات مخصصة للمؤسسات | بعد `G15` | طلب مؤسسي مثبت + تكلفة تشغيل، وتبقى غير افتراضية. |
| Flutter | `P16-11` | حاجة مثبتة لـOffline/Push/Stores لا يكفيها PWA. |

## 9. عوائق وقرارات بشرية مفتوحة

| ID | الحالة | المطلوب | المالك |
|---|---|---|---|
| `P01-12` | `TODO` | مورد استعادة معزول وتكلفته إن كانت هناك تكلفة. | مالك المشروع |
| GitHub main protection | `DEFERRED` | تفعيل required PR/checks ومنع force push عند اعتماد ذلك. | مالك المشروع |
| CODEOWNERS | `DEFERRED` | يفعّل عند انضمام فريق. | مالك المشروع |
| Automated WhatsApp recovery | `DEFERRED` | يبقى الإرسال اليدوي حتى `P10-04`. | مالك المشروع |

## 10. ما تم إنجازه قبل المؤشر الحالي

- Next.js PWA عربية RTL، GitHub/CI/Preview baseline.
- Landing page عامة.
- Platform Admin control plane: overview، tenants، users، requests، reports، audit وتجهيزات recovery.
- Workspace request/approval flow.
- Fresh Auth application-owned على PostgreSQL: signup/login/logout/sessions/bootstrap/recovery.
- Team memberships/invitations على PostgreSQL.
- Student/Parent initial server reads وcontext resolver.
- Clean PostgreSQL baseline ومسارات smoke/reset الآمنة.
- Integration harness منفصل يحمي `saboraty`، و56 integration + 42 unit tests موثقة في `P00-04`.

هذه ليست دلالة على اكتمال Management أو LMS؛ المراحل `P03..P16` ما زالت تمثل البناء المتبقي.

## 11. سجل التنفيذ المختصر

يسجل هنا فقط إغلاق Tasks من الآن فصاعدًا؛ تاريخ التفاصيل القديمة محفوظ في Git history ولا يعاد نسخه.

| التاريخ | Task | الدليل | النتيجة/المؤشر التالي |
|---|---|---|---|
| 2026-09-08 | `P00-04` | 42 unit + 56 PostgreSQL integration؛ lint/typecheck/migrations/secrets/build ناجحة؛ reset guards رفضت `saboraty` و`DATABASE_URL` وnon-loopback | `P00-05` اختبار يدوي شامل |
| 2026-09-08 | `P00-05` | أُغلقت بقرار المالك دون دورة يدوية مستقلة؛ نُقلت مراجعة كل Persona وصلاحياتها ورحلاتها إلى `P02` و`P08` | `P00-06` إغلاق INFRA-011 |
| 2026-09-09 | `P00-06` | Node.js `22.23.2`: `npm run check` نجح مع 45 unit tests وbuild؛ 56/56 integration على `saboraty_test`؛ Browser smoke أكد login/recovery وFresh Auth error وlocal bootstrap وأن `/auth/callback` أصبح 404؛ المسح أكد عدم وجود Supabase runtime/config/callback نشط، وفُصل GitHub repository عن مشروع Vercel القديم. شُغّلت Advisors قراءةً فقط على مشروع Supabase المتقاعد وأظهرت تحذيرات legacy SECURITY DEFINER/Auth وسياسات RLS وفهارس غير مستخدمة؛ لم تُجرَ تغييرات remote لأنها خارج Runtime الحالي. | `P01-01` جرد البنية الفعلية وجاهزية Staging |
| 2026-09-09 | `P01-01` | صور Coolify وتأكيد المالك أثبتا بيئتي production/staging وموارد التطبيق/PostgreSQL الداخلية؛ نُظفت المتغيرات إلى `DATABASE_URL`، دُوّرت الأسرار المكشوفة، فُصل Vercel Git، وأُنشئ فرع `staging` الدائم. | `P01-02` نشر Staging عبر CI ثم Smoke فعلي |
| 2026-09-09 | `P01-02` | PRs `#5/#6` اجتازا CI ونُشر Staging فقط؛ نجح HTTPS/health/browser smoke. بعد اكتشاف اشتراك البيئتين في `DATABASE_URL`، أُنشئت Production PostgreSQL مستقلة؛ أثبت `system_identifier` اختلاف الـclusters (`…5510` مقابل `…4726`) وحُفظت URL الداخلية الجديدة في تطبيق Production دون Deploy. إعادة الفحص: Staging PostgreSQL health `200` وProduction القديمة ما زالت `200` دون تغيير. | `P01-03` baseline/readiness على Staging |
| 2026-09-11 | `P01-03` | ثبت أن 26 جدول Staging القديمة بلا صفوف؛ طُبقت baseline من ملفين متحققي SHA-256 على قاعدة مؤقتة ثم ذريًا على Staging وProduction المستقلتين. نجحت 21/21 smoke checks، و45 unit + 58 integration، وCI على PRs `#10/#11`. أعاد `/api/health` و`/api/readiness` في البيئتين `200`، ونُشر Runtime نفسه على Production. | `P01-04` عقد المنتج |
| 2026-09-11 | `P01-04` | `docs/PRODUCT_VISION.md` جديد (البُعدان، المستويات الثلاثة، كتالوج القدرات `ops.core`..`payments.online`، طبقات Entitlement/RBAC/Scope، التسعير الثلاثي، الاستضافة وWhite-label، Available/Coming Soon/Planned)؛ ADR `0001` (البُعدان) و`0002` (Entitlements فوق RBAC) و`0003` (فصل Subject/Teacher/Course/Offering) و`0004` (Branding/Domains) و`0005` (Baseline واحد وReset)؛ تحديث `MASTER_EXECUTION_PLAN` (القسم 3/4/5/6/8/9/12 + إعادة ترقيم PHASE-01 إلى `P01-04..P01-15`)؛ `RBAC_MATRIX` بقسم طبقات القرار ونقل Teacher scope إلى `course_offerings.teacher_id`/`course_teachers` وإضافة موارد الكتالوج؛ `AGENTS.md` و`README.md`. صفر تغيير في الكود أو قاعدة البيانات. | `P01-05` Landing Page |
| 2026-09-11 | قرار المالك | **PostgreSQL 18** هو الإصدار المعتمد لكل البيئات؛ بيئة التطوير المحلية 16.13 تُرقّى قبل `P01-08`. **العمل اليومي على قاعدة التطوير**، وStaging ثم فلو التسليم قبل Production. | مسجّل في القسم 5 والحالة أعلاه و`adr/0005` |
| 2026-09-11 | `P01-05` | Landing Page جديدة: `src/lib/product/feature-status.ts` + `src/components/product-status-chip.tsx` + `src/lib/product/product-vision-content.ts` كمصادر حقيقة واحدة، وإعادة بناء `src/components/landing-page.tsx` بأقسام البُعدين/المستويات/الكتالوج/الاستضافة/الترقية/مفتاح الحالات وشريط الحالة الحقيقية. إزالة وعد «ابدأ مجانًا» ورابط لوحة المنصة من الصفحة العامة. تحقق آلي: 143 وسم (18/51/74)، 14 قسمًا، صفر Overflow على 390/768/1280، صفر Console errors، `npm run check` كامل ناجح. | `P01-06` Commercial Foundation |
| 2026-09-11 | `P01-07` | الكتالوج الأكاديمي في الـbaseline: `rooms`/`stages`/`grades`/`subjects`/`teachers`/`courses`/`course_teachers`/`course_offerings`/`cohort_members`، وإعادة بناء `cohorts` على `course_offering_id`، و`enrollments` على العرض، و`students.grade_id`، و`user_id` إلى `unique(tenant_id, user_id)`. قيد يمنع عروضًا بمدرس غير مسند للمقرر. تحديث `portal-data` (بوابتا الطالب وولي الأمر) و`fixtures` واختبارات العزل (+12). 51/51 smoke على PG 18.6، 74 integration، `check` ناجح. | `P01-08` تحقق Baseline |
| 2026-09-11 | `P01-08` | تحقق إلزامي على قاعدة PG 18.6 قابلة للحذف قبل أي Reset: schema + isolation + 51/51 smoke + `lint`/`typecheck`/57 unit/74 integration/`build`/`check`. منع `on delete` غير صحيح في `course_offerings`. | `P01-09` Clean Reset |
| 2026-09-11 | `P01-10`..`P01-15` | عقد التخزين (`adr/0006`: PostgreSQL خلف منفذ `PrivateStorage` للفئة الصغيرة، ومزوّد الفيديو مؤجل بـADR)؛ نسخ احتياطي مشفّر بتحقق عكسي وmanifest وretention (12 اختبار) وتشغيل فعلي 133,616 بايت؛ تجربة استعادة كاملة على قاعدة محمية (46/46 smoke، RTO 0.3s، RPO 121s، كلمة مرور تُتحقق، عزل مرفوض عبر المساحات، استحقاقات محفوظة) و6 اختبارات حراسة؛ سجل منظم منقّح لـPII (19 اختبار) موصّل بمسار فشل حقيقي؛ فحص آلي يمنع رجوع Supabase/Vercel مدمج في `check` (5 اختبارات)؛ و`OPERATIONS_RUNBOOK.md` بالنسخ والاستعادة والمراقبة وRollback وشروط الإزالة. | `P02-00` فرض الاستحقاق على البوابات |
| 2026-09-11 | 2026-09-11 | 2026-09-11 | `P02-06` | مسار موثوق لربط الهوية: `portal_invitations` + `/claim` + خدمة قبول تشترط الرمز **و** تطابق البريد **و** سجلًا غير مربوط. **قبلها لم يكن هناك أي مسار تطبيقي يكتب `students.user_id`.** **ثلاث علل مخطط:** مفتاح أجنبي واحد كان يمنع دعوات أولياء الأمور، وقيد فريد لا يمنع التكرار بسبب NULL، و`updated_at` ناقص في `students`. **واكتشاف PostgreSQL:** `FOR UPDATE` يُطبّق سياسة UPDATE فيفشل بلا سياق مساحة — أُعيد ترتيب القفل. 25 اختبار تكامل وتحقق حي لكل الحالات. | `P02-07` نقل الملكية |
| 2026-09-11 | `P02-05` | **فجوة أُغلقت:** 6 صفوف في مصفوفة الصلاحيات (الفروع، القاعات، المراحل/الصفوف/المواد، المدرسون، المقررات، العروض) كانت موثّقة بلا أي قدرة مقابلة — أُضيفت 12 قدرة (المجموع 46). **فحص نطاق المدرس** مبني على `course_offerings.teacher_id` مع تفريع للطلاب والمجموعات والحصص. **مطابقة الوثيقة بالكود** اختبار صريح يحوّل جدول §4 إلى بيانات. **تصادم فضاءَي تسمية** (`payments.` و`branches.`) اكتشفه الاختبار وأُصلح بإعادة تسمية مفتاحَي استحقاق وقاعدة رفض آلية. 173 unit + 138 integration و`check` كامل ناجح، وتحقق بصري لأدوار المالك والمحاسب والمدرس. | `P02-06` claim flow |
| `P02-11` | تحديد معدّل المحاولات على 7 مسارات مصادقة، مدعوم بـPostgreSQL (`private.auth_attempts` + دالتان `security definer`) بلا مزوّد جديد وبلا تخزين أي معرّف خام. التسجيل والعدّ في نداء واحد مع قفل استشاري، والنجاح يمحو المحاولات. **علّة اكتُشفت حيًّا:** حدّ واحد مشترك كان يُقفل كل الحسابات خلف عنوان واحد، فصارت الحدود اثنتين (حساب ضيّق، مصدر أوسع). 18 وحدة + 12 تكامل، وتحقّق حي للدخول وكود الاستعادة والاستعادة والإغراق الموزّع. | `P02-05` مصفوفة الصلاحيات |
| 2026-09-11 | `P02-04` | الواجهة تقرأ قرار الخادم: `capabilityReport` + `isEntitlementBlocked`/`isRoleBlocked`، وصفحة `/team` تفرّق بين رسالة الترقية ورسالة الدور وتحجب قائمة الفريق عند سقوط `team.read`، والخادم يبقى السلطة. **اكتشافان بالتحقق البصري:** سياسة `tenants` منعت العضو من قراءة مساحته (307 إلى `/login`)، وسياسة `app_users` أخفت الزملاء فظهر عضو واحد بدل اثنين — أُضيفت `tenants_member_read` و`app_users_colleague_read` مع اختبارات لكل منهما واختبار عدم تسريب بعد تعطيل العضوية. كشف آخر: استعلامات متوازية على اتصال معاملة واحد (مهجورة في pg@9) حُوّلت إلى تسلسلية. 130 unit + 112 integration و`check` كامل ناجح، وتحقق بصري لكل الرحلات + `/team` على 390/768/1280. | `P02-05` مصفوفة الصلاحيات |
| `P02-03` | عزل RLS مُلزم بـ132 سياسة و`FORCE RLS` على 33 جدولًا، وأدوار منفصلة (`saboraty_app` للـruntime، المالك للتطبيق والبذر) بعد إثبات أن الـsuperuser يتجاوز السياسات، وإعادة توصيل ~15 ملف DAL لفتح سياق معاملة بـ`set_config(..., true)`. 12 اختبار إلزام RLS بدور التطبيق + 105 integration + 123 unit، وتحقق بصري فعلي: الدخول وبوابتا الطالب وولي الأمر ولوحة المنصة تعمل تحت RLS مُلزم. | `P02-04` ربط UI بالقدرات |
| `P02-01`+`P02-02` | عقد قرار مركزي واحد (`evaluateAccess`) بترتيب الطبقات الثلاث و7 أسباب رفض ورسائل عربية مميزة (16 اختبار وحدة)، وموصّل في DAL الخادمي: قراءة الاستحقاقات النشطة داخل نافذة فعاليتها، و`EntitlementError` منفصل عن `AuthorizationError`، وفحص النطاق لا يعمل عند فشل الاستحقاق. 11 اختبار تكامل جديد (93 إجمالًا). | `P02-03` سياسات العزل |
| 2026-09-11 | `P02-00` | **مهمة مستقلة اختيرت صراحةً** لأن `P01-14-M` متوقفة على وصول بنية تحتية. أُغلقت ثغرة البوابات: `entitlement-service` يقرأ القدرات النشطة داخل نافذة فعاليتها، و`portal-access` يربط كل بوابة بقدرتها، وطبقة `portal-data` تُرجع `entitled:false` **قبل أي قراءة بيانات**. حالة «لا اشتراك» أصبحت واجهة مقصودة تشرح الفجوة والترقية (`PortalNotEntitled`). تحقق آلي: 8 اختبارات تكامل (عمليات/إدارة/تعلم/مسحوبة/منتهية/معلّقة/عابرة للمساحات)، و82 integration. تحقق بصري فعلي: مع الاشتراك تظهر بيانات الطالب، وبعد سحبه تظهر حالة «غير مفعّلة» **بلا أي بيانات طالب**، وبعد إعادته رجعت البيانات دون فقد. صفر Overflow على 390/768/1280 وصفر أخطاء Console. | `P02-01` capability contract |
| 2026-09-11 | `P01-09` | Clean Reset لقاعدة التطوير: `saboraty` أُعيدت على PG 18 (5433) من الـbaseline + catalog seed + canonical demo seed (حساب واحد Platform Admin و4 حسابات Tenant/بوابة بنفس Fresh Auth credentials)، وreconciliation لـ24 عدّاد، واتساق التسليم/التسجيل. Smoke tests فعلية: Platform Admin → `/platform-admin` (النموذجان والمستويان ظاهران)، مركز/مدرس → لوحة الإدارة، ولي أمر → `/parent` بشريط الأبناء، طالب → `/student` ببيانات حقيقية (4 حصص، 4 حضور، فاتورة 500 ومدفوع 250). `/api/health` و`/api/readiness` = 200. | `P01-10` Private Storage |
| 2026-09-11 | `P01-06` | ثُبّت **PostgreSQL 18.6** محليًا ومعه قاعدة اختبار على المنفذ `5433`. الـbaseline طُبّق نظيفًا عليه: 26 جدولًا، 32/32 smoke checks. الطبقة التجارية: 8 enums جديدة، `tenants.tenant_type`/`product_level`/`currency`/`timezone`/`locale`، جداول `capability_catalog`/`tenant_entitlements`/`tenant_branding`/`tenant_domains`، وتحديث `workspace_requests`. مصادر الحقيقة: `capability-catalog.json` (25 قدرة) + `capability-catalog-rules.mjs` مشترك + `default-entitlements.ts`. موافقة طلب المساحة تمنح قدرات المستوى داخل نفس Transaction وتُدقّق القرار في `platform_audit_logs`. `reset-test-database.mjs` يبذر الكتالوج. `vitest.config.mts` أُضيف لحل مسار `@`. النتيجة: 57 unit + 64 integration (8 ملفات) و`npm run check` كامل ناجح. | `P01-07` Academic Catalog |

## 12. قواعد صيانة الخطة

- هذا الملف وحده يملك `CURRENT_PHASE` و`CURRENT_TASK` و`NEXT_TASK`.
- `PRODUCT_VISION.md` هو العقد المرجعي لنموذج المنتج؛ أي تغيير فيه يجب أن ينعكس على هذا الملف و`RBAC_MATRIX.md` و`AGENTS.md` و`README.md` في نفس التاسك.
- كل قرار معماري بعيد المدى يُسجَّل كـADR في `docs/adr/` بدل تركه في نص متفرق؛ القرار المعتمد لا يُعدَّل بل يُضاف قرار جديد يشير إليه.
- لا يُنشأ Backlog أو migration plan موازٍ. أي خطة جديدة تُضاف كمرحلة/Task هنا.
- المراجع التخصصية تصف عقدًا فقط ولا تحتوي مؤشر تنفيذ مستقلًا.
- لا تُترك Task بحالة `DONE` مع Acceptance ناقصة أو نتيجة اختبار غير مسجلة.
- عند تغير الأولوية، يسجل السبب والاعتماديات؛ لا يعاد ترتيب العمل بصمت.
- عند اكتشاف عمل جديد، يوضع تحت المرحلة الصحيحة ولا يصبح Current تلقائيًا.
- حافظ على سجل التنفيذ مختصرًا؛ التفاصيل الكاملة في commits/PRs ونتائج CI.
