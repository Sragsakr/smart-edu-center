# Smart Edu Center

منصة Web PWA عربية لإدارة السناتر التعليمية والمدرسين المستقلين، مع مسار مستقل مستقبلي لمنصة الكورسات Online/LMS.

## الحالة الحالية

- Next.js 16 App Router + TypeScript + Tailwind CSS 4.
- Supabase Auth + PostgreSQL + RLS.
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
auth.users
  → guardians.user_id
  → student_guardians
  → students
```

RLS يسمح له بقراءة بيانات أبنائه المرتبطين فقط. النسخة الحالية تعرض الأبناء، الحضور، الحصص والمستحقات. موديول الرسائل مع المعلم له مكان واضح في الواجهة وسيُبنى كDomain مستقل لاحقًا.

## دورة إنشاء حساب المشترك

إنشاء User في Supabase Auth لا ينشئ Tenant تلقائيًا. رحلة السنتر/المدرس الحالية:

1. تسجيل البريد وكلمة المرور.
2. إدخال نوع النشاط واسم المساحة وبيانات التواصل.
3. إنشاء `workspace_requests` فقط ثم تسجيل الخروج.
4. Platform Admin يراجع الطلب.
5. عند القبول يتم إنشاء `tenant` + Owner `membership`.
6. المستخدم يدخل من `/login` ويصل إلى Management Dashboard.

Platform Admin لا يُمنح تلقائيًا لأي Tenant Owner.

## بيانات Demo الحالية

قاعدة التطوير الحالية أُعيد تنظيفها لتكون صغيرة وواضحة وتمثل الـ4 Experiences الأساسية. كل حسابات Demo التالية تستخدم كلمة المرور:

```text
DemoPass.123
```

| التجربة | البريد | الدخول |
|---|---|---|
| SaaS Platform Admin | `admin.demo@example.com` | `/platform-control/login` |
| Center Management Owner | `center.demo@example.com` | `/login` |
| Student | `teacher.demo@example.com` | `/login` |
| Parent / Guardian | `center.demo2@example.com` | `/login` |

> أسماء بعض Demo emails موروثة من seed قديم لتجنب إعادة إنشاء Auth users أثناء البناء؛ العلاقة الحالية في قاعدة البيانات هي المصدر الحقيقي للدور، وليس اسم البريد.

Dataset الحالية تحتوي Tenant واحدًا (`سنتر النور التجريبي`) وفرعًا ومجموعة وطالبًا وولي أمر وعلاقة Parent→Student وحصصًا وحضورًا وفواتير ومدفوعًا جزئيًا، كي تكون الـPortals قابلة للاختبار بدون بيانات ضخمة.

لا تعتمد Business Logic على Demo email أو UUID ثابت.

## RLS والصلاحيات

- Tenant staff: وصولهم يعتمد على `memberships` والـrole.
- Student: يرى سجله وما يرتبط به فقط عبر `students.user_id = auth.uid()` وسياسات العلاقات المرتبطة.
- Guardian: يرى فقط الأبناء المرتبطين في `student_guardians` وما يخصهم.
- Platform Admin: صلاحية SaaS مستقلة في `platform_admins`.
- لا نستخدم `user_metadata` لاتخاذ قرار Authorization.
- لا نضع Student/Guardian داخل `memberships` فقط لتسهيل الاستعلامات.
- أي Table جديدة exposed يجب أن تحصل على RLS واختبارات Positive/Negative isolation.

## Password Recovery

حتى يتوفر Domain/SMTP، الاستعادة الحالية تمر عبر إدارة المنصة: طلب من `/forgot-password` ثم مراجعة من `/platform-admin/password-resets` وكود مؤقت single-use يُرسل يدويًا عبر واتساب. أي Secret/Admin Supabase key يبقى Server-only ولا يوضع في `NEXT_PUBLIC_*` أو Git.

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

عند تشغيل التطبيق محليًا مع `DATA_BACKEND=postgres` وPostgreSQL على loopback، سجّل الدخول أولًا بحساب Supabase Auth المطلوب، ثم افتح:

```text
http://localhost:3000/platform-control/bootstrap
```

اضغط زر التهيئة مرة واحدة. المسار يأخذ UUID والبريد من جلسة Auth الحالية، ثم ينفذ داخل transaction واحدة upsert في `public.users` وإضافة idempotent في `public.platform_admins`. لا يكتب إلى Supabase ولا يحتاج إدخال أي UUID أو بريد أو سر يدويًا.

هذه الأداة متاحة فقط عند اجتماع الشروط الثلاثة: `NODE_ENV=development`، و`DATA_BACKEND=postgres`، واتصال قاعدة البيانات يشير إلى `localhost` أو loopback IP. خارج ذلك يعيد المسار 404، كما تعيد عملية الكتابة نفسها فحص الشروط لمنع استدعائها مباشرة. احذف هذه الآلية بعد اكتمال Fresh Auth ومزامنة الهوية الدائمة.

المتغيرات العامة الأساسية:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

اقرأها من العقد الموجود في `src/lib/env.ts` بدل `process.env` مباشرة داخل التطبيق.

## البيئات الحالية

Development وVercel Preview و`main` تستخدم حاليًا مشروع Supabase واحد باسم `smart-edu-center` بقرار المالك لتقليل التكلفة أثناء البناء. لذلك تعامل مع المشروع الحالي كبيئة Build مشتركة حتى إعلان Production Data Mode.

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
- `src/lib/supabase`: عملاء Supabase.
- `supabase/migrations`: تاريخ المخطط الحالي، وليس Contract نهائية أثناء Build Mode.

## خارطة التنفيذ

المصدر الأساسي للتطوير المتسلسل:

- [`docs/MASTER_DELIVERY_PLAN.md`](docs/MASTER_DELIVERY_PLAN.md)
- [`docs/TECHNICAL_EXECUTION_BACKLOG.md`](docs/TECHNICAL_EXECUTION_BACKLOG.md)

راجع `CURRENT_TASK` و`CURRENT_TECHNICAL_TASK` دائمًا قبل بدء شغل جديد، وحدّثهما عند اكتمال التاسك حتى نستطيع دائمًا أخذ «التاسك اللي عليها الدور» بدون فجوات.

## النشر

المصدر على GitHub، التطبيق على Vercel، والبيانات/Auth على Supabase. تحديث `main` ينشر النسخة الأساسية، والفروع يمكن أن تنشئ Preview. قبل اعتبار النظام Production فعليًا يجب إنهاء Schema Freeze، فصل سياسة البيانات الحقيقية عن Demo Build Mode، ومراجعة Security/Backup/Restore gates.
