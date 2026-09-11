# ADR-0003 — فصل Subject / Teacher / Course / Course Offering

- **Status:** Accepted
- **Date:** 2026-09-11
- **Related:** [ADR-0001](0001-product-dimensions-and-levels.md) · [`PRODUCT_VISION.md`](../PRODUCT_VISION.md)

## Context

الـcanonical baseline يعرّف التسليم التعليمي بجدول واحد:

```sql
create table public.cohorts (
  ...
  subject text,
  teacher_user_id uuid,
  capacity integer,
  foreign key (tenant_id, teacher_user_id) references public.memberships(tenant_id, user_id)
);
```

هذا يعني:

1. **Subject** نص حر داخل المجموعة، لا كيان قابل للفلترة أو التنقل.
2. **Teacher** مدمج داخل المجموعة كعمود واحد، فيستحيل وجود عدة مدرسين للمادة نفسها.
3. لا يوجد **Course** ولا **Course Offering** ككيان قابل للبيع والتسجيل.
4. `students.grade` نص حر أيضًا، فلا شجرة Stage → Grade → Subject.

النتيجة: مسارات التنقل الثلاثة المطلوبة (Stage→Grade→Subject→Teacher→Course، Stage→Grade→Teacher→Course، والـGlobal catalog بالفلاتر) **غير قابلة للتمثيل**، ومفهوم «العرض القابل للبيع» غير موجود أصلًا في نموذج البيانات.

## Decision

نفصل المفاهيم إلى كيانات مستقلة:

| الكيان | الدور |
|---|---|
| `stages` | مرحلة تعليمية |
| `grades` | صف داخل مرحلة |
| `subjects` | مادة معرفية |
| `teachers` | هوية تعليمية (يمكن أن توجد بلا حساب مستخدم، مثل طالب بلا حساب) |
| `courses` | مقرر داخل مادة وصف |
| `course_teachers` | علاقة **N:N** بين Course وTeacher |
| `course_offerings` | **الوحدة القابلة للبيع والتسجيل**: course + teacher + branch + room + mode + capacity + price |
| `cohorts` | وحدة **التسليم/الجدولة**، تشير إلى offering |
| `rooms` | قاعة داخل فرع |
| `enrollments` | اشتراك الطالب في offering (التجاري) |
| `cohort_members` | عضوية الطالب في مجموعة (التسليم/الحضور) |

**قواعد ملزمة:**

1. ممنوع أي hard-link واحد بين Subject وTeacher؛ العلاقة عبر `course_teachers`.
2. `cohorts.subject` و`cohorts.teacher_user_id` يُحذفان ويُستبدلان بـ`course_offering_id`.
3. `students.grade text` يُستبدل بـ`students.grade_id` (مع الحفاظ على العرض عبر join).
4. التسجيل التجاري على الـOffering، والتسليم/الحضور على المجموعة.
5. **«Global catalog» = كل كتالوج الـTenant**، وليست Marketplace بين Tenants.

## Consequences

**إيجابيات:**
- مسارات التنقل الثلاثة والفلترة المتعددة الأبعاد (Stage/Grade/Subject/Teacher/Price) قابلة للتمثيل والفلترة بكفاءة.
- سنتر بمراحل ومواد وعدة مدرسين للمادة نفسها مدعوم طبيعيًا.
- مدرس مستقل يستخدم نفس المفاهيم بعمق أقل — لا نموذج موازٍ.
- «العرض القابل للبيع» كيان صريح، فيمكن تسعيره وتسجيله وتقاريره بلا التباس مع المجموعة.

**سلبيات/تكاليف:**
- إعادة بناء `cohorts` وإعادة تطبيق baseline (مقبولة في Build Mode، وقبل تنفيذ `P03/P04`).
- استعلامات الطالب/ولي الأمر تحتاج joins أعمق (`portal-data.ts`).
- علاقة الطالب أصبحت على مستويين (offering + cohort) ويجب تعريف قواعد الاتساق بينهما بوضوح.

## Alternatives considered

| البديل | سبب الرفض |
|---|---|
| إبقاء `cohorts.subject` كنص وإضافة `courses` فقط | لا يحل شجرة Stage/Grade/Subject ولا تعدد المدرسين |
| إضافة `subject_id` و`teacher_id` إلى `cohorts` بلا courses/offerings | لا يوجد كيان قابل للبيع؛ التسعير يبقى على المجموعة ويفسد التقارير |
| جدول `offerings` بلا `cohorts` | لا يمكن تمثيل عدة مجموعات لنفس العرض بجداول وقاعات مختلفة |
| Marketplace بين Tenants | خارج نطاق المنتج صراحةً |

## Compliance

- يُنفَّذ في `P01-07` (Academic Catalog Foundation).
- يلزم تحديث [`RBAC_MATRIX.md`](../RBAC_MATRIX.md) لنقل Teacher scope إلى `course_offerings.teacher_id` / `course_teachers`.
- يلزم `rooms` لدعم `P03-04`، وtenant-composite constraints لكل علاقة جديدة.
