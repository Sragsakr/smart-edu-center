# مصفوفة العبور بين المساحات (Cross-Tenant / IDOR / BOLA)

مرجع تنفيذي لما يُرفض عند عبور حدود المساحة. الاختبارات المُنفِّذة لهذه المصفوفة في:

- `src/lib/security/cross-tenant-authorization.integration.test.ts` — كل إجراء يستقبل معرّفًا من العميل.
- `src/lib/security/row-level-security.integration.test.ts` — العزل على مستوى الصفوف بدور التطبيق الحقيقي.
- `src/lib/auth/membership-deactivation.integration.test.ts` — أثر تعطيل العضوية فورًا وحدوده.
- `src/lib/auth/account-sessions.integration.test.ts` — سحب الجلسات ومنع سحب جلسة غيرك.

## القاعدة الحاكمة

> **معرّف يأتي من العميل لا يمنح وصولًا أبدًا.**

من يملك جلسة صالحة يستطيع إرسال أي معرّف يختاره. لذلك الحماية ليست بإخفاء المعرّف ولا بجعل الصفحة لا تعرضه، بل بأن **يرفض الخادم المعرّف الذي لا يملكه الطالب**. وإخفاء زر ليس حدًّا أمنيًا.

وكل اختبار يقيس **أمرين معًا**: الرفض، و**عدم تغيّر المورد المستهدف**. الرفض بعد الكتابة إخفاق في الغرض لا نجاح.

## الطبقات الثلاث التي يُختبر كل صف عليها

| الطبقة | الوسيلة | ما تسقطه |
|---|---|---|
| Guard | `requirePostgresTenantCapability` / `requirePlatformScope` | مساحة لا عضوية فيها، أو قدرة لا يملكها الدور |
| DAL | فلتر `tenant_id = $1` في كل استعلام | معرّف مورِد من مساحة أخرى |
| RLS | سياسات الصفوف، بدور `saboraty_app` بلا `BYPASSRLS` | استعلام نسي فلتره أصلًا |

## الإجراءات على نطاق المساحة

| الإجراء | المعرّف من العميل | المسار المرفوض | ما يُثبت عدم تغيّره |
|---|---|---|---|
| `createInvitation` | `tenant_id`, `email`, `role` | `tenant_id` لمساحة أخرى | لا صف دعوة يُنشأ في المساحة الأخرى |
| `createInvitation` | `role` | `role = owner` | لا دعوة بصف مالك (الملكية لها مسار مستقل) |
| `createInvitation` | `role` | `role = admin` من فاعل `admin` | لا دعوة تُنشأ (سقف سلطة الدور) |
| `resendInvitation`, `revokeInvitation` | `invitation_id` | دعوة بدور أعلى من سلطة الفاعل | الحالة والرمز والدور كما هي |
| `resendInvitation` | `tenant_id`, `invitation_id` | دعوة مساحة أخرى | الحالة والرمز والصلاحية كما هي |
| `revokeInvitation` | `tenant_id`, `invitation_id` | دعوة مساحة أخرى | تبقى `pending` |
| `deactivateMembership` | `tenant_id`, `user_id` | عضو مساحة أخرى | العضوية `active = true` |
| `reactivateMembership` | `tenant_id`, `user_id` | عضو مساحة أخرى | العضوية `active = false` |
| `transferOwnership` | `tenant_id`, `target_user_id`, `confirm_email` | عضو مساحة أخرى | الدور كما هو |

الواجهات كلها ‏`AccessScopedSqlExecutor` مرّت بـ`withTeamContext`، فتصل كلها إلى الحارس نفسه الذي يتحقق أن العضوية **نشطة** في المساحة المطلوبة.

## الإجراءات على نطاق المنصة

نطاق المنصة لا يُمنح بالعضوية ولا بالدور: يحتاج صفًا في `platform_admins`، ويُفتح من `withPlatformScope` وحده. والرفض هنا **رمي صريح** لا توجيه، لأن الحارس يُنادى قبل أي `try`.

| الإجراء | الأثر المرفوض | ما يُثبت عدم تغيّره |
|---|---|---|
| `setTenantStatus` | تعليق مساحة | `tenants.status` تبقى `active` |
| `approvePasswordReset` | توليد كود استعادة لحساب غيره | الطلب يبقى `pending` |
| `rejectPasswordReset` | رفض طلب غيره | الطلب يبقى `pending` |
| `approveWorkspaceRequest` | قبول طلب مساحة | الطلب يبقى `pending_approval` |
| `rejectWorkspaceRequest` | رفض طلب مساحة | الطلب يبقى `pending_approval` |
| `bootstrapLocalAdmin` | إنشاء مدير منصة | محجوب بشرط بيئة التطوير المحلية وحده |

## الإجراءات على نطاق الهوية (بلا معرّف مورد)

لا تستقبل معرّفًا من العميل، فالخطر فيها من نوع آخر: يجب أن تعمل **على صاحب الجلسة وحده**.

| الإجراء | القيد |
|---|---|
| `revokeSession` | `session_id` مقرون بـ`user_id` في نفس جملة `UPDATE`؛ لا يمسّ جلسة غيره (مُختبر) |
| `revokeOtherSessions` | يقتصر على `user_id` صاحب الجلسة |
| `signOut` | يُبطل الجلسة الحالية وحدها ببصمة رمزها |
| `claimPortalAccess` | الرمز **و** تطابق البريد الموثّق **و** سجل غير مربوط |
| `requestPasswordReset`, `submitWorkspaceRequest`, `authenticate`, `createAccount` | لا تعمل إلا على الحساب المطلوب بمدخلاته |

## مسارات API

| المسار | ما يكشفه | ما لا يكشفه |
|---|---|---|
| `/api/health` | إتاحة قاعدة البيانات | لا بيانات مساحة ولا مستخدمين |
| `/api/readiness` | اكتمال المخطط | لا بيانات مساحة ولا مستخدمين |

لا يحمل أي منهما معرّف مساحة، ولا يُعيد صفوفًا من جداول الأعمال.

## سقف سلطة الدور

سطح آخر غير العبور بين المساحات لكنه من نفس العائلة: **دور يستطيع منح دور أعلى من سلطته**. القاعدة في `src/lib/authorization/role-authority.ts`، وتُطبَّق عند إنشاء الدعوة وعند إدارتها، ومحروسة باختبار مطابقة على جدول `RBAC_MATRIX.md` §5.

| الفاعل | يمنح | لا يمنح |
|---|---|---|
| `owner` | `admin`, `teacher`, `receptionist`, `accountant` | `owner` (له مسار مستقل) |
| `admin` | `teacher`, `receptionist`, `accountant` | `admin`, `owner` |
| البقية | لا شيء | الكل |

## ما لا تُثبته هذه المصفوفة

- **استحقاقات المنتج.** غياب الميزة ليس عبورًا بين مساحات؛ مغطّى في `postgres-access-contract.integration.test.ts` و`rbac-matrix.integration.test.ts`.
- **حالة العضوية.** تعطيل العضوية يمنع الإجراءات فورًا لكنه لا يُخفي الصفوف في RLS عمدًا؛ مغطّى في `membership-deactivation.integration.test.ts`.
- **تسرّب عبر التوقيت أو رسائل الخطأ.** الرسائل موحّدة عمدًا في مسارات المصادقة، لكن قياس التوقيت خارج نطاق هذه المصفوفة.

## عند إضافة إجراء جديد

1. إن استقبل معرّفًا من العميل، أضف صفًّا هنا **قبل** الدمج.
2. أضف حالة في `cross-tenant-authorization.integration.test.ts`: مهاجم في مساحة يرسل معرّف مساحة أخرى.
3. أثبت الرفض **و** عدم التغيّر.
4. لا تكتب فحصًا محليًا للدور أو العضوية؛ مرّر الإجراء بالحارس الموحّد.
