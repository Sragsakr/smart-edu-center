# Smart Edu Center

منصة Web PWA عربية لإدارة السناتر التعليمية والمدرسين المستقلين، مع مسار مستقل مستقبلي لمنصة الكورسات Online/LMS.

## الحالة الحالية

- Next.js 16 App Router + TypeScript + Tailwind CSS 4.
- PostgreSQL هو application database الوحيد، والمصادقة application-owned Fresh Auth. كل مسارات login/logout/current-user، Platform Admin، onboarding، team/invitations، password recovery، Student وParent portals تعمل عبر PostgreSQL دون SDK أو runtime fallback خارجي.
- واجهة عربية RTL متجاوبة وقابلة للتثبيت كـPWA.
- المنصة تدعم بُعدين مستقلين: نوع العميل (`teacher` / `center`) ومستوى المنتج (`operations` / `management_platform` / `learning_platform`). عقد المنتج موثق بالكامل في [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md) و[`docs/adr/`](docs/adr/README.md)، **وتنفيذه في الـschema والكود جارٍ ضمن `P01-06` و`P01-07`** — الـcanonical baseline الحالي ما زال على النموذج القديم (`account_type`) حتى اكتمال STEP 2 وSTEP 3.
- Control Plane لإدارة الـSaaS.
- Student Portal أولي فعلي مرتبط ببيانات الطالب.
- Parent Portal أولي فعلي مرتبط بعلاقة ولي الأمر بأبنائه.
- الـLMS هو مستوى المنتج الأعلى (`learning_platform`)، ويُفتح عبر Entitlement + تسجيل فعلي، وليس عبر كون الطالب طالب سنتر.

## Build Mode — مهم قبل أي تعديل Database

**المشروع ما زال في مرحلة البناء، ولا يوجد عملاء حقيقيون ولا Production Customer Data يجب الحفاظ عليها.**

حتى يعلن المالك صراحة **SCHEMA FREEZE / PRODUCTION DATA MODE** نعمل بالقواعد التالية:

1. نفضّل الوصول مباشرة إلى الـTarget Schema الصحيح بدل الحفاظ على توافق مع Demo/Development Data قديمة.
2. الـClean Reset / Rebuild / Reseed **معتمد** عند تغيّر الـcanonical Target Schema، ولا تُبنى Compatibility Migrations للحفاظ على بيانات تطوير قابلة للحذف.
3. لا نصرف وقتًا في Backward Compatibility لبيانات تجريبية قابلة للحذف، ولا نُبقي بنى Schema قديمة لأن بيانات Demo تستخدمها.
4. Existing migration history ليست Public Contract نهائية بعد، ويمكن Consolidate/Rebuild قبل Schema Freeze.
5. أي قرار Database جديد يجب أن يبقى موثقًا في الكود/README/AGENTS حتى لا تتحول قاعدة البيانات إلى حالة غير قابلة لإعادة البناء.
6. **بوابة إلزامية قبل Reset للقاعدة الحقيقية:** تطبيق الـbaseline على قاعدة PostgreSQL **قابلة للحذف** أولًا، ونجاح فحص المخطط + قيود عزل الـTenants + `lint`/`typecheck`/`tests`/`build`/`check`.
7. **Auth:** لا تُنقل Password Hashes ولا Sessions من أي نظام Auth متقاعد، وتُعاد Fresh Auth Demo Credentials بأمان بعد الـReset.
8. بعد الـReset: تطبيق الـbaseline وحده → Canonical Demo Seed → إعادة إنشاء Platform Admin → Seed نموذج `teacher` → Seed نموذج `center` → Reconciliation → Smoke Tests.
9. بيانات Demo الحالية (مستخدمون وTenants وطلاب وجلسات) **تجريبية بالكامل وقابلة للحذف**؛ وقاعدة `saboraty` لا تُستخدم كقاعدة اختبارات.
10. Staging/Production يمكن إعادة بنائهما نظيفًا قبل الإطلاق لعدم وجود عملاء، لكن **لا يُعدّل Production أثناء خطوات التصميم/الـSchema**.
11. بعد إعلان **SCHEMA FREEZE** يتوقف هذا الأسلوب فورًا، وتصبح كل تغييرات Schema عبر Forward-only reviewed migrations وخطة Restore/Rollback.

> القرار الحالي من المالك: Build Mode نشط، والبيانات الحالية بلا أي قيمة إنتاجية، والـClean Reset/Reseed معتمد عند تغيّر الـTarget Schema.

## نموذج المنتج

المنتج يُوصف ببُعدين **مستقلين تمامًا** لا يجوز الخلط بينهما. العقد الكامل في [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md).

### البُعد الأول — نوع العميل (Customer Type)

| القيمة | الوصف |
|---|---|
| `teacher` | مدرس مستقل يدير مجموعاته وطلابه بنفسه. |
| `center` | سنتر تعليمي بفروع وفريق وأدوار ومراحل ومواد وعدة مدرسين. |

نوع العميل يحدد **شكل الكتالوج والتنقل والتنظيم** فقط. لا يمنح ولا يمنع أي ميزة.

### البُعد الثاني — مستوى المنتج (Product Level)

| المستوى | المحتوى |
|---|---|
| **Operations** | الطلاب، أولياء الأمور، المجموعات، الجداول، القاعات، الحضور، الرسوم، الأقساط، المدفوعات، المتأخرات، المصروفات، الإشعارات، التقارير التشغيلية والمالية، الفريق/المدرسون. الطلاب وأولياء الأمور لا يحتاجون بالضرورة حسابًا. |
| **Management Platform** | كل ما سبق + حسابات الطلاب وأولياء الأمور + بوابات الطالب وولي الأمر والمدرس/الموظف + الواجبات والتسليمات والاختبارات والنتائج + الملفات والمواد ومتابعة التقدم. |
| **Full Learning Platform** | كل ما سبق + الكورسات والدروس ومحتوى الفيديو والمواد الرقمية + وصول المحتوى + التسجيل في الكورسات + تتبع تقدم التعلم الرقمي + قدرات live مستقبلية. |

أي عميل — مدرس أو سنتر — يمكنه شراء أي مستوى. مثال: مدرس مستقل على `learning_platform` كامل، وسنتر على `operations` فقط.

### Add-ons مستقلة

`custom_domain` · `white_label` · `video` · `whatsapp` · `sms` · `extra_storage` · `extra_branches` · `extra_staff` · `advanced_reporting` … تُشترى منفصلة عن المستوى.

### الترقية بدون فقدان

الترقية `Operations → Management Platform → Full Learning Platform → White-label` تحدث على **نفس الـTenant** ونفس البيانات، بدون إنشاء مساحة جديدة، ولا نقل بيانات، ولا تغيير codebase. التخفيض لا يحذف بيانات العميل.

### الكتالوج الأكاديمي

`Subject` و`Teacher` و`Course` و`Course Offering` **مفاهيم منفصلة**. لا يوجد ربط مباشر بين مادة ومدرس واحد، ويوجد N:N عبر `course_teachers`. الوحدة القابلة للبيع والتسجيل هي **Course Offering**، والمجموعة وحدة تسليم/جدولة.

مسارات التنقل المدعومة:

```text
Stage → Grade → Subject → Teacher → Course      (السنتر)
Stage → Grade → Teacher → Courses               (السنتر / المدرس)
كتالوج عام بفلاتر: Stage, Grade, Subject, Teacher, Price
```

> «الكتالوج العام» يعني كتالوج المساحة نفسها بكل فروعه ومدرسيه، وليس Marketplace بين عملاء مختلفين.

### الاستضافة وWhite-label

**لا يوجد codebase منفصل لأي عميل:** `ONE CODEBASE → MULTI-TENANT → MULTI-BRAND → MULTI-DOMAIN`.

| الوضع | مثال |
|---|---|
| Saboraty Hosted | `teacher-name.saboraty.online` |
| White-label / Custom Domain | `academy.com` |

عميل الدومين المخصص يعمل على **نفس التطبيق ونفس الـruntime**؛ العلامة والشعار والألوان والاسم والدومين والميزات كلها إعدادات بيانات على الـTenant، وليست fork ولا deployment منفصل. وبيانات كل مساحة تبقى معزولة.

### الطبقات الثلاث لقرار الوصول

```text
Effective Access = Entitlement(tenant, capability) AND RBAC(role, action) AND Scope(resource)
```

الميزة غير المشتراة لا تُفتح بحجة وجود صلاحية دور، والاشتراك لا يمنح كل الأدوار كل الأفعال، والدور لا يمنح موردًا خارج نطاقه.

### حالة الميزات في العرض

أي عرض للمنتج يميّز بصراحة بين **Available / Coming Soon / Planned**، ولا يقدّم ميزة مخطط لها كأنها متاحة.

## Student Domain

لا نعتبر كل طالب نوعًا واحدًا.

- **Center Student:** علاقته بالفرع/المجموعة/الحضور/الاشتراك الحضوري.
- **Online Student:** علاقته بالكورس/التفعيل/الوصول/التقدم/الاختبارات.
- نفس الشخص يمكن أن يكون الاثنين من خلال Identity واحدة وعلاقتين منفصلتين.

لا نعتمد على `student_type` واحد كحل وحيد، ولا نجبر Online Student على Branch/Group، ولا يدخل Online Enrollment تلقائيًا ضمن حساب طلاب السنتر.

### بوابات الطالب وولي الأمر مقيّدة بالـEntitlement

البوابة لا تُفتح بمجرد وجود علاقة في قاعدة البيانات:

- `/student` تحتاج علاقة الطالب **و** entitlement `platform.portal.student` على المساحة.
- `/parent` تحتاج علاقة ولي الأمر **و** entitlement `platform.portal.guardian`.

لذلك مساحة على مستوى `operations` تحتفظ ببيانات الطلاب وأولياء الأمور **دون** إصدار حسابات منصة لهم. هذا هو التصميم المقصود وليس نقصًا.

كما أن ربط `user_id` بالطالب/ولي الأمر **مقيّد داخل المساحة** (`unique(tenant_id, user_id)`)، فيمكن للشخص نفسه أن يكون طالبًا أو ولي أمر في أكثر من مساحة عبر علاقات منفصلة على هوية واحدة، بدل حساب جديد لكل مساحة.

## نموذج الدخول والـPortals

لدينا **4 Experiences** ولكن **2 Login Surfaces فقط**.

### A. SaaS Platform Admin — دخول منفصل

- Login: `/platform-control/login`
- Control Plane: `/platform-admin`
- غير مرتبط من الـLanding Page.
- الرابط غير المعلن ليس Security Boundary؛ الوصول يتطلب وجود المستخدم في `platform_admins` ويتم التحقق Server-side.

### B. الدخول العادي — Management + Student + Parent

Login واحد فقط: `/login`

لا توجد Tabs لاختيار نوع المستخدم قبل المصادقة. بعد نجاح Auth، العلاقات المحمية في قاعدة البيانات تحدد الـPortal:

```text
/login
  ├── active tenant membership  → Management Dashboard
  ├── students.user_id          → /student
  └── guardians.user_id         → /parent
```

لو نفس Auth user له أكثر من علاقة، ينتقل إلى `/choose-context` ويختار الواجهة بدون حساب أو Password جديد.

### Management Portal

لـOwner/Admin/Teacher/Receptionist/Accountant داخل Tenant. العضوية في `memberships` تخص تشغيل السنتر/المدرس فقط.

### Student Portal — `/student`

النسخة الحالية تعرض من البيانات الحقيقية:

- بيانات الطالب.
- الحصص القادمة.
- سجل الحضور.
- الاشتراكات/الفواتير والمدفوعات.
- مساحة `كورساتي Online` موجودة كواجهة مشروطة مستقبلًا؛ لا تُفعّل إلا عند وجود LMS entitlement + Online Enrollment.

### Parent Portal — `/parent`

ولي الأمر ليس Tenant Member. الوصول يتم عبر:

```text
app_users
  → guardians.user_id
  → student_guardians
  → students
```

طبقة الصلاحيات الخادمية وعلاقات قاعدة البيانات تسمح له بقراءة بيانات أبنائه المرتبطين فقط. النسخة الحالية تعرض الأبناء، الحضور، الحصص والمستحقات. موديول الرسائل مع المعلم له مكان واضح في الواجهة وسيُبنى كDomain مستقل لاحقًا.

## دورة إنشاء حساب المشترك

إنشاء User في Fresh Auth لا ينشئ Tenant تلقائيًا. رحلة السنتر/المدرس الحالية:

1. تسجيل البريد وكلمة المرور.
2. إدخال نوع النشاط واسم المساحة وبيانات التواصل.
3. إنشاء `workspace_requests` فقط ثم تسجيل الخروج.
4. Platform Admin يراجع الطلب.
5. عند القبول يتم إنشاء `tenant` + Owner `membership`.
6. المستخدم يدخل من `/login` ويصل إلى Management Dashboard.

Platform Admin لا يُمنح تلقائيًا لأي Tenant Owner.

## Fresh Auth المحلي

Fresh Auth يستخدم `DATABASE_URL` مباشرة دون backend selector أو مزود هوية خارجي. تطبيق الـclean baseline على قاعدة جديدة ينشئ Schema فارغة عمدًا ولا يستعيد legacy dump تلقائيًا؛ أما قاعدة التطوير الحالية `saboraty` فتحتوي البيانات المحددة في القسم التالي.

لإنشاء أول Platform Admin محليًا في وضع التطوير فقط:

1. شغّل التطبيق باستخدام `npm run dev` مع `DATABASE_URL` يشير إلى PostgreSQL على loopback.
2. افتح `/platform-control/bootstrap`.
3. أدخل البريد وكلمة المرور محليًا؛ يتم تخزين `scrypt-v1` hash فقط داخل `auth_password_credentials` وإنشاء `app_users` و`platform_admins` داخل transaction واحدة.
4. افتح `/platform-control/login` وسجّل الدخول، ثم اختبر `/platform-admin` والخروج.

لا يعتمد هذا المسار على أي مزود هوية خارجي، ولا يسجل كلمة المرور أو يعيد بيانات قديمة.

## بيانات التطوير الحالية

قاعدة التطوير المحلية `saboraty` تعمل على **PostgreSQL 18** (المنفذ `5433`) وأُعيد إنشاؤها من الـcanonical baseline، ثم بُذرت ببيانات كانونية تمثل نموذجي المنتج. **هذه البيانات تجريبية بالكامل وقابلة للحذف** — لا يوجد عملاء حقيقيون ولا Production Customer Data.

- هي ليست قاعدة اختبارات ولا يجوز لأي reset/test harness لمسها؛ اختبارات التكامل تستخدم قاعدة منفصلة عبر `TEST_DATABASE_URL` على نفس النسخة.
- لا تعتمد Business Logic على Demo email أو UUID ثابت؛ كل معرّفات الـSeed مشتقة من مفاتيح نصية ثابتة فالسكربت idempotent.

### حسابات التطوير الكانونية

تُنشأ بـFresh Auth من جديد (لا تُنقل أي كلمة مرور قديمة)، وكلمة مرورها موحّدة للتطوير فقط:

| الحساب | الوصول |
|---|---|
| `platform.admin@saboraty.test` | `/platform-control/login` ثم `/platform-admin` |
| `teacher.owner@saboraty.test` | `/login` ثم لوحة الإدارة (مساحة `demo-teacher`) |
| `center.owner@saboraty.test` | `/login` ثم لوحة الإدارة (مساحة `demo-center`) |
| `student.demo@saboraty.test` | `/login` ثم `/student` |
| `parent.demo@saboraty.test` | `/login` ثم `/parent` |

كلمة المرور الافتراضية `Saboraty.Demo.2026`، ويمكن تغييرها عبر `SEED_DEMO_PASSWORD` عند البذر. السكربت يطبع الحسابات بعد كل تشغيل.

### النموذجان المبذوران

| | `demo-teacher` | `demo-center` |
|---|---|---|
| نوع النشاط | `teacher` | `center` |
| مستوى المنتج | `learning_platform` | `management_platform` |
| القدرات الممنوحة | 15 | 10 |
| المحتوى | مرحلة وصف ومادة و3 مقررات و3 عروض | فرعان و3 قاعات و3 مراحل و4 صفوف و4 مواد و4 مدرسين و5 مقررات و6 عروض و6 مجموعات و8 طلاب و5 أولياء أمور و12 تسجيلًا و6 حصص |

## الصلاحيات وعزل البيانات

الوضع الحالي يفرض الصلاحيات في الـserver-only DAL/Server Actions، وتمنع composite foreign keys ربط سجلات من Tenants مختلفة. تطبيق RLS/database policies الدقيقة جزء إلزامي من `P02-03` قبل توسيع بيانات العملاء؛ لا نعتبر طبقة الواجهة أو الفلاتر وحدها حد حماية نهائيًا.

- Tenant staff: وصولهم يعتمد على `memberships` والـrole.
- Student: يرى سجله وما يرتبط به فقط عندما يطابق `students.user_id` هوية `app_users.id` في الجلسة الموثقة.
- Guardian: يرى فقط الأبناء المرتبطين في `student_guardians` وما يخصهم.
- Platform Admin: صلاحية SaaS مستقلة في `platform_admins`.
- لا نستخدم `user_metadata` لاتخاذ قرار Authorization.
- لا نضع Student/Guardian داخل `memberships` فقط لتسهيل الاستعلامات.
- أي Table جديدة exposed يجب أن تحصل على RLS واختبارات Positive/Negative isolation.

## Password Recovery

حتى يتوفر Domain/SMTP، الاستعادة الحالية تمر عبر إدارة المنصة: طلب من `/forgot-password` ثم مراجعة من `/platform-admin/password-resets` وكود مؤقت single-use يُرسل يدويًا عبر واتساب. الكود وكلمات المرور والجلسات تُخزن كـdigests فقط، و`DATABASE_URL` يبقى Server-only ولا يوضع في Git.

## التشغيل المحلي

المشروع يستخدم Node.js `22.23.2` كما في `.nvmrc`.

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

ثم افتح `http://localhost:3000`.

### تهيئة Platform Admin في PostgreSQL المحلي

عند تشغيل التطبيق محليًا مع `DATABASE_URL` يشير إلى PostgreSQL على loopback افتح:

```text
http://localhost:3000/platform-control/bootstrap
```

أدخل بريدًا وكلمة مرور من اختيارك. ينشئ المسار `app_users` و`auth_password_credentials` و`platform_admins` داخل transaction واحدة، ولا يخزن كلمة المرور الخام.

هذه الأداة متاحة فقط عندما يكون `NODE_ENV=development` واتصال `DATABASE_URL` يشير إلى `localhost` أو loopback IP. خارج ذلك يعيد المسار 404، كما تعيد عملية الكتابة نفسها فحص الشروط لمنع استدعائها مباشرة.

المتغيرات المطلوبة:

```env
DATABASE_URL=postgresql://...
```

`DATABASE_URL` متغير Server-only ويُقرأ عبر `src/lib/server-env.ts`.

## Health وReadiness

- `GET /api/health` يفحص إمكانية الاتصال بـPostgreSQL فقط؛ يعيد `200` عند وصول قاعدة البيانات و`503` عند تعذر الاتصال.
- `GET /api/readiness` يفحص الاتصال ووجود جميع جداول الـcanonical baseline؛ يعيد `200` مع `schema: "ready"` أو `503` مع `schema: "incomplete"`/`"unknown"`.
- لا يعرض المساران connection strings أو أسماء الجداول المفقودة أو تفاصيل أخطاء PostgreSQL.

## البيئات الحالية

الـruntime الحالي PostgreSQL-only. يجب أن تحصل Development وPreview وProduction على قواعد PostgreSQL منفصلة قبل إدخال بيانات عملاء حقيقية؛ لا يشير أي runtime path إلى مزود قاعدة أو Auth بديل.

هذا يعني:

- لا تنفذ Reset من نفسك؛ يحتاج قرار المالك.
- بعد موافقة المالك في Build Mode يمكن Reset/Reseed بدل الحفاظ على بيانات Demo قديمة.
- قبل إدخال عملاء/بيانات حقيقية يجب فصل/تثبيت استراتيجية البيئات والنسخ الاحتياطي ثم إعلان Schema Freeze.

## أوامر الجودة

```bash
npm run lint
npm run typecheck
npm run test
npm run check:migrations
npm run check:secrets
npm run build
npm run check:client-secrets
npm run check
```

ملاحظة: بعض Migration Safety rules الحالية أقدم من قرار Build Mode. إذا منعت Consolidation مقصودة قبل Schema Freeze، حدّث قواعد CI نفسها بدل إضافة migrations وهمية فقط لإرضاء تاريخ تطوير لم يعد مطلوبًا.

## اختبارات Integration والعزل (Disposable database)

`npm run test` يعتمد بالكامل على mocks ولا يحتاج PostgreSQL. اختبارات التكامل والعزل بين Tenants (`**/*.integration.test.ts`) تعمل بشكل منفصل ضد قاعدة بيانات حقيقية قابلة للحذف:

```bash
export TEST_DATABASE_URL=postgresql://<user>@127.0.0.1:5432/saboraty_test
npm run test:integration
```

`TEST_DATABASE_URL` **يجب** ألا يشير إلى `saboraty` (قاعدة التطوير) أو أي قاعدة إنتاج. السكربت (`postgres/scripts/reset-test-database.mjs`) يرفض التنفيذ تلقائيًا لو:

- المتغير غير مضبوط أصلًا.
- الاسم هو `saboraty` أو `postgres` أو أي اسم محجوز.
- يطابق `DATABASE_URL` الحالي.
- المضيف ليس loopback.

عند التشغيل، السكربت يحذف قاعدة الاختبار ويعيد إنشاءها من `postgres/baseline/0001_smart_edu_center_clean.sql`، ثم يبذر كتالوج القدرات (`postgres/scripts/seed-capability-catalog.mjs`)، ثم يشغّل `postgres/validation/clean-baseline-smoke.sql` قبل أي اختبار. البيانات المستخدمة كلها Synthetic (`*@example.test`) وتُحذف بالكامل بعد كل تشغيل؛ لا تُكتب أي بيانات Demo أو Legacy داخل `saboraty`.

## الطبقة التجارية في قاعدة البيانات

منذ `P01-06` يحمل الـcanonical schema بُعدَي المنتج المستقلين:

| الجدول | الدور | النطاق |
|---|---|---|
| `tenants.tenant_type` | نوع العميل: `teacher` أو `center` — شكل الكتالوج والتنقل | Tenant |
| `tenants.product_level` | مستوى المنتج: `operations` / `management_platform` / `learning_platform` | Tenant |
| `tenants.currency` · `timezone` · `locale` | إعدادات العملة والمنطقة الزمنية واللغة | Tenant |
| `capability_catalog` | تعريفات القدرات (مرجعي، مصدر الحقيقة ملف JSON في الكود) | Platform |
| `tenant_entitlements` | حالة كل قدرة لكل مساحة: `state` و`source` و`limits` ونافذة فعالية و`granted_by` | Tenant |
| `tenant_branding` | الاسم العام والشعار والألوان والثيم وبيانات الدعم | Tenant |
| `tenant_domains` | الدومينات المتحققة لكل مساحة (subdomain أو custom) | Tenant |

**مصدر الحقيقة للقدرات** هو ملف واحد في الكود:

- `src/lib/entitlements/capability-catalog.json` — بيانات الكتالوج (25 قدرة: 15 feature و10 addon).
- `src/lib/entitlements/capability-catalog-rules.mjs` — قواعد التحقق، مشتركة بين كود التطبيق وسكربت الـSeed.
- `src/lib/entitlements/capability-catalog.ts` — الواجهة المُصنّفة والاستعلامات.
- `src/lib/entitlements/default-entitlements.ts` — `defaultEntitlementsForLevel()` وهو الاشتقاق الوحيد لقدرات المستوى.

### التخزين الخاص

عقد التخزين محسوم في [`docs/adr/0006`](docs/adr/0006-private-storage-contract.md): الملفات **خاصة افتراضيًا**، مفاتيحها tenant-scoped، والوصول عبر **رابط موقّع قصير العمر يصدره الخادم فقط** بعد التحقق من الاستحقاق والصلاحية والنطاق. مزوّد الفئة الصغيرة (شعار المساحة) هو تخزين داخل PostgreSQL خلف منفذ `PrivateStorage` لأنه مشمول بالنسخ الاحتياطي أصلًا، ومزوّد الفيديو يُحسم بـADR مقارنة عند `P13-03`.

### النسخ الاحتياطي والاستعادة

```bash
export BACKUP_DIR=/mnt/offsite/saboraty-backups
export BACKUP_ENCRYPTION_KEY=<16+ chars from the environment secret store>
npm run backup:database        # dump → تشفير AES-256 → checksum → manifest → تحقق عكسي

export RESTORE_DRILL_DATABASE_URL=postgresql://<user>@127.0.0.1:5433/saboraty_restore_drill
npm run restore:drill          # استعادة كاملة على قاعدة محمية + تحقق هوية وعزل
```

لا يُكتب أي ملف غير مشفّر في وجهة النسخ، ولا يعمل السكربت بلا مفتاح، ويرفض مضيفًا غير loopback إلا مع `--allow-remote`. تفاصيل التشغيل وقراءة RPO/RTO في [`docs/OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md).

### السجلات والبيانات الشخصية

كل سجل يمر على تنقيح قبل الكتابة (`src/lib/observability/redact-pii.ts`): البريد والهاتف والرموز وبصمات الجلسات وسلاسل الاتصال تُحجب، بينما **تبقى المعرّفات والطوابع الزمنية** حتى تظل الحادثة قابلة للتتبع.

مزامنة الكتالوج مع قاعدة البيانات:

```bash
npm run seed:capability-catalog
```

السكربت Idempotent، ويعمل داخل Transaction واحدة، ويرفض التشغيل على مضيف غير loopback إلا مع `--allow-remote`، ولا يستطيع حذف قدرة ما زالت ممنوحة لمساحة (`on delete restrict`).

## تحديد معدّل المحاولات

مسارات المصادقة السبعة (`login` · `platform_login` · `signup` · `password_reset_request` · `password_reset_redeem` · `invite_accept` · `bootstrap`) محدودة المحاولات، والتنفيذ مدعوم بـPostgreSQL لا بـRedis: الجدول موجود في مخطط `private` ولا يمنح التطبيق أي قراءة مباشرة له، والمخزَّن بصمات `sha256` فقط بلا بريد أو IP خام.

**حدّان لا حدّ واحد:**

| الحدّ | الغرض |
|---|---|
| حدّ الحساب (ضيّق، مثل 10 محاولات/15 دقيقة للدخول) | يمنع تخمين كلمة مرور حساب بعينه |
| حدّ المصدر (أوسع، مثل 60 محاولة/15 دقيقة) | يمنع إغراق المصدر الواحد بلا أن يُقفل سنتر كامل خلف عنوان شبكة مشترك |

النجاح يمحو محاولات صاحبه، فلا يُعاقَب من دخل بنجاح بسبب محاولات سابقة. والرد واحد سواء كان الحساب موجودًا أو لا، فلا يكشف الحدّ وجود الحسابات.

> `x-forwarded-for` **مدخل غير موثوق** ويمكن تزويره، لذلك لا يُعتمد عليه وحده: تزوير الترويسة يتجاوز حدّ المصدر فقط، ولا يتجاوز حدّ الحساب.

## عزل الـTenants بـRow-Level Security

العزل لم يعد يعتمد على فلترة التطبيق وحدها. كل جدول أعمال يحمل `tenant_id` عليه سياسات RLS مفعّلة مع `FORCE ROW LEVEL SECURITY`، وكل عملية DAL تُنفَّذ داخل معاملة تحمل سياق وصول يُضبط بـ`LOCAL` فلا يتسرّب بين الطلبات ([`docs/adr/0007`](docs/adr/0007-tenant-isolation-row-level-security.md)).

| السياق | يُضبط من | يفتح |
|---|---|---|
| `app.app_user_id` | بصمة الجلسة عبر `private.session_user_id` | صف المستخدم وعلاقته الخاصة |
| `app.current_tenant_id` | العلاقة المحلولة داخل نفس المعاملة | جداول المساحة النشطة |
| `app.platform_scope` | مسار `/platform-admin` بعد التحقق من `platform_admins` | عبور المساحات لمسار المنصة |

### ⚠️ دور قاعدة البيانات إلزامي

**`FORCE ROW LEVEL SECURITY` لا يُلزم الـsuperuser.** أي دور بـ`usesuper` أو `bypassrls` يتجاوز كل السياسات، فتصبح موجودة بلا أثر. لذلك:

- **`DATABASE_URL`** يجب أن يستخدم دور التطبيق `saboraty_app` (`NOSUPERUSER NOBYPASSRLS`).
- **`MIGRATION_DATABASE_URL`** لدور المالك، ويُستخدم فقط لتطبيق الـbaseline والبذر وإعادة إنشاء قاعدة الاختبار.

```bash
APP_DB_PASSWORD=<16+ chars> MIGRATION_DATABASE_URL=... npm run provision:app-role
```

اختبارات إلزام RLS (`src/lib/security/row-level-security.integration.test.ts`) تعمل **بدور التطبيق نفسه** لا بدور المالك، لأن الاختبار بدور المالك يختبر شيئًا غير الذي يعمل به التطبيق.

### مسارا الفحص: القدرة والنطاق

| المسار | يُستخدم مع | السلوك |
|---|---|---|
| `requireTenantCapability` | قدرة `allow` أو `deny` | يرفض القدرات المقيّدة بالنطاق برسالة صريحة |
| `requireTenantCapabilityWithScope` | قدرة `scoped` | يمرّر فاحص المورد الذي يقرر هل هذا المورد يخص الطالب |
| `getTenantAuthorizationContext` | الحاجة للسياق قبل تحديد المورد | يفتح الهوية والمساحة بلا فحص قدرة |

استخدام المسار الأول على قدرة مقيّدة **يُرفض دائمًا** — وهو السلوك الصحيح، لأنه يمنع تمرير قدرة بلا تحقق مورد.

**نطاق المدرس** (`src/lib/authorization/resource-scope.ts`) يتحقق عبر `course_offerings.teacher_id` ثم يتفرع للطلاب والمجموعات والحصص والحضور. ولا يوجد عمود مدرس على المجموعة.

**قاعدة فضاءَي التسمية:** لا يتقاسم مفتاح استحقاق بادئة مورد RBAC. المفاتيح المحجوزة (`payments.`، `branches.`، `students.`…) تفشل تحميل الكتالوج عند أي تقاطع، ولذلك سُمّي الـadd-on `ops.online_payments` لا `payments.online`.

## ربط هوية الطالب أو ولي الأمر

ربط الحساب بسجل طالب أو ولي أمر يمر عبر **مسار دعوة موثوق** (`portal_invitations`)، ولا يُكتب العمود يدويًا. القبول يتطلب تحقق ثلاثة شروط **معًا**:

1. **حيازة الرمز** — بصمة الرمز موجودة في الدعوة، ولا يُخزَّن الرمز الخام أبدًا.
2. **مطابقة البريد** — بريد الهوية الموثقة يطابق البريد المدعو. الرمز وحده لا يكفي، وهذا ما يمنع انتحال صفة بمجرد حيازة رابط.
3. **السجل غير مربوط** — لا يُستولى على سجل مرتبط بحساب آخر.

ويُضاف قيد رابع: الهوية نفسها لا تُربط بسجلين من نفس النوع في مساحة واحدة (`unique(tenant_id, user_id)`).

`/claim?token=…` يعرض أقل قدر ممكن: نوع الجهة والبريد المدعو وحالة الدعوة — **بلا اسم الشخص** قبل القبول، فلا يصبح الرابط المسرّب وسيلة استطلاع.

> **ملاحظة تقنية مؤثَّرة:** `SELECT ... FOR UPDATE` يُطبّق سياسة `UPDATE` لا `SELECT` وحدها. لذلك القفل لا يُؤخذ بمسار الرمز (بلا سياق مساحة)، بل بعد الدخول إلى المساحة ثم إعادة التحقق بعد القفل.

## ملكية مساحة العمل

كل مساحة تحتفظ بـ**مالك نشط واحد على الأقل**. مساحة بلا مالك لا يستطيع أحد إدارتها من داخل التطبيق — لا الفريق ولا الإعدادات ولا الاشتراك — فيصبح التدخل من إدارة المنصة هو السبيل الوحيد. لذلك يُحمى ذلك على مستويين:

| المستوى | الوسيلة | ما يمنعه |
|---|---|---|
| قاعدة البيانات | trigger مؤجّل `memberships_require_active_owner` | أي نهاية معاملة بلا مالك نشط، حتى لو جاءت من استعلام مستقبلي خاطئ |
| الخدمة | `src/lib/auth/tenant-ownership.ts` | نقل غير مصرّح، أو إلى عضو معطّل أو من مساحة أخرى، برسائل مفهومة |

**نقل الملكية** يجري في معاملة واحدة: يُرفع المنقول إليه أولًا ثم يُخفض القائم، ولا يُقبل إلا بتأكيد صريح بكتابة بريد العضو الجديد. والبريد يُشتق على الخادم من معرّف العضو لا من حقل في النموذج.

> **لماذا trigger مؤجّل لا قيد CHECK؟** الضمان عابر للصفوف: «عدد المالكين النشطين ≥ 1». و`CHECK` يرى الصف وحده، والقيد الفريد يمنع التكرار لا الغياب. والتأجيل ضروري لأن نقل الملكية يمرّ بلحظة وسيطة بلا مالك، والفحص عند `COMMIT` يرى الحالة النهائية.

عمر **سياق الوصول** هو عمر معاملته، لأن الإعدادات `LOCAL` تُصفَّر عند نهايتها. لذلك كل دوال التفويض تأخذ عملية تُنفَّذ داخل نفس المعاملة، والمُنفّذ يرفض الاستخدام بعد النهاية بخطأ `access context expired` بدل أن يُرجع صفر صفوف بصمت.

### سياسات تفكّ الدائرة المغلقة

معرفة «ما هي مساحتي؟» تحتاج قراءة قبل أن تُعرف المساحة، لذلك توجد سياسات محدودة النطاق:

| السياسة | تسمح بـ |
|---|---|
| `memberships_bootstrap_read` · `students_bootstrap_read` · `guardians_bootstrap_read` | قراءة صف العلاقة الشخصية قبل معرفة المساحة |
| `tenants_member_read` | قراءة صف المساحة التي ينتمي إليها العضو فعليًا |
| `app_users_colleague_read` | قراءة هوية الزملاء في نفس المساحة وعضوية نشطة في الطرفين |
| `private.session_user_id` · `login_lookup` | حل الهوية من بصمة الجلسة، وإتمام الدخول قبل وجود هوية |

وكلها مضبوطة النطاق، ومغطاة باختبارات عدم تسريب بعد تعطيل العضوية.

## الكتالوج الأكاديمي في قاعدة البيانات

`Subject` ≠ `Teacher` ≠ `Course` ≠ `Course Offering` ≠ `Cohort` — خمسة مفاهيم منفصلة ([`docs/adr/0003`](docs/adr/0003-academic-catalog-model.md)):

| الجدول | الدور |
|---|---|
| `rooms` | قاعة داخل فرع بسعة اختيارية |
| `stages` → `grades` | الشجرة التعليمية: مرحلة ثم صفوفها |
| `subjects` | المادة المعرفية |
| `teachers` | سجل مدرس مستقل عن `memberships` (يمكن وجوده بلا حساب دخول) |
| `courses` | مقرر داخل مادة وصف |
| `course_teachers` | إسناد N:N بين المقرر والمدرس — لا ربط مباشر بين مادة ومدرس |
| `course_offerings` | **الوحدة القابلة للبيع**: مقرر + مدرس + فرع + قاعة + نمط + سعة + سعر + عملة |
| `cohorts` | وحدة التسليم/الجدولة، تشير إلى `course_offering_id` ولا تحمل مادة أو مدرسًا |
| `enrollments` | التسجيل التجاري على العرض |
| `cohort_members` | عضوية التسليم/الحضور في مجموعة |

قيود مضمونة في قاعدة البيانات:

- لا يمكن إنشاء عرض بمدرس غير مسند للمقرر في `course_teachers`.
- لا يمكن تكرار نفس العرض لنفس المقرر والمدرس والفرع (مع السماح بعروض بلا فرع).
- `students.user_id` و`guardians.user_id` فريدان **داخل المساحة** `unique(tenant_id, user_id)`، فيمكن للشخص نفسه أن يكون طالبًا أو ولي أمر في أكثر من مساحة بهوية واحدة.
- صف الطالب مرتبط بـ`grades` وليس نصًا حرًا.

## إعادة بناء بيانات التطوير (Clean Reset)

بعد نجاح بوابة التحقق (`P01-08`) على قاعدة قابلة للحذف:

```bash
# 1) الـbaseline وحده
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f postgres/baseline/0001_smart_edu_center_clean.sql

# 2) كتالوج القدرات + البيانات الكانونية للنموذجين
npm run seed:canonical-demo
```

`seed:canonical-demo` يشغّل بذر الكتالوج أولًا، ثم يبذر الحسابات والبيانات، ثم يطبع عدّادات reconciliation ويرفض التسليم إن اكتشف عدم اتساق بين التسليم والتسجيل أو مقررًا بلا مدرس مسند.

## المعمارية

- `src/app`: routes والـmetadata والـportals.
- `src/app/platform-control/login`: مدخل إدارة الـSaaS المنفصل.
- `src/app/platform-admin`: SaaS Control Plane.
- `src/app/student`: Student Portal.
- `src/app/parent`: Parent Portal.
- `src/app/choose-context`: اختيار Portal للمستخدم متعدد العلاقات.
- `src/components`: مكونات الواجهة.
- `src/lib/auth/account-access.ts`: Identity/relationship resolver.
- `src/lib/portal-data.ts`: server-only data access للطالب وولي الأمر.
- `src/lib/tenant`: نوع العميل ومستوى المنتج (البُعدان المستقلان).
- `src/lib/entitlements`: كتالوج القدرات وقواعد التحقق والاشتقاق (`defaultEntitlementsForLevel`).
- `src/lib/auth/password-rules.mjs`: صيغة تجزئة كلمة المرور، مشتركة بين التطبيق والسكربتات.
- `src/lib/database`: PostgreSQL configuration وSQL executor.
- `postgres/baseline`: الـcanonical clean schema الوحيد القابل للتطبيق.
- `postgres/migrations`: تبقى فارغة حتى Schema Freeze (BUILD MODE).
- `postgres/reference`: ملفات تاريخية للقراءة فقط وليست runtime أو migration path.
- `docs/PRODUCT_VISION.md`: عقد المنتج (البُعدان، المستويات، القدرات، النموذج التجاري، الاستضافة).
- `docs/adr`: قرارات المعمارية المعتمدة وأسبابها وبدائلها.
- `docs/MASTER_EXECUTION_PLAN.md`: مصدر ترتيب التنفيذ الوحيد.

## خارطة التنفيذ

يوجد مصدر تنفيذ واحد فقط:

- [`docs/MASTER_EXECUTION_PLAN.md`](docs/MASTER_EXECUTION_PLAN.md) — الحالة الحالية، الأولويات، الاعتماديات، المراحل، التاسك الحالية، بوابات القبول وسجل التنفيذ.

مراجع العقود التخصصية (لا تحدد ترتيب العمل):

- [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md) — عقد المنتج: البُعدان، المستويات، القدرات، النموذج التجاري، الاستضافة.
- [`docs/adr/`](docs/adr/README.md) — قرارات المعمارية المعتمدة.
- [`docs/RBAC_MATRIX.md`](docs/RBAC_MATRIX.md) — صلاحيات الأدوار وعلاقتها بطبقة Entitlement.
- [`docs/ENGINEERING_PRINCIPLES.md`](docs/ENGINEERING_PRINCIPLES.md) — المبادئ الهندسية العامة.

راجع `CURRENT_TASK` داخل خطة التنفيذ قبل أي شغل، ونفّذها وحدها ثم حدّث المؤشر بعد نجاح Acceptance وQuality Gate. لا تُنشأ خطة أو Backlog موازية.

**PHASE-01 مكتملة هندسيًا ومحليًا:** `P01-04` (عقد المنتج)، `P01-05` (Landing Page بالرؤية الكاملة)، `P01-06` (الطبقة التجارية)، `P01-07` (الكتالوج الأكاديمي)، `P01-08` (التحقق على قاعدة قابلة للحذف)، `P01-09` (Clean Reset + canonical demo seed)، `P01-10` (عقد التخزين الخاص)، `P01-11` (نسخ احتياطي مشفّر)، `P01-12` (تجربة استعادة)، `P01-13` (سجل منقّح)، `P01-14` (فحص الاعتماد المتقاعد)، `P01-15` (Runbook للتشغيل والاستعادة).

**PHASE-02 بدأت:** `P02-00` (فرض الاستحقاق على بوابتي الطالب وولي الأمر)، `P02-01` (عقد القرار المركزي)، `P02-02` (DAL مركزي يفرض الطبقات الثلاث).

**متبقٍ لإغلاق G01 كإجراء مالك:** مراقبة توفّر خارجية ولوحة موارد (`P01-13-M`)، وتطبيق الـbaseline على Staging واختبار الرحلات الحرجة هناك (`P01-14-M`، يحتاج وصول Coolify).

التاسك الحالية هي `P02-03`: سياسات عزل قاعدة البيانات وقيودها لكل مورد. تطوير Features المنتج متوقف حتى اكتمال `PHASE-02`.

### الـLanding Page

الصفحة العامة تعرض **الرؤية الكاملة** للمنتج مع وسم صريح لكل ميزة بحالتها: **متاح الآن / قريبًا / مخطط له**. الأقسام: البُعدان المستقلان، المستويات الثلاثة، الكتالوج ومسارات التنقل، خريطة القدرات الكاملة، الاستضافة وWhite-label، قاعدة الترقية بدون فقدان بيانات، ثم مفتاح الحالات.

مصادر الحقيقة لنصوص الصفحة:

- `src/lib/product/feature-status.ts` — تعريف الحالات وتسمياتها وشرحها.
- `src/lib/product/product-vision-content.ts` — محتوى الرؤية (المستويات، القدرات، الكتالوج، الاستضافة).
- `src/components/product-status-chip.tsx` — وسم الحالة الموحّد.

لا يجوز عرض ميزة «قريبًا» أو «مخطط لها» كأنها متاحة، وأي إضافة للصفحة تلتزم بنفس نظام الوسم.

## النشر

المصدر على GitHub، والتطبيق يعمل كـNext.js runtime على Coolify، والبيانات/Auth على PostgreSQL application-owned stack. مسار الترقية ثابت:

```text
feature/* → staging → main
                 ↓       ↓
             Staging   Production
```

- Pull Requests الخاصة بالعمل تستهدف `staging`.
- Push إلى `staging` يشغّل بوابة CI كاملة، ثم يستدعي Coolify Staging عبر `COOLIFY_STAGING_DEPLOY_WEBHOOK` عند نجاحها فقط.
- الترقية إلى Production تتم عبر Pull Request من `staging` إلى `main`؛ Push إلى `main` يستدعي Coolify Production عبر `COOLIFY_DEPLOY_WEBHOOK` بعد نجاح CI.
- قبل الترقية، عندما توجد بيانات Production، تُستعاد نسخة حديثة معتمدة ومُنقحة داخل Staging وتُختبر عليها الرحلات؛ لا تُنسخ Password hashes أو Sessions أو Recovery/Invitation tokens أو PII غير اللازمة، ولا تتصل Staging مباشرة بقاعدة Production الحية. إذا كان المصدر فارغًا يسجل الاختبار `N/A — empty source`.
- بعد تحقق Production يُحذف فرع التاسك محليًا وعلى GitHub، ويُثبت أن `main` و`staging` فقط هما الدائمان وأن شجرتيهما تمثلان نفس الكود المُسلّم.
- مورد Staging يتصل بقاعدة Staging الداخلية فقط، ومورد Production يتصل بقاعدة Production الداخلية فقط؛ `DATABASE_URL` Server-only ولا تتبادل البيئتان البيانات أو الأسرار.
- Vercel غير مرتبط بالمستودع ولا يدخل في Runtime أو مسار النشر.

قبل اعتبار النظام Production فعليًا يجب إنهاء Schema Freeze وتأمين ومراجعة Security/Backup/Restore gates.
