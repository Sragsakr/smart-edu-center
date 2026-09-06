# Smart Edu Center

منصة Web PWA عربية لإدارة المدرسين والسناتر التعليمية: الطلاب، المجموعات، الحضور، التحصيل، المحتوى والتقارير.

## الحالة الحالية

- Next.js 16 App Router + TypeScript + Tailwind CSS 4.
- واجهة عربية RTL متجاوبة وقابلة للتثبيت كـPWA.
- Vertical slice أولي: لوحة الإدارة، الطلاب، البحث، وحالة السداد.
- مخطط Supabase متعدد المستأجرين مع RLS في `supabase/migrations`.
- بيئتا Preview وProduction منفصلتان في Vercel، ولكل منهما مشروع Supabase مستقل في Frankfurt.

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
| Development | نسخة المطور المحلية عبر `npm run dev` | `.env.local` غير المتتبع في Git | مشروع Supabase Preview وبيانات اختبار غير إنتاجية حاليًا |
| Preview | أي فرع أو Pull Request غير `main` على Vercel | نطاق Vercel Preview | مشروع Supabase `smart-edu-center` في Frankfurt |
| Production | فرع `main` والدومين الإنتاجي على Vercel | نطاق Vercel Production | مشروع Supabase `smart-edu-center-production` في Frankfurt |

انسخ `.env.example` إلى `.env.local` للتشغيل المحلي واضبط المتغيرين العامين بالقيم غير الإنتاجية المناسبة:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

يعرّف `src/lib/env.ts` العقد العام typed ويتحقق منه عند بدء Next.js أو البناء. يفشل التشغيل برسالة تجمع المتغيرات الناقصة أو غير الصالحة بدل تمرير قيم غير معرّفة إلى Supabase. استخدم هذا العقد بدل قراءة `process.env` مباشرة داخل التطبيق.

المتغيران من نوع Vercel Config لأنهما معلنان للمتصفح، لكن يجب أن تبقى قيم Preview وProduction منفصلة. لا توجّه Development إلى Production، ولا تنسخ القيم بين النطاقات، ولا تضع قيمة فعلية في Git أو في `.env.example`.

لا تستخدم `service_role` في المتصفح أو في متغير يبدأ بـ`NEXT_PUBLIC_`. لا توجد متغيرات خادمية خاصة مطلوبة حاليًا؛ عند إضافتها يجب إبقاؤها في module يحمل `server-only` وعدم تصديرها عبر العقد العام. يفحص `npm run check:client-secrets` أسماء المتغيرات العامة وملفات `.next/static` بعد البناء، وهو جزء من `npm run check`.

## قاعدة البيانات والترقية بين البيئات

طُبقت migrations الحالية على مشروعي Preview وProduction. كل جداول الأعمال تحتوي `tenant_id` ومحمية بـRLS. عند إضافة migration جديدة:

1. أنشئ ملفًا جديدًا forward-only داخل `supabase/migrations`؛ لا تعدّل migration مطبقة.
2. طبّقها على Preview أولًا وشغّل اختبارات العزل وSecurity وPerformance Advisors.
3. راجع Preview Deployment والرحلات المتأثرة قبل لمس Production.
4. طبّق نفس migrations بالترتيب على Production، ثم ادمج الفرع إلى `main`.
5. تحقق من Production Deployment ومسارات التشغيل المتأثرة وسجّل النتيجة في خطة التنفيذ.

لا تُنسخ بيانات Preview إلى Production تلقائيًا، ولا تُستخدم بيانات مستخدمين حقيقية في Development أو Preview.

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

## خطة التطوير الكاملة

راجع [`docs/MASTER_DELIVERY_PLAN.md`](docs/MASTER_DELIVERY_PLAN.md). يحتوي على `CURRENT_TASK` والمراحل والاعتماديات وبوابات الجودة للمشروع الكامل، وهو المصدر الوحيد لاختيار التاسك التالية.

التنفيذ الهندسي التفصيلي موجود في [`docs/TECHNICAL_EXECUTION_BACKLOG.md`](docs/TECHNICAL_EXECUTION_BACKLOG.md)، ويحتوي على `CURRENT_TECHNICAL_TASK` والـSchema وRLS وServer Actions والواجهات والاختبارات ومعايير القبول.

## النشر

المصدر على GitHub، والواجهة على Vercel، والبيانات والمصادقة والتخزين على Supabase. رفع فرع غير `main` ينشئ Preview Deployment، بينما تحديث `main` ينشئ Production Deployment. تأكد دائمًا من نطاق متغيرات Vercel ومن تطبيق migrations على قاعدة البيانات المقابلة قبل الترقية.
