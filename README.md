# Smart Edu Center

منصة Web PWA عربية لإدارة المدرسين والسناتر التعليمية: الطلاب، المجموعات، الحضور، التحصيل، المحتوى والتقارير.

## الحالة الحالية

- Next.js 16 App Router + TypeScript + Tailwind CSS 4.
- واجهة عربية RTL متجاوبة وقابلة للتثبيت كـPWA.
- Vertical slice أولي: لوحة الإدارة، الطلاب، البحث، وحالة السداد.
- مخطط Supabase متعدد المستأجرين مع RLS في `supabase/migrations`.
- مشروع Vercel واحد ومشروع Supabase واحد باسم `smart-edu-center` يخدمان Development وPreview وProduction دون تكلفة مشروع بيانات إضافي.

## دورة إنشاء الحساب وتفعيله

إنشاء مستخدم في Supabase Auth لا ينشئ سنترًا تلقائيًا. تأكيد البريد معطل بقرار المالك؛ الرحلة المعتمدة هي: تسجيل البريد وكلمة المرور، إرسال بيانات السنتر أو المدرس المستقل ورقمي الموبايل وواتساب بكود الدولة، ثم تسجيل خروج المستخدم وانتظار تواصل إدارة المنصة. لا تُنشأ سجلات `tenants` و`memberships` إلا عند قبول Platform Admin للطلب؛ ينفذ القبول العمليتين داخل transaction واحدة. محاولة الدخول قبل القبول تنتهي بتسجيل خروج ورسالة انتظار، وبعد التفعيل يسجل المستخدم دخوله من جديد.

مسارات `/platform-admin` هي Control Plane منفصلة لإدارة الـSaaS. تبدأ بلوحة مراجعة الطلبات في `/platform-admin/requests`، ثم تتوسع Feature by Feature إلى Overview، وإدارة كل السناتر والمدرسين وأنواع الحسابات وحالات التفعيل والتعليق والاشتراكات وتقارير المنصة الإجمالية. لا يصل إليها إلا مستخدم مسجل صراحة في `platform_admins`، ولا يُمنح أصحاب السناتر هذه الصلاحية تلقائيًا. الوصول الداعم لبيانات Tenant الحساسة سيكون لاحقًا عبر Impersonation مؤقت ومدقق، وليس قراءة مفتوحة دائمة.

بعد تطبيق migration، يعيّن مالك قاعدة البيانات أول مشرف من Supabase SQL Editor باستخدام بريد مؤكد وموثوق:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = lower('admin@example.com');
```

استبدل البريد فقط داخل SQL Editor ولا تضع بريد المشرف أو أي credentials في Git. كل نماذج Server Actions تعرض حالة تحميل وتعطّل الإرسال المتكرر أثناء التنفيذ.

بعد قبول مساحة العمل، ينشئ الـOwner أو Admin الحسابات التابعة عبر دعوات بأدوار `Admin` و`Teacher` و`Receptionist` و`Accountant`؛ لا ينشئ كلمات مرور نيابة عنهم. العضوية تخص Tenant واحدة، لذلك يمكن للمستخدم نفسه امتلاك أدوار مختلفة في مساحات متعددة، وتعطيل عضوية لا يحذف Auth user أو يعطل عضوياته الأخرى. حسابات الطالب وولي الأمر تُربط بملفاتهما عبر تحقق موثوق ولا يمكن للمستخدم claim لسجل طالب بنفسه.

نظرًا لتعذر إرسال البريد الآن (لا Domain ولا SMTP)، استعادة كلمة المرور تتم عبر إدارة المنصة: المستخدم يطلب الاستعادة من `/forgot-password`، وتظهر مراجعة في `/platform-admin/password-resets` يراجعها Platform Admin، ثم يولّد النظام كودًا فريدًا مخزنًا كـHash بصلاحية 15 دقيقة لاستخدام واحد، ويُرسله المشرف يدويًا إلى رقم واتساب المسجل عبر رابط `wa.me`، ثم يغيّر المستخدم كلمته من `/reset-password`. تغيير كلمة المرور يستخدم `SUPABASE_SECRET_KEY` داخل Server-only فقط ولا يُكشف مفتاح الخدمة في المتصفح أو Git. الأتمتة عبر WhatsApp API مؤجلة.

## لوحة إدارة المنصة

تعمل `/platform-admin` كـControl Plane فعلية تعتمد على بيانات Supabase الحالية، داخل Dashboard موحّدة بقائمة جانبية ثابتة على الديسكتوب وقائمة قابلة للفتح والإغلاق على الموبايل. تشمل نظرة عامة، طلبات الحسابات، استعادة كلمات المرور، المساحات، المستخدمين والعضويات، تقارير SaaS، وسجل تدقيق مجمّع حسب الـTenant وقابل للبحث والفلترة وفتح تفاصيل الحدث كاملة. جميع الأرقام والقوائم والمخططات ناتجة من استعلامات Server-only وليست قيم Demo ثابتة في الواجهة. يمكن للمشرف تعليق Tenant أو إعادة تفعيله؛ تتغير عضوياته وتُسجل العملية في `platform_audit_logs`.

تضيف migration `20260906215149_seed_platform_demo.sql` بيانات تجريبية معروفة القصد لعرض النظام محليًا؛ حسابات Auth التجريبية تستخدم بريدًا يحمل `demo`، ولا تمثل مستخدمين حقيقيين. لا تُضف بيانات تجريبية عشوائية خارج migration موثقة، خاصة لأن البيئات تشترك في مشروع Supabase واحد.

## التشغيل المحلي

يستخدم المشروع Node.js `22.23.2` كما هو مثبت في `.nvmrc` وCI.

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

ثم افتح `http://localhost:3000`.

## البيئات ومتغيرات التشغيل

| البيئة | مصدر الكود والتشغيل | إعداد المتغيرات | مشروع البيانات |
|---|---|---|---|
| Development | نسخة المطور المحلية عبر `npm run dev` | `.env.local` غير المتتبع في Git | مشروع Supabase `smart-edu-center` المشترك |
| Preview | أي فرع أو Pull Request غير `main` على Vercel | نطاق Vercel Preview | مشروع Supabase `smart-edu-center` المشترك |
| Production | فرع `main` والدومين الإنتاجي على Vercel | نطاق Vercel Production | مشروع Supabase `smart-edu-center` المشترك |

انسخ `.env.example` إلى `.env.local` للتشغيل المحلي واضبط المتغيرين العامين بالقيم غير الإنتاجية المناسبة:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

يعرّف `src/lib/env.ts` العقد العام typed ويتحقق منه عند بدء Next.js أو البناء. يفشل التشغيل برسالة تجمع المتغيرات الناقصة أو غير الصالحة بدل تمرير قيم غير معرّفة إلى Supabase. استخدم هذا العقد بدل قراءة `process.env` مباشرة داخل التطبيق.

المتغيران من نوع Vercel Config لأنهما معلنان للمتصفح. نطاقا Preview وProduction في Vercel يستخدمان حاليًا القيم نفسها لمشروع Supabase المشترك بقرار المالك لتجنب تكلفة مشروع إضافي. هذا يعني أن البيانات ليست معزولة بين البيئات؛ لا تشغّل اختبارات مدمرة أو seed تجريبي من Development/Preview، ولا تضع قيمة فعلية في Git أو في `.env.example`.

لا تستخدم `service_role` في المتصفح أو في متغير يبدأ بـ`NEXT_PUBLIC_`. لا توجد متغيرات خادمية خاصة مطلوبة حاليًا؛ عند إضافتها يجب إبقاؤها في module يحمل `server-only` وعدم تصديرها عبر العقد العام. يفحص `npm run check:client-secrets` أسماء المتغيرات العامة وملفات `.next/static` بعد البناء، وهو جزء من `npm run check`.

## قاعدة البيانات والترقية بين البيئات

طُبقت migrations الحالية على مشروع Supabase المشترك. كل جداول الأعمال تحتوي `tenant_id` ومحمية بـRLS. عند إضافة migration جديدة:

1. أنشئ ملفًا جديدًا forward-only داخل `supabase/migrations`؛ لا تعدّل migration مطبقة.
2. تحقق منها محليًا وداخل CI دون بيانات اعتماد أو تطبيق تلقائي على قاعدة البيانات.
3. راجع أثرها وخطة rollback، ثم طبّقها مرة واحدة على مشروع Supabase المشترك في نافذة معلنة.
4. شغّل اختبارات العزل وSecurity وPerformance Advisors فور التطبيق.
5. راجع Preview Deployment، ثم ادمج الفرع إلى `main` وتحقق من Production.

بسبب مشاركة قاعدة البيانات، أي كتابة من Development أو Preview تصل إلى البيانات نفسها التي تستخدمها Production. أهداف RPO/RTO وحدود الاستعادة موثقة في [`docs/BACKUP_RECOVERY.md`](docs/BACKUP_RECOVERY.md).

## أوامر الجودة

يشغّل GitHub Actions على كل Pull Request وعلى تحديث `main` وظائف مستقلة للـlint وtypecheck والاختبارات والبناء مع فحص Client bundle. توجد وظيفة Migration Safety تتحقق من أسماء وtransaction boundaries للـmigrations وتمنع تعديل أو حذف الملفات القائمة مقارنة بفرع الأساس؛ تعمل بلا بيانات اعتماد ولا تطبق أي تغيير على قاعدة بيانات. تفحص وظيفة Security الحزم الإنتاجية عالية الخطورة والملفات المتتبعة بحثًا عن أنماط الأسرار، ويتابع Dependabot حزم npm وGitHub Actions أسبوعيًا. تستخدم الوظائف Node.js المحدد في `.nvmrc` و`npm ci`، ولا تتصل بقواعد Supabase لأن قيم البناء placeholders عامة فقط. ينشئ تكامل Vercel Git نسخة Preview لكل Pull Request ويضيف رابطها وحالتها ضمن Checks الخاصة بالـPR.

```bash
npm run lint
npm run typecheck
npm run test
npm run check:migrations
npm run check:secrets
npm run build
npm run check:client-secrets
# أو شغّلها كلها بالترتيب:
npm run check
```

## المعمارية

- `src/app`: المسارات وmetadata والـmanifest.
- `src/components`: مكونات الواجهة التفاعلية.
- `src/lib/env.ts`: عقد متغيرات البيئة العامة والتحقق المبكر منها.
- `src/lib/supabase`: عملاء Supabase للمتصفح والخادم.
- `supabase/migrations`: المخطط والسياسات والوظائف.
- `public/sw.js`: Service Worker بسيط للـApp Shell.

## خارطة MVP

1. تأسيس PWA والهوية ولوحة الإدارة.
2. Auth، السنتر، الفروع والصلاحيات.
3. الطلاب وأولياء الأمور والمجموعات.
4. الحضور والتحصيل والإيصالات.
5. المحتوى والواجبات والاختبارات.
6. الإشعارات والتقارير ثم Pilot مع سنتر حقيقي.

## المساهمة وGitHub

استخدم قوالب GitHub عند فتح Bug أو Feature أو Database Migration، واملأ قائمة PR بما يشمل الجودة والأمان وPreview وخطة التعافي عند الحاجة. القوالب موجودة داخل `.github/` وتمنع البلاغات الفارغة التي لا تحتوي خطوات إعادة إنتاج أو معيار نجاح. قواعد أسماء الفروع وConventional Commits ومسار المراجعة موثقة في [`CONTRIBUTING.md`](CONTRIBUTING.md).

## خطة التطوير الكاملة

راجع [`docs/MASTER_DELIVERY_PLAN.md`](docs/MASTER_DELIVERY_PLAN.md). يحتوي على `CURRENT_TASK` والمراحل والاعتماديات وبوابات الجودة للمشروع الكامل، وهو المصدر الوحيد لاختيار التاسك التالية.

التنفيذ الهندسي التفصيلي موجود في [`docs/TECHNICAL_EXECUTION_BACKLOG.md`](docs/TECHNICAL_EXECUTION_BACKLOG.md)، ويحتوي على `CURRENT_TECHNICAL_TASK` والـSchema وRLS وServer Actions والواجهات والاختبارات ومعايير القبول.

## النشر

المصدر على GitHub، والواجهة داخل مشروع Vercel واحد، والبيانات والمصادقة والتخزين داخل مشروع Supabase واحد. رفع فرع غير `main` ينشئ Preview Deployment، بينما تحديث `main` ينشئ Production Deployment؛ كلاهما يتصل بقاعدة البيانات المشتركة حاليًا.
