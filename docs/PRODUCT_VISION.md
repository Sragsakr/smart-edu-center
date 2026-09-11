# Saboraty — Product Vision

Status: **MANDATORY CONTRACT** — هذا الملف هو العقد المرجعي لنموذج المنتج التجاري والمعماري.
Reference ADRs: [`adr/0001`](adr/0001-product-dimensions-and-levels.md) · [`adr/0002`](adr/0002-entitlements-over-rbac.md) · [`adr/0003`](adr/0003-academic-catalog-model.md) · [`adr/0004`](adr/0004-branding-and-custom-domains.md)

> هذا الملف يصف **ماذا نبيع ولمن وبأي هيكل**. ترتيب التنفيذ يبقى في [`MASTER_EXECUTION_PLAN.md`](MASTER_EXECUTION_PLAN.md) وحده، والصلاحيات في [`RBAC_MATRIX.md`](RBAC_MATRIX.md).

---

## 1. البُعدان المستقلان — لا يُخلطان أبدًا

المنتج يُوصف ببُعدين مستقلين تمامًا. خلطهما هو الخطأ المعماري الأساسي الذي يجب منعه:

| البُعد | الاسم التقني | القيم | ما الذي يحدده؟ |
|---|---|---|---|
| **A. Customer Type** | `tenants.tenant_type` | `teacher` \| `center` | **شكل الكتالوج والتنقل والتنظيم** — لا يحدد الاشتراك |
| **B. Product Level** | `tenants.product_level` | `operations` \| `management_platform` \| `learning_platform` | **ما هو مشتراة/متاح** — لا يحدد شكل الكتالوج |

**قواعد حاسمة:**

1. `tenant_type` لا يمنح ولا يمنع أي ميزة. مدرس مستقل يمكنه شراء `learning_platform` كاملًا، وسنتر يمكنه البقاء على `operations`.
2. `product_level` لا يغيّر شكل الكتالوج. السنتر والمدرس لهما نفس مفاهيم الكتالوج، والفارق في **عمق الاستخدام** لا في وجود المفهوم.
3. ممنوع في الكود: `if (tenant.type === "center")` كقرار تجاري. القرار يتم عبر `hasEntitlement()`.
4. `tenant_type` يشكّل **التنقل والافتراضات والواجهات** فقط (مثال: المدرس المستقل يخفي الفرع/فريق موظفين معقد؛ السنتر يعرض الفروع والموظفين).

### 1.1 نموذج المدرس المستقل (`teacher`)

```text
Grade 10
  └── Algebra
  └── Geometry
  └── Trigonometry
```

المدرس نفسه قد يدرّس عدة **courses/مواد** داخل نفس الصف. الكتالوج مسطّح نسبيًا ومركّز على المدرس.

### 1.2 نموذج السنتر (`center`)

```text
Grade 10
  └── Mathematics
        ├── Teacher A
        │     └── Algebra
        │     └── Geometry
        └── Teacher B
              └── Algebra
```

السنتر يمكنه أن يمتلك: مراحل متعددة، صفوف متعددة، مواد متعددة، **عدة مدرسين للمادة نفسها**، وعدة courses لكل مدرس.

### 1.3 مسارات التنقل / الفلترة الواجب دعمها

يجب أن يدعم الكتالوج أكثر من مسار تنقل، لأن المستخدمين المختلفين يفكرون بطرق مختلفة:

```text
(1) Stage → Grade → Subject  → Teacher → Course      (سنتر)
(2) Stage → Grade → Teacher  → Courses               (سنتر / مدرس)
(3) Global course catalog بفلاتر: Stage, Grade, Subject, Teacher, Price, (سمات مستقبلية)
```

> **مهم:** «Global catalog» تعني **كل كتالوج الـTenant** عبر كل فروعه ومدرسيه. وهي **ليست** Marketplace بين Tenants — الـMarketplace خارج نطاق المنتج صراحةً.

### 1.4 konsequences: مفاهيم يجب أن تبقى منفصلة

**Subject ≠ Teacher ≠ Course ≠ Course Offering.**

- **Subject**: مادة معرفية (Mathematics، Algebra) — كيان قائم بذاته.
- **Teacher**: شخص/هوية تعليمية، ولا يُربط بمادة واحدة بشكل صارم.
- **Course**: مقرر/منهج يُدرَّس داخل مادة وصف.
- **Course Offering**: **الوحدة القابلة للبيع والتسجيل فعليًا** (مقرر + مدرس + فرع + قاعة + سعر + سعة + نمط).
- **Cohort**: وحدة **التسليم/الجدولة** (مجموعة فعلية لها جدول وحضور).

ممنوع hard-link واحد بين Subject وTeacher. العلاقة N:N عبر `course_teachers`.

التفصيل الكامل في [`adr/0003`](adr/0003-academic-catalog-model.md).

---

## 2. مستويات المنتج الثلاثة

### المستوى 1 — Operations

**متاح للمدرس والسنتر.** إدارة البيزنس الداخلية فقط.

- الطلاب، أولياء الأمور/بيانات الاتصال، المجموعات/الأفواج
- الجداول، القاعات، الفروع حيث ينطبق
- الحضور، الرسوم، الأقساط، المدفوعات، المتأخرات، المصروفات
- الإشعارات، التقارير التشغيلية والمالية
- الموظفون/المدرسون للسناتر

**الطلاب وأولياء الأمور لا يحتاجون بالضرورة حسابًا على المنصة.** هذه هي نقطة الدخول للسوق، وهي أرخص مستوى.

### المستوى 2 — Management Platform

**يشمل Operations كاملًا + منصة رقمية حقيقية.** يُشترى من مدرس مستقل أو سنتر.

يضيف:

- حسابات الطلاب وحسابات أولياء الأمور
- Student Portal، Guardian Portal، Teacher/Staff Portal
- الواجبات، التسليمات، الاختبارات، النتائج
- الملفات والمواد، متابعة تقدم الطالب، الإشعارات، المتابعة التعليمية

### المستوى 3 — Full Learning Platform

**يشمل Operations + Management Platform + التعليم الرقمي.**

يضيف:

- الكورسات، الدروس، محتوى الفيديو، المواد التعليمية
- Content access/entitlements، تتبع التقدم
- Course enrollment، تجربة التعلم الرقمي
- قدرات live-learning مستقبلية

### 2.1 مصفوفة المستويات

| القدرة | Operations | Management Platform | Full Learning Platform |
|---|---|---|---|
| الطلاب/أولياء الأمور/المجموعات/الجداول | ✅ | ✅ | ✅ |
| الحضور | ✅ | ✅ | ✅ |
| الرسوم/الأقساط/المدفوعات/المتأخرات | ✅ | ✅ | ✅ |
| المصروفات والتقارير التشغيلية والمالية | ✅ | ✅ | ✅ |
| الفريق/المدرسون (سنتر) | ✅ | ✅ | ✅ |
| Student / Guardian / Staff Portals | ❌ | ✅ | ✅ |
| الواجبات والتسليمات والاختبارات والنتائج | ❌ | ✅ | ✅ |
| الملفات والمواد ومتابعة التقدم | ❌ | ✅ | ✅ |
| الكورسات والدروس ومحتوى الفيديو | ❌ | ❌ | ✅ |
| Course enrollment وتجربة التعلم الرقمي | ❌ | ❌ | ✅ |
| Live learning | ❌ | ❌ | 🔜 مخطط |

---

## 3. طبقات القرار الثلاث — Entitlement / RBAC / Scope

أي قرار وصول في النظام يمر بثلاث طبقات مستقلة، وكل طبقة مصدر حقيقتها مختلف. **لا تُدمج ولا يُستغنى عن إحداها بأخرى:**

```text
Effective Access = Entitlement(tenant, capability)   ← تجاري: هل للمساحة الحق في الميزة؟
                 AND RBAC(role, action)               ← صلاحيات: هل للعضو الحق في الفعل؟
                 AND Scope(resource)                  ← نطاق: هل هذا المورد داخل نطاقه؟
```

| الطبقة | السؤال | مصدر الحقيقة | النطاق |
|---|---|---|---|
| **Entitlement** | هل اشتركت المساحة في هذه الميزة؟ | `tenants.product_level` + `tenant_entitlements` | Tenant |
| **RBAC** | هل هذا الدور يملك هذا الفعل؟ | [`RBAC_MATRIX.md`](RBAC_MATRIX.md) و`src/lib/authorization/policy.ts` | Tenant + Role |
| **Scope** | هل هذا المورد تحديدًا داخل نطاقه؟ | علاقات قاعدة البيانات (offering/cohort/student) | Resource |

**أمثلة توضح الاستقلال:**

- مدرس مستقل مشترك في `learning_platform`، لكن الطالب **غير** ملتحق بأي course → لا وصول للمحتوى (Entitlement ✅ / Enrollment ❌).
- سنتر على `operations` ولديه عضو `owner` → لا يستطيع فتح Student Portal لأن الميزة غير مشتراة (RBAC ✅ / Entitlement ❌).
- سنتر على `management_platform` وعضو `teacher` يحاول قراءة طالب في offering لا يدرّسه → ممنوع (Entitlement ✅ / RBAC ✅ / Scope ❌).

التفصيل في [`adr/0002`](adr/0002-entitlements-over-rbac.md).

### 3.1 كتالوج القدرات (Capability Catalog)

مصدر الحقيقة الوحيد لتعريفات القدرات سيكون ملف TypeScript واحد (`src/lib/entitlements/catalog.ts`)، ويُشتق منه صف مقابل في جدول `capability_catalog` داخل قاعدة البيانات للأغراض المرجعية/التقارير — **لا ليكون مصدر حقيقة ثانيًا**.

المفاتيح الثابتة:

| المفتاح | النوع | يبدأ من مستوى | الوصف |
|---|---|---|---|
| `ops.core` | feature | `operations` | الطلاب، أولياء الأمور، المجموعات، الجداول، الحضور، الرسوم، الأقساط، المدفوعات، المتأخرات، المصروفات، الإشعارات، التقارير التشغيلية والمالية، الفريق/المدرسون |
| `platform.portal.student` | feature | `management_platform` | بوابة الطالب |
| `platform.portal.guardian` | feature | `management_platform` | بوابة ولي الأمر |
| `platform.portal.staff` | feature | `management_platform` | بوابة المدرس/الموظف |
| `platform.homework` | feature | `management_platform` | الواجبات والتسليمات |
| `platform.exams` | feature | `management_platform` | الاختبارات |
| `platform.results` | feature | `management_platform` | النتائج والتقييم |
| `platform.materials` | feature | `management_platform` | الملفات والمواد |
| `platform.progress` | feature | `management_platform` | متابعة تقدم الطالب |
| `platform.notifications` | feature | `management_platform` | الإشعارات التعليمية |
| `learning.courses` | feature | `learning_platform` | الكورسات والدروس |
| `learning.content` | feature | `learning_platform` | المحتوى والمواد الرقمية |
| `learning.video` | feature | `learning_platform` | محتوى الفيديو والاستضافة |
| `learning.enrollment` | feature | `learning_platform` | التسجيل في الكورسات الرقمية |
| `learning.progress` | feature | `learning_platform` | تتبع تقدم التعلم الرقمي |
| `learning.live` | feature | — (add-on مستقبلي) | الجلسات المباشرة |
| `branding.custom_domain` | addon | — | دومين مخصص |
| `branding.white_label` | addon | — | إخفاء هوية سبورتي بالكامل |
| `comms.whatsapp` | addon | — | قناة واتساب |
| `comms.sms` | addon | — | قناة SMS |
| `storage.extra` | addon | — | مساحة تخزين إضافية |
| `reporting.advanced` | addon | — | تقارير متقدمة |
| `branches.extra` | addon | — | فروع إضافية |
| `staff.extra` | addon | — | مستخدمون/موظفون إضافيون |
| `payments.online` | addon | — | بوابات دفع مستقبلية |

مفاتيح المستوى (Level-included) تُشتق في دالة واحدة `defaultEntitlementsForLevel(level)` — لا قوائم مكررة في الكود.

### 3.2 شكل منح الـEntitlement

`tenant_entitlements` تحمل لكل قدرة: `state` (`active`/`pending`/`expired`/`revoked`)، و`source` (`plan`/`addon`/`trial`/`manual`/`promotion`)، و`limits` (jsonb)، و`effective_from`/`effective_to`، و`granted_by`.

يمكن أن توجد **قدرة نشطة فوق المستوى** (add-on) أو **قدرة مسحوبة تحت المستوى** (استثناء تجاري موثق) — ولهذا `product_level` وحده لا يكفي كمصدر حقيقة.

---

## 4. النموذج التجاري

التسعير له ثلاثة أبعاد مستقلة:

1. **Product Level** — Operations → Management Platform → Full Learning Platform.
2. **Customer Scale** — `teacher` مقابل `center` (السنتر قد يتدرج لاحقًا بحسب: عدد الطلاب، المدرسين/الموظفين، الفروع، الاستخدام).
3. **Add-ons** — Custom Domain/White-label، Video storage & streaming، WhatsApp/SMS، مساحة إضافية، مستخدمون إضافيون، تقارير متقدمة، خدمات دفع مستقبلية.

### 4.1 القاعدة التجارية الحرجة — الترقية بدون فقدان

**يجب** أن يستطيع العميل الترقية:

```text
Operations → Management Platform → Full Learning Platform → White-label / Custom Domain
```

**بدون** أي من التالي:

- ❌ إنشاء Tenant آخر
- ❌ الانتقال إلى منتج آخر
- ❌ نقل بياناته
- ❌ تغيير الـcodebase

**نفس الـTenant ونفس البيانات تستمر. فقط القدرات/الـEntitlements تتوسع.**

آليًا: الترقية = تعديل `tenants.product_level` + إضافة/تفعيل صفوف `tenant_entitlements` + Audit. لا Migration، ولا نسخ بيانات.

وبالمثل، **التخفيض لا يحذف بيانات العميل أبدًا** — يوقف الوصول ويحفظ البيانات مع سلوك Grace واضح.

---

## 5. الاستضافة وWhite-label

### 5.1 لا يوجد codebase منفصل لكل عميل — أبدًا

```text
ONE CODEBASE → MULTI-TENANT → MULTI-BRAND → MULTI-DOMAIN
```

### 5.2 وضعا التشغيل

| الوضع | مثال | ملاحظة |
|---|---|---|
| **Saboraty Hosted** | `teacher-name.saboraty.online` | Subdomain على منصة سبورتي |
| **White-label / Custom Domain** | `academy.com` | نفس التطبيق ونفس الـruntime |

عميل الدومين المخصص **يعمل على نفس التطبيق ونفس الـcodebase**. الـTenant configuration يتحكم في: العلامة، الشعار، الألوان/الثيم، الاسم العام، الدومين/الـsubdomain، إعدادات المنصة، الميزات المفعّلة، والـEntitlements.

**الدومين المخصص لا يعني Deployment منفصلًا ولا Codebase منفصلًا.** وبيانات الـTenant تبقى معزولة.

### 5.3 استثناء مستقبلي

يُسمح للمعمارية أن تتيح لاحقًا خيار **بنية تحتية/قاعدة بيانات مخصصة** لعملاء المؤسسات (enterprise) — لكنه **ليس النموذج الافتراضي** ولا يُبنى قبل حاجة مثبتة وقرار موثق.

---

## 6. الحالة المعلنة للميزات — Available / Coming Soon / Planned

أي عرض للمنتج (Landing Page، صفحات التسعير، العرض التجاري) **يجب** أن يميّز بصراحة:

| الوسم | المعنى |
|---|---|
| **Available** | مبنية وتعمل في النسخة المنشورة فعليًا |
| **Coming Soon** | مبنية/قيد البناء في مرحلة معتمدة داخل الخطة ولها Task فعلية |
| **Planned** | داخل رؤية المنتج لكن لا Task منفَّذة بعد |

**ممنوع** عرض ميزة `Planned` أو `Coming Soon` كأنها متاحة. الـLanding Page تعرض **الرؤية الكاملة** مع وسم الحالة لكل عنصر — الرؤية كاملة، والدقة في الحالة.

---

## 7. نموذج الطالب — علاقتان لا نوع واحد

- **Center Student**: علاقته بالفرع/المجموعة/الحضور/الاشتراك الحضوري.
- **Online Student**: علاقته بالكورس/التسجيل/الوصول/التقدم/الاختبارات.

الشخص نفسه يمكن أن يكون الاثنين عبر Identity واحدة وعلاقتين منفصلتين. لا يُستخدم `student_type` واحد كمميّز وحيد، ولا يُجبر Online Student على Branch/Group، ولا يدخل Online Enrollment تلقائيًا في حساب طلاب السنتر.

وصول LMS **لا** يُستنتج من كون الطالب طالب سنتر — بل من Entitlement + Online Enrollment معًا.

---

## 8. خارج نطاق المنتج

- Marketplace بين Tenants (بيع الكورسات بين مساحات مختلفة).
- SIS/ERP مدرسي كامل.
- بث فيديو مملوك (owned video conferencing / streaming infra).
- ميزات AI عامة بلا حاجة مثبتة.
- Codebase أو Deployment منفصل لكل عميل.

---

## 9. حدود المسؤولية بين الملفات

| الملف | ماذا يملك؟ |
|---|---|
| `docs/PRODUCT_VISION.md` (هذا الملف) | نموذج المنتج، البُعدان، المستويات، القدرات، النموذج التجاري، الاستضافة |
| `docs/MASTER_EXECUTION_PLAN.md` | ترتيب التنفيذ، المراحل، الـTasks، المؤشر |
| `docs/RBAC_MATRIX.md` | صلاحيات الأدوار × الموارد + علاقتها بطبقة Entitlement |
| `docs/adr/*` | قرارات معمارية وأسبابها وبدائلها |
| `docs/ENGINEERING_PRINCIPLES.md` | المبادئ الهندسية العامة |
