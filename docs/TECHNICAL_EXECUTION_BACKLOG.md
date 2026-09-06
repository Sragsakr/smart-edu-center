# Smart Edu Center — Technical Execution Backlog

هذا الملف يحوّل `MASTER_DELIVERY_PLAN.md` إلى خطوات هندسية قابلة للتنفيذ. الخطة الرئيسية تحدد **ماذا ولماذا**؛ وهذا الملف يحدد **كيف وبأي ترتيب وكيف نثبت الاكتمال**.

## مؤشر التنفيذ التقني

```text
CURRENT_TECHNICAL_EPIC: FND-007 — فصل البيئات ومتغيرات التشغيل
CURRENT_TECHNICAL_TASK: FND-007-03 — إنشاء بيئتي Supabase وVercel للإنتاج
NEXT_TECHNICAL_TASK: FND-007-04 — توثيق Development/Preview/Production
```

## قواعد التشغيل

1. نفّذ `CURRENT_TECHNICAL_TASK` فقط.
2. راجع Dependencies قبل لمس الكود.
3. غيّر حالتها إلى `[-]` عند البدء و`[x]` بعد اجتياز Acceptance وQuality Gate.
4. انقل المؤشر إلى أول Task غير مكتملة وغير محجوبة.
5. كل Schema change له Migration جديد forward-only؛ ممنوع تعديل Migration مطبق.
6. كل جدول أعمال يحتوي `tenant_id` وRLS واختبارات عزل موجبة وسالبة.
7. كل Mutation تتحقق من المدخلات على الخادم وتسجل Audit عند الحساسية.
8. لا أسرار في GitHub، ولا Service Role داخل `NEXT_PUBLIC_*`.

## Definition of Ready

- Parent task معروف من الخطة الرئيسية.
- المدخلات والاعتماديات والقرار التجاري متاحة.
- Schema/API/UI boundaries محددة.
- لا يوجد سؤال يغيّر بنية الحل جذريًا.

## Definition of Done

- Acceptance Criteria ناجحة.
- Unit/Integration/RLS/E2E حسب نوع التغيير.
- `lint` و`typecheck` و`build` ناجحة.
- حالات Loading/Empty/Error/Unauthorized موجودة.
- RTL والموبايل والديسكتوب مراجعون.
- Security/Performance Advisors مراجعون عند تغييرات DB.
- Commit/PR وPreview وتحديث المؤشرات والوثائق.

---

## Stream A — Platform Foundation

### FND-007 — البيئات والإعدادات

**Dependencies:** FND-001..006. **Output:** بيئات معزولة وقابلة للتكرار.

- [x] `FND-007-01` إنشاء `src/lib/env.ts` بعقد typed للمتغيرات العامة والخادمة وفشل واضح عند النقص.
- [x] `FND-007-02` ضبط Supabase URL وPublishable Key في Vercel Preview فقط.
- [ ] `FND-007-03` إنشاء Supabase/Vercel Production منفصلين قبل أول إطلاق عام.
- [ ] `FND-007-04` توثيق Development/Preview/Production في README دون قيم سرية.
- [ ] `FND-007-05` إضافة فحص يمنع Service Role أو Secrets من الوصول إلى Client bundle.

**Acceptance:** Preview يتصل بقاعدة Preview، وBuild يفشل برسالة مفهومة إذا غاب متغير، ولا توجد قيمة سرية في Git.

### FND-008 — CI/CD

**Dependencies:** FND-007.

- [ ] `FND-008-01` إضافة GitHub Action بـNode pinned و`npm ci`.
- [ ] `FND-008-02` تشغيل lint/typecheck/build في Jobs واضحة.
- [ ] `FND-008-03` إضافة Migration drift/check وعدم تطبيق DB من PR غير معتمد.
- [ ] `FND-008-04` ربط Preview Deployment بالـPR وحفظ URL كـCheck.
- [ ] `FND-008-05` إضافة Dependency وSecret scanning.

**Acceptance:** PR مكسور لا يندمج، وPR سليم ينتج Preview قابلًا للمراجعة.

### FND-009 — Git Governance

- [ ] `FND-009-01` إضافة PR template وIssue templates للBug/Feature/Migration.
- [ ] `FND-009-02` تعريف Branch naming وConventional Commits.
- [ ] `FND-009-03` حماية `main`: PR required وchecks required ومنع force push.
- [ ] `FND-009-04` إضافة CODEOWNERS عند انضمام فريق.

### FND-010 — Backup & Recovery

- [ ] `FND-010-01` تعريف RPO/RTO مبدئيين كافتراض قابل للمراجعة.
- [ ] `FND-010-02` توثيق Supabase backup policy لكل خطة.
- [ ] `FND-010-03` إنشاء runbook للاستعادة ونسخ ملفات Storage.
- [ ] `FND-010-04` تنفيذ restore drill وتسجيل الزمن والنتيجة.

---

## Stream B — Identity, Tenancy & Authorization

### IAM-003 — البريد وكلمة المرور

**Dependencies:** IAM-001..002.

- [ ] `IAM-003-01` صفحة طلب إعادة تعيين كلمة المرور Server Action.
- [ ] `IAM-003-02` Callback آمن لتبادل code والتحقق من `next` المحلي فقط.
- [ ] `IAM-003-03` صفحة تعيين كلمة مرور جديدة والتحقق من القوة والتطابق.
- [ ] `IAM-003-04` حالات الرابط المنتهي/المستخدم غير الموجود/النجاح وإعادة الإرسال.
- [ ] `IAM-003-05` ضبط Supabase Redirect URLs لـlocalhost وPreview وProduction.
- [ ] `IAM-003-06` اختبارات التكامل وعدم كشف وجود بريد مسجل.

### IAM-004 — الدعوات

- [ ] `IAM-004-01` Migration لجدول `invitations` مع token hash/role/expiry/status/tenant_id.
- [ ] `IAM-004-02` RLS: Owner/Admin يدير الدعوات؛ المستلم يقبل دعوته فقط عبر مسار خادم.
- [ ] `IAM-004-03` Server Actions create/resend/revoke/accept مع منع التكرار.
- [ ] `IAM-004-04` واجهة الفريق والدعوات والحالات الفارغة والمنتهية.
- [ ] `IAM-004-05` Email template وتسليم عبر Supabase أولًا ثم Resend لاحقًا.
- [ ] `IAM-004-06` Audit واختبارات expiry/replay/wrong tenant.

### IAM-005 — مصفوفة الصلاحيات

- [ ] `IAM-005-01` إنشاء `docs/RBAC_MATRIX.md` لكل Resource/Action.
- [ ] `IAM-005-02` استبدال Policies العامة بسياسات per-resource/per-action.
- [ ] `IAM-005-03` DAL مركزي يفرض tenant + role ولا يعتمد على UI.
- [ ] `IAM-005-04` إخفاء/تعطيل عناصر UI حسب capability المسترجعة من الخادم.
- [ ] `IAM-005-05` اختبارات Role × Resource × Action موجبة وسالبة.

### IAM-006..008 — الملكية والجلسات والعزل

- [ ] `IAM-006-01` RPC transaction لنقل الملكية ومنع إزالة آخر Owner.
- [ ] `IAM-006-02` Audit ونوافذ تأكيد للعمليات الحساسة.
- [ ] `IAM-007-01` شاشة الجلسات/الأجهزة وخروج من كل الأجهزة.
- [ ] `IAM-007-02` تعطيل العضوية ومنع الجلسة الحالية من الإجراءات الحساسة.
- [ ] `IAM-008-01` Test fixtures لاثنين Tenants وكل Roles.
- [ ] `IAM-008-02` RLS suite تمنع cross-tenant select/insert/update/delete.
- [ ] `IAM-008-03` IDOR tests لكل Server Action/Route Handler.

**Gate IAM:** صفر وصول عابر للعميل، وعدم إمكانية تصعيد الدور أو فقد آخر مالك.

---

## Stream C — Academic Operations

### OPS-001..004 — الإعدادات والكيانات

- [ ] `OPS-001-01` Migration لإعدادات tenant: الاسم، الشعار، المنطقة الزمنية، العملة، اللغة.
- [ ] `OPS-001-02` Storage bucket خاص للشعارات مع MIME/size policy وروابط آمنة.
- [ ] `OPS-001-03` شاشة إعدادات حسب `account_type`.
- [ ] `OPS-002-01` CRUD للفروع والقاعات مع archive بدل delete عند الارتباط.
- [ ] `OPS-002-02` قيود tenant-composite تمنع ربط قاعة بفرع من Tenant آخر.
- [ ] `OPS-003-01` جداول `grades`, `subjects` وuniqueness داخل Tenant.
- [ ] `OPS-003-02` CRUD وترتيب وأرشفة المراحل والمواد.
- [ ] `OPS-004-01` ملف المدرس/الموظف مرتبط بعضوية وصلاحياته.
- [ ] `OPS-004-02` حالة active/inactive وسجل التغييرات.

### OPS-005..008 — المجموعات والجداول

- [ ] `OPS-005-01` توسيع cohorts: grade/subject/teacher/branch/room/capacity.
- [ ] `OPS-005-02` Server Actions CRUD مع Zod وتحقق tenant relations.
- [ ] `OPS-006-01` جدول recurring schedules وexceptions/holidays.
- [ ] `OPS-006-02` كاشف تعارض المدرس والقاعة والوقت.
- [ ] `OPS-007-01` توليد class_sessions idempotently لنطاق زمني.
- [ ] `OPS-007-02` إلغاء/نقل حصة مع سبب وإشعار لاحق.
- [ ] `OPS-008-01` Navigation/labels/features حسب center أو independent_teacher.
- [ ] `OPS-008-02` E2E لإنشاء مجموعة في النموذجين.

**Acceptance:** لا تعارض ولا cross-tenant relation، وجدول الحصص قابل للتعديل دون تكرار.

---

## Stream D — Students & Guardians

### STD-001..004 — السجل والتسجيل

- [ ] `STD-001-01` DAL وServer Actions لإضافة/تعديل/أرشفة طالب.
- [ ] `STD-001-02` توليد/تحقق student code فريد داخل Tenant.
- [ ] `STD-001-03` قائمة Server-rendered ببحث وفلاتر وPagination.
- [ ] `STD-001-04` صفحة ملف الطالب وحالات Empty/Error.
- [ ] `STD-002-01` قالب Excel موثق وParser بحدود حجم وعدد صفوف.
- [ ] `STD-002-02` Import staging + Preview للأخطاء والتكرار قبل الكتابة.
- [ ] `STD-002-03` Transaction للاستيراد وتقرير نتائج قابل للتنزيل.
- [ ] `STD-003-01` CRUD guardians وnormalized phone uniqueness.
- [ ] `STD-003-02` ربط N:N بالطلاب مع relationship وprimary contact.
- [ ] `STD-004-01` تسجيل/نقل/إيقاف enrollment مع capacity validation.
- [ ] `STD-004-02` منع enrollment مكرر وتسجيل التاريخ والأسباب.

### STD-005..007 — البحث والسجل والدمج

- [ ] `STD-005-01` Indexes للبحث وفلاتر grade/group/payment/activity.
- [ ] `STD-005-02` تصدير CSV/Excel من الخادم بصلاحيات وحدود.
- [ ] `STD-006-01` Timeline view من enrollment/attendance/invoice/assessment events.
- [ ] `STD-007-01` Merge preview يوضح winner/duplicates/conflicts.
- [ ] `STD-007-02` Transaction للدمج وإعادة ربط السجلات وAudit.

**Acceptance:** استيراد وإدارة طالب دون ازدواج، وكل علاقة داخل نفس Tenant.

---

## Stream E — Billing & Collections

### FIN-001..003 — الاشتراك والفواتير والدفع

- [ ] `FIN-001-01` جداول plans/plan_prices/session_packages مع currency/min constraints.
- [ ] `FIN-001-02` CRUD وتسعير حسب نموذج العمل والمجموعة.
- [ ] `FIN-002-01` جداول subscriptions/installments والآلة الانتقالية للحالات.
- [ ] `FIN-002-02` توليد invoices idempotently ومنع ازدواج دورة الفوترة.
- [ ] `FIN-003-01` Payment transaction تقفل invoice وتمنع overpayment غير المقصود.
- [ ] `FIN-003-02` دعم cash/transfer/card/reference وreceived_by.
- [ ] `FIN-003-03` تحديث invoice status محسوبًا لا يدويًا.

### FIN-004..008 — التسويات والضبط المالي

- [ ] `FIN-004-01` credit notes/refunds/discount approvals بدل تعديل السجل الأصلي.
- [ ] `FIN-004-02` سيناريوهات partial/credit/refund/void واختبارات Decimal.
- [ ] `FIN-005-01` تسلسل receipt number آمن لكل Tenant/فرع.
- [ ] `FIN-005-02` HTML print + PDF وإعادة الطباعة مع watermark.
- [ ] `FIN-006-01` cashier shifts/open-close/cash movements/reconciliation.
- [ ] `FIN-007-01` Aging report وسياسة overdue وgrace period.
- [ ] `FIN-008-01` Append-only financial audit ومنع UPDATE/DELETE للمستخدمين.
- [ ] `FIN-008-02` permissions للاعتماد والإلغاء والاسترداد.

### FIN-009..010 — الدفع الإلكتروني والتقارير

- [ ] `FIN-009-01` ADR لاختيار Paymob/مزود آخر والتكاليف والWebhooks.
- [ ] `FIN-009-02` Checkout initiation من الخادم مع idempotency key.
- [ ] `FIN-009-03` Signed webhook + raw body verification + replay protection.
- [ ] `FIN-009-04` Reconciliation job وحالات pending/failed/late success.
- [ ] `FIN-010-01` Revenue/collection/receivables queries واختبارات التطابق.

**Gate FIN:** ledger والإيصال والتقرير متطابقون، ولا Payment مكرر أو قابل للمحو.

---

## Stream F — Attendance

- [ ] `ATT-001-01` Roster query سريع للحصة وحفظ bulk attendance transactionally.
- [ ] `ATT-001-02` واجهة touch-friendly وkeyboard shortcuts.
- [ ] `ATT-002-01` Signed QR أو student code lookup مع rate limit.
- [ ] `ATT-002-02` Unique constraint تمنع تكرار حضور الطالب للحصة.
- [ ] `ATT-003-01` Reception mode بحد أدنى من البيانات الحساسة.
- [ ] `ATT-004-01` Correction workflow: old/new/reason/approved_by/Audit.
- [ ] `ATT-005-01` إنشاء notification event بعد commit وليس قبله.
- [ ] `ATT-006-01` تقارير الطالب/المجموعة/المدرس/الفرع مع timezone صحيح.
- [ ] `ATT-006-02` E2E للحضور اليدوي وQR والتصحيح.

---

## Stream G — Learning Content

- [ ] `LMS-001-01` Schema courses/modules/lessons/audiences مع ordering.
- [ ] `LMS-001-02` Authoring UI وdraft/published/archived lifecycle.
- [ ] `LMS-002-01` Materials metadata وprivate Storage policies.
- [ ] `LMS-002-02` Signed URLs قصيرة العمر وفحص entitlement.
- [ ] `LMS-003-01` ADR ومقارنة Mux/Cloudflare: cost, DRM, signed playback, analytics.
- [ ] `LMS-003-02` Video asset lifecycle upload/process/ready/error.
- [ ] `LMS-004-01` Playback tokens من الخادم ومنع كشف provider secrets.
- [ ] `LMS-005-01` Entitlement service يجمع tenant/enrollment/payment/release policy.
- [ ] `LMS-006-01` Progress events وaggregation دون كتابة مفرطة.
- [ ] `LMS-007-01` Device registration/concurrency/risk events.
- [ ] `LMS-007-02` Watermark overlay باسم/كود الطالب مع توضيح حدود الحماية.
- [ ] `LMS-008-01` Live session link وattendance/manual recording metadata.

---

## Stream H — Assignments & Assessments

- [ ] `ASM-001-01` Schema question_bank/questions/options/tags/versioning.
- [ ] `ASM-002-01` MCQ authoring/validation/preview وتصحيح deterministic.
- [ ] `ASM-003-01` assessments/windows/attempt limits/randomization snapshots.
- [ ] `ASM-003-02` Timer authoritative على الخادم وتسليم idempotent.
- [ ] `ASM-004-01` assignments/submissions/private files/grading rubric.
- [ ] `ASM-005-01` result release policy وranking مع tie rules.
- [ ] `ASM-005-02` item analysis والصعوبة والتمييز ونقاط الضعف.
- [ ] `ASM-006-01` autosave/resume ومحاكاة انقطاع الشبكة.
- [ ] `ASM-007-01` suspicious events دون ادعاء منع الغش بالكامل.

---

## Stream I — User Portals & Notifications

### PORT-001..006

- [ ] `PORT-001-01` Student role/profile mapping ودashboard server reads.
- [ ] `PORT-001-02` الجدول والمحتوى والواجبات والنتائج والمدفوعات.
- [ ] `PORT-002-01` Guardian identity وربط الأبناء والتحقق من العلاقة.
- [ ] `PORT-002-02` Guardian dashboard مع privacy boundaries.
- [ ] `PORT-003-01` Teacher dashboard ومجموعاته دون بيانات مالية غير لازمة.
- [ ] `PORT-004-01` notifications/inbox/read state/preferences.
- [ ] `PORT-005-01` PWA install/offline shell وعدم caching لبيانات حساسة.
- [ ] `PORT-006-01` WCAG focus/labels/contrast/reduced motion واختبارات responsive.

### COM-001..007

- [ ] `COM-001-01` Template schema/versioning/variables/preview/approval.
- [ ] `COM-002-01` WhatsApp provider adapter + approved templates.
- [ ] `COM-003-01` SMS fallback rules والتكلفة القصوى.
- [ ] `COM-004-01` Resend adapter وdomain verification وemail templates.
- [ ] `COM-005-01` Outbox table/retry/backoff/dedup/dead-letter state.
- [ ] `COM-006-01` consent/preferences/opt-out enforcement.
- [ ] `COM-007-01` Signed provider webhooks وdelivery status updates.

**Gate COM:** لا إرسال مكرر، والتسليم والفشل والموافقة قابلة للتتبع.

---

## Stream J — Teacher Settlements & Reporting

- [ ] `REP-001-01` Contract rules: fixed/percentage/per-student/per-session/versioned.
- [ ] `REP-002-01` Settlement periods/calculation snapshots/approval/payment.
- [ ] `REP-002-02` Tests للغياب والاسترداد وتغير العقد منتصف الفترة.
- [ ] `REP-003-01` إزالة Demo data وبناء KPI queries typed ومؤرخة.
- [ ] `REP-003-02` Loading/empty/stale/data-quality states.
- [ ] `REP-004-01` Daily operations وmonthly management reports.
- [ ] `REP-005-01` `docs/KPI_DICTIONARY.md`: formula/source/owner/cadence.
- [ ] `REP-006-01` Server exports مع row limits/redaction/audit.

---

## Stream K — SaaS Commercial Platform

- [ ] `SAA-001-01` Product catalog/plans/features/limits/versioning.
- [ ] `SAA-002-01` Entitlements service وusage counters وgrace behavior.
- [ ] `SAA-003-01` Trial/active/past_due/suspended/canceled state machine.
- [ ] `SAA-004-01` Platform billing provider + signed webhooks + invoices.
- [ ] `SAA-005-01` Separate admin schema/routes/roles/audit.
- [ ] `SAA-006-01` Support tickets وtemporary impersonation with reason/expiry/banner.
- [ ] `SAA-007-01` Custom domain verification/SSL/branding isolation.
- [ ] `SAA-008-01` MRR/churn/ARPA metrics from immutable billing events.

---

## Stream L — Security, Reliability & Operations

- [ ] `SEC-001-01` Threat model: assets/actors/trust boundaries/abuse cases.
- [ ] `SEC-001-02` Security checklist إلزامي لكل Migration وRelease.
- [ ] `SEC-002-01` Rate limits auth/QR/import/export/payment/webhooks.
- [ ] `SEC-003-01` Sentry client/server مع PII scrubbing وrelease tagging.
- [ ] `SEC-004-01` Health checks/SLOs/uptime/latency/error alerts.
- [ ] `SEC-005-01` Automated backup verification وquarterly restore drill.
- [ ] `SEC-006-01` Privacy/Terms/retention/export/delete implementation.
- [ ] `SEC-007-01` Dependabot/SAST/secret scanning/license check.
- [ ] `SEC-008-01` Incident runbooks وseverity/on-call/communication/postmortem.

---

## Stream M — Pilot, Launch & Scale

- [ ] `GTM-001-01` Seed/import لمدرس Pilot وتحقق reconciliation.
- [ ] `GTM-001-02` تدريب ومراقبة journeys وfeedback log.
- [ ] `GTM-002-01` Seed/import لسنتر/فرع/موظفين ودورة تحصيل.
- [ ] `GTM-003-01` Support SLA وتصنيف P0-P3 وربط كل Issue بتاسك.
- [ ] `GTM-004-01` Baseline vs after dashboard للوقت والتحصيل والحضور.
- [ ] `GTM-005-01` سجل طلبات التخصيص وقرار Core/Config/Reject.
- [ ] `GTM-006-01` Go/Iterate/Stop review وقائمة قرارات موثقة.
- [ ] `GTM-007-01` Production checklist/data migration/domain/cutover/rollback.
- [ ] `GTM-008-01` Self-service onboarding/help center/support analytics.
- [ ] `GTM-009-01` Load test/capacity plan/multi-branch hardening.
- [ ] `GTM-010-01` Flutter business case: journeys/offline/push/store cost.
- [ ] `GTM-010-02` إن اعتمد: API contract/mobile auth/deep links/release pipeline.

---

## الاختبارات المطلوبة حسب نوع المهمة

| التغيير | الاختبارات الإلزامية |
|---|---|
| Migration/RLS | schema assertions + positive/negative tenant isolation + Advisors |
| Server Action | validation + unauthorized + wrong tenant + success + idempotency |
| Payment | decimals + duplicates + replay + partial/refund/reconciliation |
| UI form | validation + loading + error + keyboard + mobile RTL |
| Report | source reconciliation + timezone + empty/stale state |
| Integration/Webhook | signature + replay + retry + out-of-order events |
| PWA/Offline | cache boundaries + stale assets + no sensitive response caching |

## قرارات تقنية مؤجلة لا يجوز افتراضها

| القرار | يُحسم في | المطلوب |
|---|---|---|
| Mux أم Cloudflare Stream | LMS-003-01 | تكلفة فعلية وحماية وتحليلات |
| Paymob أم بديل | FIN-009-01 | رسوم وSettlement وWebhook reliability |
| مزود WhatsApp | COM-002-01 | اعتماد القوالب والتكلفة والدعم |
| تطبيق Flutter | GTM-010-01 | بيانات استخدام وحاجة Offline/Push |

## سجل التنفيذ

| التاريخ | Task | Commit/PR | نتيجة الاختبار | القرار التالي |
|---|---|---|---|---|
| 2026-09-06 | FND-001..006, IAM-001..002 | راجع Git history | lint/typecheck/build + Supabase Advisors | FND-007-01 |
| 2026-09-06 | FND-007-01 | `feat: validate environment configuration` | lint/typecheck/test (4)/build + missing-env failure | FND-007-02 |
| 2026-09-06 | FND-007-02 | `chore: configure Vercel preview environment` | Preview Ready + negative sign-in reached Supabase | FND-007-03 |
