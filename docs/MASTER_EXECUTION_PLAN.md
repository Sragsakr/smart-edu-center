# Smart Edu Center — Master Execution Plan

> **المصدر الوحيد لترتيب وتنفيذ العمل في المشروع.** لا توجد خطة موازية أو Technical Backlog منفصلة. المراجع التخصصية لا تحدد ترتيب العمل ولا تملك مؤشر Task.

## 1. مؤشر التنفيذ الحالي

```text
CURRENT_PHASE: PHASE-01 — البنية البديلة وجاهزية Staging
CURRENT_TASK: P01-01 — جرد وتأكيد حالة Coolify/VPS/PostgreSQL/TLS/domains/secrets
NEXT_TASK: P01-02 — نشر Staging من GitHub عبر CI إلى Coolify وربط PostgreSQL الخاصة
CURRENT_PRIORITY: P0 — Release blocker
PRODUCT_FEATURE_FREEZE: ACTIVE حتى اكتمال PHASE-02
SCHEMA_MODE: BUILD MODE — reset/reseed مصرح به؛ لا توجد production data contract
LAST_VERIFIED_AUTOMATED_GATE: 45 unit tests + 56 PostgreSQL integration tests + lint + typecheck + migration/secrets checks + build
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
- العمليات متعددة الخطوات الحساسة Transactional وIdempotent حيث يلزم.
- Audit للماليات والحضور والصلاحيات والعمليات الحساسة.
- Loading/Empty/Error/Unauthorized states عند لمس الواجهة.
- RTL وKeyboard وMobile/Desktop عند لمس الواجهة.
- `npm run lint` و`npm run typecheck` والاختبارات المناسبة و`npm run build` ناجحة.
- `npm run check:migrations` و`npm run check:secrets` عند لمس DB/configuration.
- تحديث التوثيق ومؤشر التنفيذ وسجل النتيجة.

راجع أيضًا [`ENGINEERING_PRINCIPLES.md`](ENGINEERING_PRINCIPLES.md) و[`RBAC_MATRIX.md`](RBAC_MATRIX.md).

## 4. قواعد المنتج والمعمارية غير القابلة للكسر

- المنتج Web PWA عربي RTL لنموذجي `center` و`independent_teacher`.
- PostgreSQL self-managed هو application database الوحيد، وFresh Auth مملوك للتطبيق.
- Management وLMS منتجان/Entitlements منفصلان على نفس المنصة.
- Center Student وOnline Student علاقتان منفصلتان لهوية واحدة؛ لا `student_type` وحيد يخلطهما.
- Platform Admin له `/platform-control/login` و`/platform-admin` منفصلان.
- Management/Student/Parent يستخدمون `/login`، وتحدد العلاقات المحمية الـcontext بعد المصادقة.
- Student وGuardian ليسا Tenant memberships.
- Server Components افتراضيًا؛ `use client` عند أصغر interactive boundary.
- القراءات في Server-only DAL، والـUI mutations في Server Actions، والـwebhooks في Route Handlers.
- لا Marketplace ولا ERP كامل ولا بث فيديو مملوك ولا microservices/Redis/queues دون حاجة مثبتة.
- Platform Admin لا يملك قراءة دائمة مفتوحة لبيانات الطلاب؛ دعم Tenant مستقبلًا مؤقت ومدقق.

## 5. Build Mode وقاعدة البيانات

الحالة الحالية `BUILD MODE`. حتى إعلان المالك صراحة `SCHEMA FREEZE / PRODUCTION DATA MODE`:

1. الـcanonical schema هو `postgres/baseline/0001_smart_edu_center_clean.sql`.
2. نفضل الـtarget model الصحيح على توافق بيانات Demo قديمة.
3. يسمح Reset/Reseed لبيانات العمل التجريبية بعد موافقة المالك، مع حماية حسابات المالك/Platform Admin الحقيقية.
4. قاعدة `saboraty` لا تستخدم كقاعدة اختبارات ولا تُمس من test reset scripts.
5. Integration tests تستخدم `TEST_DATABASE_URL` منفصلًا على loopback، ولا يساوي `DATABASE_URL`.
6. لا تُنقل password hashes أو raw session/invitation/recovery tokens.
7. Seed/import يكون deterministic وبترتيب Foreign Keys مع reconciliation.
8. بعد Schema Freeze تصبح كل التغييرات forward-only reviewed migrations مع Restore/Rollback planning.

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

- [-] `P01-01` **CURRENT:** جرد وتأكيد الحالة الفعلية لـCoolify/VPS/PostgreSQL/TLS/domains/secrets دون افتراض صحة مستندات الهجرة القديمة.
- [ ] `P01-02` نشر Staging من GitHub عبر CI إلى Coolify وربطها بقاعدة PostgreSQL خاصة غير مكشوفة للإنترنت.
- [ ] `P01-03` تطبيق الـbaseline على قاعدة نظيفة وإثبات reproducible setup وhealth/readiness checks.
- [ ] `P01-04` بناء canonical seed/import صغير لنموذجي center وindependent teacher بهويات/علاقات Synthetic فقط، مع reconciliation counts.
- [ ] `P01-05` تحديد استراتيجية Private Storage عند أول Feature ملفات؛ إن لم توجد ملفات مطلوبة حاليًا تسجل `N/A until P03/P13` بدل إضافة مزود بلا حاجة.
- [ ] `P01-06` Backup آلي مشفر Off-server لPostgreSQL وملفات التطبيق، مع retention وchecksums وفشل observable.
- [ ] `P01-07` Restore drill داخل بيئة معزولة، وقياس RPO/RTO والتحقق من Auth وtenant isolation بعد الاستعادة.
- [ ] `P01-08` Monitoring: uptime، health، logs، CPU/RAM/disk/database connections وتنبيهات أساسية؛ error tracking مع PII scrubbing.
- [ ] `P01-09` Staging validation لكل الرحلات الحرجة، وفحص عدم وجود Supabase/Vercel runtime dependency.
- [ ] `P01-10` توثيق Rollback/Cutover ومنع حذف البنية القديمة قبل إثبات النسخة والاستعادة؛ decommission عند الأمان فقط.

**Exit Gate G01:** Staging PostgreSQL-only مستقرة، deployment قابل للتكرار، backup وrestore مختبران، monitoring نشط، ولا database public exposure.

---

# PHASE-02 — الصلاحيات والملكية والجلسات والعزل

**Priority:** `P0`
**Dependencies:** `G01`.
**الهدف:** إغلاق بوابة IAM قبل توسيع بيانات وعمليات العملاء.

مرجع الصلاحيات الملزم: [`RBAC_MATRIX.md`](RBAC_MATRIX.md).

- [ ] `P02-01` مراجعة وتثبيت capability contract للأدوار Owner/Admin/Teacher/Receptionist/Accountant.
- [ ] `P02-02` DAL مركزي يفرض authenticated user + active tenant + capability + resource scope، دون ثقة في UI أو tenant ID مرسل.
- [ ] `P02-03` سياسات database isolation/constraints المناسبة لكل Resource؛ عدم الاعتماد على application filtering وحده للحدود الحرجة.
- [ ] `P02-04` ربط UI بـserver-derived capabilities للعرض/التعطيل فقط، مع بقاء الخادم هو authority.
- [ ] `P02-05` Role × Resource × Action suite موجبة وسالبة، تشمل teacher cohort scope وfinance scope.
- [ ] `P02-06` Student/Guardian trusted invite/claim flow يمنع ربط هوية بسجل شخص آخر.
- [ ] `P02-07` نقل الملكية Transactionally ومنع إزالة/تعطيل آخر Owner، مع confirmation وaudit.
- [ ] `P02-08` إدارة الجلسات والأجهزة: list، revoke one، logout all، وتعطيل جلسات الحساب عند الحاجة.
- [ ] `P02-09` تعطيل membership يمنع الإجراءات الحساسة فورًا دون التأثير على memberships في Tenants أخرى.
- [ ] `P02-10` IDOR/BOLA tests لكل Server Action/Route Handler قائم، وcross-tenant CRUD matrix.
- [ ] `P02-11` Threat model أولي لـAuth/tenant boundaries وrate limiting لمسارات login/recovery/invite/bootstrap.

**Exit Gate G02:** صفر وصول عابر معروف، لا role escalation، لا فقد آخر Owner، والجلسات المسحوبة/المعطلة لا تمنح صلاحيات.

**عند G02:** ينتهي `PRODUCT_FEATURE_FREEZE` وتبدأ أولوية Management MVP.

---

# PHASE-03 — أساس إدارة الـTenant

**Priority:** `P1`
**Dependencies:** `G02`.
**الهدف:** مساحة عمل قابلة للإعداد الفعلي لنموذجي السنتر والمدرس المستقل.

- [ ] `P03-01` إعدادات Tenant: الاسم، بيانات التواصل، المنطقة الزمنية، العملة، اللغة والحالة.
- [ ] `P03-02` شعار وهوية عبر Private Storage approved design مع MIME/size validation وروابط آمنة.
- [ ] `P03-03` CRUD الفروع للسنتر مع archive بدل الحذف عند وجود تبعيات.
- [ ] `P03-04` CRUD القاعات والطاقة الاستيعابية وtenant-composite constraints.
- [ ] `P03-05` المراحل/الصفوف والمواد، uniqueness وترتيب وأرشفة داخل Tenant.
- [ ] `P03-06` ملفات الموظفين والمدرسين مرتبطة بالmembership وحالة active/inactive.
- [ ] `P03-07` إعداد Navigation/labels حسب `center` أو `independent_teacher`، وإخفاء تعقيد الفرع/الموظفين غير اللازم للمدرس المستقل.
- [ ] `P03-08` Empty/loading/error/unauthorized states وresponsive RTL.
- [ ] `P03-09` E2E لإعداد Center وIndependent Teacher من مساحة مقبولة وفارغة.

**Exit Gate G03:** يمكن للنموذجين إعداد مساحة تشغيل صحيحة دون بيانات ثابتة أو علاقات cross-tenant.

---

# PHASE-04 — التشغيل الأكاديمي

**Priority:** `P1`
**Dependencies:** `G03`.
**الهدف:** إنشاء المجموعات والجداول والحصص دون تعارض.

- [ ] `P04-01` Group/cohort model: grade، subject، teacher، branch، room، capacity والحالة.
- [ ] `P04-02` CRUD المجموعات مع validation لكل tenant-scoped relation.
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
- [ ] `P05-06` Enrollment في مجموعة مع capacity validation ومنع التكرار.
- [ ] `P05-07` نقل/إيقاف enrollment مع تاريخ وسبب وaudit.
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

- [ ] `P06-01` Plans/prices/session packages مع currency وdecimal constraints.
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

- [ ] `P12-01` Product catalog وentitlements versioned لـManagement/LMS/both.
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

- [ ] `P15-01` Plans/features/limits/versioning للمدرس والسنتر والمؤسسة وLMS.
- [ ] `P15-02` Usage counters وgrace behavior دون حذف بيانات العميل عند التخفيض.
- [ ] `P15-03` Trial/active/past_due/suspended/canceled state machine وترقية/تخفيض.
- [ ] `P15-04` Platform billing provider وsigned webhooks وفواتير اشتراك المنصة.
- [ ] `P15-05` استكمال Platform Admin subscription/usage/growth/collection reports.
- [ ] `P15-06` Support tickets وtemporary impersonation بسبب/مدة/banner/audit؛ لا وصول دائم مفتوح.
- [ ] `P15-07` White-label branding وcustom domain verification/SSL/isolation.
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
| Private storage provider | `P03-02` أو `P13-03` | الخصوصية، signed URLs، backup، التكلفة والتشغيل الذاتي. |
| Paymob أم بديل | `P06-12` | الرسوم، settlement، webhook reliability والسوق المستهدف. |
| WhatsApp provider | `P10-04` | اعتماد القوالب، التكلفة، الدعم، delivery webhooks. |
| Mux أم Cloudflare Stream | `P13-04` | التكلفة، signed playback، analytics وحدود الحماية. |
| أسعار وحدود الباقات | `P15-01` بعد Pilot | استعداد الدفع والاستخدام الفعلي، لا التخمين. |
| Flutter | `P16-11` | حاجة مثبتة لـOffline/Push/Stores لا يكفيها PWA. |

## 9. عوائق وقرارات بشرية مفتوحة

| ID | الحالة | المطلوب | المالك |
|---|---|---|---|
| `P01-07` | `TODO` | مورد استعادة معزول وتكلفته إن كانت هناك تكلفة. | مالك المشروع |
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
| 2026-09-09 | `P00-06` | Node.js `22.23.2`: `npm run check` نجح مع 45 unit tests وbuild؛ 56/56 integration على `saboraty_test`؛ Browser smoke أكد login/recovery وFresh Auth error وlocal bootstrap وأن `/auth/callback` أصبح 404؛ المسح أكد عدم وجود Supabase runtime/config/callback نشط. شُغّلت Advisors قراءةً فقط على مشروع Supabase المتقاعد وأظهرت تحذيرات legacy SECURITY DEFINER/Auth وسياسات RLS وفهارس غير مستخدمة؛ لم تُجرَ تغييرات remote لأنها خارج Runtime الحالي. | `P01-01` جرد البنية الفعلية وجاهزية Staging |

## 12. قواعد صيانة الخطة

- هذا الملف وحده يملك `CURRENT_PHASE` و`CURRENT_TASK` و`NEXT_TASK`.
- لا يُنشأ Backlog أو migration plan موازٍ. أي خطة جديدة تُضاف كمرحلة/Task هنا.
- المراجع التخصصية تصف عقدًا فقط ولا تحتوي مؤشر تنفيذ مستقلًا.
- لا تُترك Task بحالة `DONE` مع Acceptance ناقصة أو نتيجة اختبار غير مسجلة.
- عند تغير الأولوية، يسجل السبب والاعتماديات؛ لا يعاد ترتيب العمل بصمت.
- عند اكتشاف عمل جديد، يوضع تحت المرحلة الصحيحة ولا يصبح Current تلقائيًا.
- حافظ على سجل التنفيذ مختصرًا؛ التفاصيل الكاملة في commits/PRs ونتائج CI.
