# Backup & Recovery

## الحالة والنطاق

هذه أهداف أولية لمرحلة البناء والـPilot، وليست ادعاءً بأن المنصة تحققها حاليًا. يغطي النطاق مشروع Supabase `smart-edu-center` المشترك بين Development وPreview وProduction: PostgreSQL وAuth وStorage، إضافة إلى كود التطبيق وإعدادات النشر. Preview Deployment ليس نقطة استعادة مستقلة لأنه يستخدم قاعدة البيانات نفسها.

- **RPO**: أقصى فترة بيانات مقبول فقدها، محسوبة من أحدث نقطة استعادة سليمة.
- **RTO**: أقصى مدة مستهدفة لإعادة الخدمة الأساسية، من إعلان الحادث حتى نجاح فحص التشغيل.

## الأهداف الأولية

| الأصل | الأولوية | RPO المستهدف | RTO المستهدف | ملاحظات |
|---|---:|---:|---:|---|
| PostgreSQL وAuth | حرجة | 24 ساعة | 8 ساعات | يشمل العملاء والعضويات والسجلات التشغيلية؛ يجب خفض RPO قبل تشغيل التحصيل المالي الحقيقي. |
| سجلات الدفع والحضور | حرجة | 24 ساعة مؤقتًا | 8 ساعات | الهدف المؤقت غير كافٍ للإطلاق المالي؛ قبل `FIN-003` يجب اعتماد RPO أقصر وآلية reconciliation. |
| ملفات Supabase Storage | عالية | 24 ساعة | 24 ساعة | تتطلب آلية نسخ مستقلة إذا كانت نسخ قاعدة البيانات لا تشمل محتوى Storage. |
| كود التطبيق والمigrations | عالية | صفر تغييرات مدمجة | ساعتان | GitHub هو المصدر؛ الاستعادة من Commit معروف وإعادة نشر Vercel. |
| إعدادات Vercel وSupabase | عالية | منذ آخر تغيير موثق | 4 ساعات | لا تُحفظ القيم السرية في Git؛ يُعاد إدخالها من لوحة الخدمة بواسطة المالك. |

## سياسة Supabase الحالية

المؤسسة على خطة Free. وفق [توثيق Supabase للنسخ الاحتياطي](https://supabase.com/docs/guides/platform/backups):

| الخطة | النسخ المتاحة من المنصة | الاحتفاظ |
|---|---|---:|
| Free | لا نعتمد على نسخة تلقائية قابلة للاستعادة؛ يلزم logical export دوري خارج Supabase | حسب النسخ التي يديرها المالك |
| Pro | Daily Backups تلقائية | آخر 7 أيام |
| Team | Daily Backups تلقائية | آخر 14 يومًا |
| Enterprise | Daily Backups تلقائية | حتى 30 يومًا |
| Pro/Team/Enterprise + PITR | نقاط استعادة تعتمد WAL؛ RPO في أسوأ حالة دقيقتان | حسب مدة الإضافة المدفوعة |

حتى تتم الترقية، السياسة المطلوبة لـProduction هي export كل 24 ساعة كحد أقصى باستخدام أوامر Supabase الرسمية المنفصلة للـroles والـschema والـdata، ثم حفظ الناتج مشفرًا خارج مشروع Supabase. لا تُوضع connection strings أو كلمات مرور أو ملفات dump داخل Git.

[دليل Supabase للنسخ والاستعادة عبر CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) يحدد المخرجات التالية:

```bash
supabase db dump --db-url "$DATABASE_URL" -f roles.sql --role-only
supabase db dump --db-url "$DATABASE_URL" -f schema.sql
supabase db dump --db-url "$DATABASE_URL" -f data.sql --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Database backups تشمل بيانات PostgreSQL و`auth.users`، لكنها لا تشمل محتوى ملفات Supabase Storage؛ تحتوي القاعدة metadata فقط. لذلك يلزم نسخ objects منفصلًا، كما يجب إعادة إدخال كلمات مرور custom roles وإعدادات Auth providers وSMTP وdomains يدويًا عند الاستعادة إذا استُخدمت.

حذف مشروع Supabase يحذف بياناته ونسخه نهائيًا؛ النسخة المقبولة يجب أن تكون خارج المشروع نفسه. تُراجع هذه السياسة عند الانتقال لخطة مدفوعة وقبل تشغيل مدفوعات حقيقية لتحديد الحاجة إلى PITR.

## Runbook أخذ نسخة يدوية

1. أعلن نافذة النسخ وقلل الكتابات المتزامنة؛ أوقف العمليات الحساسة إذا كان الاتساق يتطلب ذلك.
2. أنشئ مجلد عمل مؤقتًا بصلاحية `0700` خارج المستودع، ومرر connection string من secret manager أو إدخال تفاعلي لا من command history.
3. نفّذ dumps الثلاثة (`roles.sql`, `schema.sql`, `data.sql`) بالأوامر الرسمية أعلاه.
4. تحقق أن الملفات غير فارغة، وابحث في stderr عن فشل، ثم أنشئ SHA-256 لكل ملف.
5. شفّر الملفات قبل نقلها واحفظ النسخة والchecksums في موقع off-site لا يعتمد على مشروع Supabase نفسه.
6. سجل وقت البداية والنهاية، project/environment، حجم الملفات، checksum، والمشغّل دون تسجيل credentials.
7. احذف الملفات النصية غير المشفرة ومجلد العمل المؤقت بعد إثبات وجود النسخة المشفرة.

النسخة غير مقبولة إذا فشل أي dump، أو غاب checksum، أو بقيت فقط على جهاز واحد، أو لم تُختبر قابليتها للاستعادة وفق الجدول الدوري.

## Runbook Supabase Storage

Database dump يحفظ metadata فقط. لكل bucket مستخدم في Production:

1. صدّر inventory يتضمن bucket، المسار الكامل، الحجم، MIME، وآخر تعديل إن توفر.
2. نزّل كل object باستخدام صلاحية خادمية مؤقتة، واحفظه تحت نفس bucket/path خارج Supabase.
3. أنشئ checksum لكل object وقارن عدد الملفات وإجمالي الحجم بالـinventory.
4. شفّر الأرشيف واحفظه off-site مع نسخة الـdatabase المطابقة زمنيًا.
5. عند الاستعادة، أنشئ buckets بنفس public/private وMIME/size policies، ثم ارفع objects إلى المسارات نفسها.
6. قارن العدد والحجم والchecksums، واختبر signed URL لملف خاص بدل تحويل bucket إلى public.

تُمرر Service Role keys عبر environment مؤقتة فقط إلى أداة نسخ إدارية موثوقة؛ لا تُكتب داخل script أو terminal history أو logs. عند عدم وجود buckets أو objects، يُسجل inventory فارغ بدل ادعاء نسخ ملفات.

**Inventory baseline — 2026-09-06:** مشروع Supabase المشترك لا يحتوي Storage buckets أو objects؛ لا توجد ملفات مطلوبة للنسخ في هذه المرحلة.

## Runbook الاستعادة

1. أعلن الحادث، أوقف writes أو ضع التطبيق في maintenance إذا كان استمرار الكتابة قد يفاقم التلف، واحفظ logs والدليل.
2. اختر أحدث نسخة سليمة تسبق الحادث واحسب الفقد المتوقع مقابل RPO.
3. أنشئ بيئة استعادة معزولة فقط بعد اعتماد تكلفتها صراحة؛ لا تستعد فوق المشروع المشترك مباشرة. إذا لم يعتمد المالك موردًا مؤقتًا، يبقى الـrestore drill محجوبًا ولا يُحاكى كنجاح.
4. فعّل extensions والإعدادات غير الافتراضية المطلوبة، ثم استعد داخل transaction واحدة تتوقف عند أول خطأ:

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$RECOVERY_DATABASE_URL"
```

5. استعد أي تغييرات مخصصة في `auth` و`storage` schemas، ثم انسخ Storage objects وفق الـinventory.
6. أعد إعداد Auth providers وredirect URLs وSMTP وwebhooks وdomains، ودوّر API keys أو passwords المتأثرة.
7. تحقق من migration history، وعدد الصفوف، والقيود، وRLS، ووظائف `private.is_tenant_member` و`private.has_tenant_role`.
8. نفّذ اختبارين بعزل تام: مستخدم داخل Tenant ينجح، ومحاولة cross-tenant تفشل. اختبر تسجيل الدخول وقراءة/كتابة مصرح بها وملف Storage خاص.
9. حدّث Vercel Production URL وPublishable Key فقط بعد نجاح التحقق، ثم أنشئ Deployment واختبره قبل تحويل المستخدمين.
10. راقب الأخطاء، وأبقِ المشروع القديم دون حذف حتى اعتماد النتيجة. عند الفشل أعد Vercel إلى القيم السابقة وحقق في نسخة الاستعادة.
11. سجل RPO/RTO الفعليين، البيانات المفقودة، نتائج الفحوص، والقرارات، ثم احذف الموارد المؤقتة بعد الموافقة.

## حدود الخدمة المقبولة

- الأولوية الأولى هي إيقاف الكتابة عند الشك في سلامة البيانات، ثم حماية الدليل قبل الاستعادة.
- الخدمة المستعادة تعني: فتح Production، نجاح المصادقة، سلامة tenant isolation، ونجاح قراءة/كتابة اختبارية مصرح بها.
- لا تُستعاد نسخة فوق Production مباشرة قبل التحقق منها في بيئة معزولة متى كانت الخطة والأدوات تسمحان بذلك.
- أي فقد يتجاوز RPO أو توقف يتجاوز RTO يُسجل كحادث ويؤدي إلى مراجعة الخطة.

## الملكية والمراجعة

مالك المشروع هو مسؤول إعلان الحادث، اختيار نقطة الاستعادة، والتواصل أثناء الـPilot. تُراجع الأهداف بعد أول restore drill، وقبل إدخال مدفوعات حقيقية، وعند تغيير خطة Supabase أو مزود التخزين، وعلى الأقل كل ثلاثة أشهر أثناء التشغيل الفعلي.
