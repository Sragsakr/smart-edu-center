# Smart Edu Center

منصة Web PWA عربية لإدارة المدرسين والسناتر التعليمية: الطلاب، المجموعات، الحضور، التحصيل، المحتوى والتقارير.

## الحالة الحالية

- Next.js 16 App Router + TypeScript + Tailwind CSS 4.
- واجهة عربية RTL متجاوبة وقابلة للتثبيت كـPWA.
- Vertical slice أولي: لوحة الإدارة، الطلاب، البحث، وحالة السداد.
- مخطط Supabase متعدد المستأجرين مع RLS في `supabase/migrations`.
- وضع Demo للواجهة حتى تُضبط متغيرات Supabase.

## التشغيل المحلي

يتطلب Node.js 20.9 أو أحدث.

```bash
npm install
cp .env.example .env.local
npm run dev
```

ثم افتح `http://localhost:3000`.

## متغيرات البيئة

انسخ `.env.example` إلى `.env.local` واضبط:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

يعرّف `src/lib/env.ts` العقد العام typed ويتحقق منه عند بدء Next.js أو البناء. يفشل التشغيل برسالة تجمع المتغيرات الناقصة أو غير الصالحة بدل تمرير قيم غير معرّفة إلى Supabase. استخدم هذا العقد بدل قراءة `process.env` مباشرة داخل التطبيق.

لا تستخدم `service_role` في المتصفح أو في متغير يبدأ بـ`NEXT_PUBLIC_`. لا توجد متغيرات خادمية خاصة مطلوبة حاليًا؛ عند إضافتها يجب إبقاؤها في module يحمل `server-only` وعدم تصديرها عبر العقد العام.

## قاعدة البيانات

طبّق ملفات `supabase/migrations` بالترتيب على مشروع Supabase المرتبط. كل جداول الأعمال تحتوي `tenant_id` ومحمية بـRLS. بعد التطبيق شغّل مستشاري Database/Security في Supabase وتحقق من عدم وجود جداول مكشوفة بلا RLS.

## أوامر الجودة

```bash
npm run lint
npm run typecheck
npm run test
npm run build
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

المصدر على GitHub، الواجهة على Vercel، والبيانات والمصادقة والتخزين على Supabase. أضف متغيرات البيئة في Vercel لكل من Preview وProduction قبل أول نشر متصل بالبيانات.
