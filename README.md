# Smart Edu Center

منصة Web PWA عربية لإدارة المدرسين والسناتر التعليمية: الطلاب، المجموعات، الحضور، التحصيل، المحتوى والتقارير.

## الحالة الحالية

- Next.js 16 App Router + TypeScript + Tailwind CSS 4.
- واجهة عربية RTL متجاوبة وقابلة للتثبيت كـPWA.
- Vertical slice أولي: لوحة الإدارة، الطلاب، البحث، وحالة السداد.
- مخطط Supabase متعدد المستأجرين مع RLS في `supabase/migrations`.
- مشروع Vercel واحد ومشروع Supabase واحد باسم `smart-edu-center` يخدمان Development وPreview وProduction دون تكلفة مشروع بيانات إضافي.

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
