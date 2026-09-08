# Smart Edu Center

منصة Web PWA عربية لإدارة السناتر التعليمية والمدرسين المستقلين، مع مسار مستقل مستقبلي لمنصة الكورسات Online/LMS.

## الحالة الحالية

- Next.js 16 App Router + TypeScript + Tailwind CSS 4.
- PostgreSQL هو application database الوحيد، والمصادقة application-owned Fresh Auth. كل مسارات login/logout/current-user، Platform Admin، onboarding، team/invitations، password recovery، Student وParent portals تعمل عبر PostgreSQL دون SDK أو runtime fallback خارجي.
- واجهة عربية RTL متجاوبة وقابلة للتثبيت كـPWA.
- Management SaaS يدعم نموذجين: `center` و`independent_teacher`.
- Control Plane لإدارة الـSaaS.
- Student Portal أولي فعلي مرتبط ببيانات الطالب.
- Parent Portal أولي فعلي مرتبط بعلاقة ولي الأمر بأبنائه.
- LMS مخطط كمنتج/اشتراك مستقل، وليس Feature إجبارية داخل اشتراك الإدارة.

## Build Mode — مهم قبل أي تعديل Database

**المشروع ما زال في مرحلة البناء، ولا توجد Customer/Production Data Contract حتى الآن.**

حتى يعلن المالك صراحة **SCHEMA FREEZE / PRODUCTION DATA MODE** نعمل بالقواعد التالية:

1. نفضّل الوصول مباشرة إلى الـTarget Schema الصحيح بدل الحفاظ على توافق مع Demo/Development Data قديمة.
2. عند تغيير Domain Model بشكل كبير، يمكن مسح Business/Demo Data وإعادة Seed ببيانات نظيفة بدل إضافة Migration جديدة فقط للحفاظ على شكل قديم لم يعد مطلوبًا.
3. لا نصرف وقتًا في Backward Compatibility لبيانات تجريبية قابلة للحذف.
4. Existing migration history ليست Public Contract نهائية بعد، ويمكن Consolidate/Rebuild قبل Schema Freeze.
5. أي قرار Database جديد يجب أن يبقى موثقًا في الكود/README/AGENTS حتى لا تتحول قاعدة البيانات إلى حالة غير قابلة لإعادة البناء.
6. أثناء Reset نحافظ على حسابات Auth الحقيقية وحسابات Platform Admin الحقيقية إلا لو المالك طلب حذفها صراحة. Demo users وBusiness demo data قابلة للمسح.
7. بعد إعلان **SCHEMA FREEZE** يتوقف هذا الأسلوب فورًا، وتصبح كل تغييرات Schema عبر Forward-only reviewed migrations وخطة Restore/Rollback.

> القرار الحالي من المالك: Build Mode نشط، وReset/Reseed مسموح لتسريع إعادة تشكيل المنتج أثناء البناء.

## نموذج المنتج

### 1. Management SaaS

منتج إدارة وتشغيل السنتر أو المدرس المستقل: الطلاب، الفروع، المجموعات، الجداول، الحضور، التحصيل، الموظفون، الصلاحيات والتقارير.

### 2. LMS / Online Learning

منتج تجاري مستقل سيضم الكورسات الرقمية، الفيديو/الملفات، الاختبارات، أكواد التفعيل، الوصول والتقدم. يمكن للعميل شراء Management فقط أو LMS فقط أو الاثنين.

الـLMS له شكلان مخططان:

- **Shared Academy:** على دومين المنصة الرئيسي.
- **Branded / White-label Academy:** اسم/Logo/Theme/Custom Domain للسنتر أو المدرس مع نفس الـcodebase والـruntime؛ لا يوجد Deployment منفصل لكل عميل.

## Student Domain

لا نعتبر كل طالب نوعًا واحدًا.

- **Center Student:** علاقته بالفرع/المجموعة/الحضور/الاشتراك الحضوري.
- **Online Student:** علاقته بالكورس/التفعيل/الوصول/التقدم/الاختبارات.
- نفس الشخص يمكن أن يكون الاثنين من خلال Identity واحدة وعلاقتين منفصلتين.

لا نعتمد على `student_type` واحد كحل وحيد، ولا نجبر Online Student على Branch/Group، ولا يدخل Online Enrollment تلقائيًا ضمن حساب طلاب السنتر.

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

عند تشغيل `DATA_BACKEND=postgres` تكون قاعدة PostgreSQL المحلية فارغة عمدًا بعد تطبيق الـclean baseline، ولا تُستعاد بيانات مزود الهوية السابق أو legacy dump تلقائيًا.

لإنشاء أول Platform Admin محليًا في وضع التطوير فقط:

1. شغّل التطبيق باستخدام `npm run dev` مع `DATA_BACKEND=postgres` و`DATABASE_URL` يشير إلى PostgreSQL على loopback.
2. افتح `/platform-control/bootstrap`.
3. أدخل البريد وكلمة المرور محليًا؛ يتم تخزين `scrypt-v1` hash فقط داخل `auth_password_credentials` وإنشاء `app_users` و`platform_admins` داخل transaction واحدة.
4. افتح `/platform-control/login` وسجّل الدخول، ثم اختبر `/platform-admin` والخروج.

لا يعتمد هذا المسار على أي مزود هوية خارجي، ولا يسجل كلمة المرور أو يعيد بيانات قديمة.

## بيانات التطوير الحالية

قاعدة التطوير المحلية `saboraty` تحتوي حاليًا 3 مستخدمين و2 Tenants محفوظين أثناء بناء Fresh Auth. هي ليست قاعدة اختبارات ولا يجوز لأي reset/test harness لمسها. اختبارات التكامل تستخدم قاعدة منفصلة عبر `TEST_DATABASE_URL` وتعيد إنشاءها من الـclean baseline.

لا تعتمد Business Logic على Demo email أو UUID ثابت، وأي Reset/Reseed لبيانات `saboraty` يحتاج موافقة المالك الصريحة.

## RLS والصلاحيات

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

عند تشغيل التطبيق محليًا مع `DATA_BACKEND=postgres` وPostgreSQL على loopback افتح:

```text
http://localhost:3000/platform-control/bootstrap
```

أدخل بريدًا وكلمة مرور من اختيارك. ينشئ المسار `app_users` و`auth_password_credentials` و`platform_admins` داخل transaction واحدة، ولا يخزن كلمة المرور الخام.

هذه الأداة متاحة فقط عند اجتماع الشروط الثلاثة: `NODE_ENV=development`، و`DATA_BACKEND=postgres`، واتصال قاعدة البيانات يشير إلى `localhost` أو loopback IP. خارج ذلك يعيد المسار 404، كما تعيد عملية الكتابة نفسها فحص الشروط لمنع استدعائها مباشرة.

المتغيرات المطلوبة:

```env
DATA_BACKEND=postgres
DATABASE_URL=postgresql://...
```

`DATABASE_URL` متغير Server-only ويُقرأ عبر `src/lib/server-env.ts`.

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

عند التشغيل، السكربت يحذف قاعدة الاختبار ويعيد إنشاءها من `postgres/baseline/0001_smart_edu_center_clean.sql` ثم يشغّل `postgres/validation/clean-baseline-smoke.sql` قبل أي اختبار. البيانات المستخدمة كلها Synthetic (`*@example.test`) وتُحذف بالكامل بعد كل تشغيل؛ لا تُكتب أي بيانات Demo أو Legacy داخل `saboraty`.

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
- `src/lib/database`: PostgreSQL configuration وSQL executor.
- `postgres/baseline`: الـcanonical clean schema الوحيد القابل للتطبيق.
- `postgres/reference`: ملفات تاريخية للقراءة فقط وليست runtime أو migration path.

## خارطة التنفيذ

يوجد مصدر تنفيذ واحد فقط:

- [`docs/MASTER_EXECUTION_PLAN.md`](docs/MASTER_EXECUTION_PLAN.md) — الحالة الحالية، الأولويات، الاعتماديات، المراحل، التاسك الحالية، بوابات القبول وسجل التنفيذ.

راجع `CURRENT_TASK` داخل هذا الملف قبل أي شغل، ونفّذها وحدها ثم حدّث المؤشر بعد نجاح Acceptance وQuality Gate. لا تُنشأ خطة أو Backlog موازية. المراجع التخصصية مثل [`docs/ENGINEERING_PRINCIPLES.md`](docs/ENGINEERING_PRINCIPLES.md) و[`docs/RBAC_MATRIX.md`](docs/RBAC_MATRIX.md) تصف عقودًا هندسية ولا تحدد ترتيب العمل.

التاسك الحالية هي `P00-06`: إغلاق INFRA-011 وتثبيت نقطة الاستئناف بعد هجرة PostgreSQL/Fresh Auth. تطوير Features المنتج متوقف حتى اكتمال مراحل البنية والصلاحيات `PHASE-00..PHASE-02`.

## النشر

المصدر على GitHub، التطبيق قابل للنشر كـNext.js runtime، والبيانات/Auth على PostgreSQL application-owned stack. قبل اعتبار النظام Production فعليًا يجب إنهاء Schema Freeze، فصل البيئات، وتأمين PostgreSQL private networking ومراجعة Security/Backup/Restore gates.
