# Smart Edu Center — RBAC Matrix

هذه الوثيقة هي العقد المرجعي لصلاحيات أعضاء مساحة العمل في منتج **Management**، وهي مصدر التنفيذ لـ `IAM-005-02..05`.

> القاعدة الأساسية: إخفاء الزر في الواجهة ليس حماية. كل صلاحية هنا يجب أن تُفرض في RLS/DAL/Server Actions، مع `tenant_id` كحد عزل إلزامي.

## 0. موقع هذه الوثيقة من طبقات القرار

هذه الوثيقة تملك **طبقة RBAC** فقط. القرار الكامل ثلاث طبقات، وكل طبقة مصدر حقيقتها مختلف ([`PRODUCT_VISION.md`](PRODUCT_VISION.md) §3 و[`adr/0002`](adr/0002-entitlements-over-rbac.md)):

```text
Effective Access = Entitlement(tenant, capability)   ← PRODUCT_VISION + tenant_entitlements
                 AND RBAC(role, action)               ← هذه الوثيقة + src/lib/authorization/policy.ts
                 AND Scope(resource)                  ← علاقات قاعدة البيانات
```

ممنوع أن تحل إحدى الطبقات محل الأخرى:

- امتلاك الدور للصلاحية **لا** يمنح ميزة غير مشتراة (Entitlement مرفوض → مرفوض).
- وجود الاشتراك **لا** يمنح كل الأدوار كل الأفعال (RBAC مرفوض → مرفوض).
- امتلاك الصلاحية والاشتراك **لا** يمنح موردًا خارج النطاق (Scope مرفوض → مرفوض).

المصفوفة أدناه تصف RBAC وScope فقط، ولا تصف باقات المنتج ولا الـAdd-ons.

## 1. الأدوار المشمولة

| الدور | الغرض |
|---|---|
| `owner` | مالك مساحة العمل وصاحب السلطة النهائية داخل الـTenant. |
| `admin` | مدير التشغيل اليومي، بدون صلاحيات ملكية أو تصعيد مالك. |
| `teacher` | مدرس يعمل فقط على نطاق المجموعات/الحصص الأكاديمية المسندة إليه. |
| `receptionist` | تشغيل الطلاب والتسجيل والمجموعات والتحصيل التشغيلي الأساسي حسب الصلاحيات أدناه. |
| `accountant` | الشؤون المالية والتحصيل والتقارير المالية بدون تعديل أكاديمي. |

## 2. Actors خارج Member RBAC

- **Platform Admin** ليس Member Role ولا يمر بهذه المصفوفة؛ له Control Plane منفصل ودخول منفصل.
- **Student** و**Guardian** ليسا Memberships. وصولهما Self/Relationship-based عبر `students.user_id` و`guardians.user_id` و`student_guardians`، وسيُحكم بشكل منفصل ضمن `IAM-005-06`.
- الحساب قد يملك Memberships في أكثر من Tenant، ويُحسب الدور لكل Tenant بصورة مستقلة.

## 3. مفتاح الصلاحيات

- `C` = Create
- `R` = Read
- `U` = Update
- `D` = Delete
- `—` = غير مسموح
- `R* / U* / C*` = مسموح داخل Scope مقيد موضح أسفل الجدول

الحذف هنا يعني حذف Record فعليًا فقط عندما يكون مقبولًا تجاريًا. في الكيانات الحساسة نفضل **تعطيل/إلغاء** بدل Hard Delete.

## 4. المصفوفة الرئيسية — Resource × CRUD

| Resource | Owner | Admin | Teacher | Receptionist | Accountant |
|---|---|---|---|---|---|
| Tenant profile/settings | `R,U` | `R,U*` | `R` | `R` | `R` |
| Branches | `C,R,U,D` | `C,R,U,D` | `R` | `R` | `R` |
| Rooms | `C,R,U,D` | `C,R,U,D` | `R` | `R` | `R` |
| Stages / Grades / Subjects | `C,R,U,D` | `C,R,U,D` | `R` | `R` | `R` |
| Teacher records | `C,R,U,D` | `C,R,U,D` | `R*` | `C,R,U` | `R` |
| Courses | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R,U*` | `R` |
| Course offerings | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R,U*` | `R` |
| Memberships / team | `C,R,U,D*` | `C,R,U*` | `R*` | `R*` | `R*` |
| Invitations | `C,R,U,D` | `C,R,U,D*` | `—` | `—` | `—` |
| Students | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R,U*` | `R` |
| Guardians | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R,U*` | `R` |
| Student ↔ Guardian links | `C,R,U,D` | `C,R,U,D` | `R*` | `C,R,U,D` | `R` |
| Cohorts / groups (delivery) | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R,U*` | `R` |
| Enrollments (offering) | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R,U*` | `R` |
| Cohort membership | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R,U*` | `R` |
| Class sessions | `C,R,U,D*` | `C,R,U,D*` | `C*,R*,U*,D*` | `R` | `R` |
| Attendance | `C,R,U,D*` | `C,R,U,D*` | `C*,R*,U*` | `C,R,U*` | `R` |
| Invoices | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R,U*` | `C,R,U,D*` |
| Payments | `C,R,U,D*` | `C,R,U,D*` | `R*` | `C,R*` | `C,R,U,D*` |
| Audit logs | `R` | `R` | `—` | `—` | `—` |

## 5. القيود الدقيقة لكل Resource

### Tenant profile/settings
- `owner`: تعديل اسم المساحة، بيانات التشغيل والإعدادات العامة.
- `admin`: تعديل الإعدادات التشغيلية غير الحساسة فقط. لا نقل ملكية، لا حذف Tenant، ولا تغييرات Billing/Subscription النهائية.
- باقي الأدوار: قراءة بيانات المساحة اللازمة لعرض الواجهة فقط.

### Memberships / team
- `owner`: يدير كل الأدوار ما عدا إزالة/تعطيل آخر Owner؛ نقل الملكية له Flow مستقل في `IAM-006`.
- `admin`: يمكنه دعوة/إدارة `teacher`, `receptionist`, `accountant`. لا يعطل/يعيد تنشيط/يرفع Admin آخر، ولا يدير Owner.
- `teacher/receptionist/accountant`: قراءة الحد الأدنى من بيانات الفريق اللازمة للتشغيل (الاسم/الدور)، وليس بيانات حساسة للحسابات.
- لا يوجد Self role escalation لأي دور.

### Invitations
- `owner`: إنشاء/إعادة إرسال/إلغاء دعوات للأدوار المسموح تعيينها.
- `admin`: نفس التدفق لكن لا ينشئ أو يدير دعوة `owner`، ولا يمنح صلاحية أعلى من المسموح له إدارتها.
- الدعوة مربوطة بـTenant + Email + Role + Token Hash + Expiry، ولا تمنح Membership إلا بعد القبول الصحيح.

### Students
- `teacher R*`: فقط الطلاب الملتحقون بعروض/مجموعات يكون المدرس فيها مسندًا إليه عبر `course_offerings.teacher_id` / `course_teachers`.
- `receptionist`: إنشاء وتحديث البيانات التشغيلية للطالب؛ لا يغير روابط هوية Auth أو حقول أمنية مستقبلية.
- `accountant`: قراءة بيانات التعريف اللازمة للفواتير والتحصيل فقط.
- الحذف يفضل أن يكون `active=false`; Hard Delete محجوز Owner/Admin عندما لا توجد تبعيات تمنعه.

### Guardians / Student-Guardian links
- `teacher R*`: فقط أولياء أمور الطلاب المرئيين له، وبأقل بيانات اتصال لازمة للتشغيل.
- `receptionist`: إدارة بيانات ولي الأمر وربطه بالطلاب.
- `accountant`: قراءة بيانات التعريف/الاتصال اللازمة للتحصيل فقط.
- ربط Guardian بحساب Auth فعلي لا يتم يدويًا من CRUD عام؛ له Claim/Invite flow موثوق في `IAM-005-06`.

### Catalog: Stages / Grades / Subjects / Rooms
- تعديل هذه المراجع التنظيمية متاح لـOwner/Admin بحرية، ولـ`receptionist` تشغيليًا.
- `teacher`: قراءة فقط للتنقل، ولا يعدّل شجرة المراحل/الصفوف/المواد.
- الأرشفة تُفضّل على الحذف عند وجود تبعيات (courses/offerings/cohorts).

### Teacher records
- **`teachers` كيان مستقل عن `memberships`**: يمكن وجود مدرس بلا حساب مستخدم (مثل طالب بلا حساب في Operations)، ويمكن ربطه لاحقًا بـ`membership` عند منحه دخولًا.
- `owner`/`admin`: إنشاء وتعديل وأرشفة سجلات المدرسين، وربط/فصل الحساب.
- `receptionist`: إدارة البيانات التشغيلية للمدرس.
- `teacher R*`: قراءة سجله وباقي المدرسين بالحد الأدنى اللازم للتشغيل (اسم/مادة).
- ربط سجل المدرس بحساب Auth فعلية لا يتم من CRUD عام بشكل يعطي صلاحيات؛ الدخول يحتاج `membership` نشطة.

### Courses وCourse offerings
- `owner`/`admin`: إدارة كاملة للمقررات والـofferings بما يشمل التسعير والسعة.
- `receptionist`: إنشاء/تحديث تشغيلي، وتغيير المدرس أو السعر يخضع Owner/Admin في DAL عند التنفيذ.
- `teacher R*`: يرى فقط المقررات والـofferings المرتبط بها عبر `course_teachers` أو `course_offerings.teacher_id`.
- `accountant`: قراءة الـoffering وسعره وربطه بالطالب لأغراض الفواتير فقط.

### Cohorts / groups (delivery)
- `teacher R*`: المجموعات التي يكون مدرس الـoffering المرتبط بها مسندًا إليه عبر `course_offerings.teacher_id` / `course_teachers` — **وليس** عبر عمود مدرس مباشر على المجموعة.
- `receptionist`: إنشاء/تحديث البيانات التشغيلية للمجموعة، لكن تغيير ربطها بـ`course_offering` أو القرارات الحساسة يخضع Owner/Admin في DAL عند التنفيذ.
- `accountant`: قراءة اسم المجموعة وربطها بالطالب لأغراض التقارير/الفواتير فقط.

### Enrollments (على العرض) وCohort membership (على التسليم)
- `teacher R*`: Enrollments وcohort memberships داخل مجموعاته/عروضه فقط.
- `receptionist`: إضافة/نقل/تعطيل Enrollment وعضوية المجموعة تشغيليًا ضمن نفس Tenant، مع منع عدم الاتساق (لا cohort member بلا enrollment نشط لنفس الـoffering).
- `accountant`: قراءة فقط لفهم خدمة الطالب ماليًا.

### Class sessions
- `teacher C*/R*/U*/D*`: فقط Sessions لمجموعة مسندة إليه. لا يستطيع إنشاء Session لمجموعة مدرس آخر.
- `receptionist/accountant`: قراءة الجدول اللازم للتشغيل فقط.

### Attendance
- `teacher C*/R*/U*`: فقط Sessions لمجموعاته وطلاب Enrollment النشطين فيها.
- `receptionist`: يمكنه تسجيل/تصحيح الحضور تشغيليًا لكل Tenant، لكن يجب تسجيل `marked_by` وAudit عند التصحيح الحساس.
- `accountant`: قراءة فقط إذا احتاج تقرير مالي/اشتراك مرتبط بالحضور.
- حذف سجل حضور ليس التدفق الطبيعي؛ التصحيح Update. Hard Delete Owner/Admin فقط عند الحاجة الإدارية.

### Invoices
- `teacher R*`: فقط فواتير طلاب مجموعاته، وبدون معلومات داخلية مالية لا يحتاجها مستقبلًا.
- `receptionist`: إنشاء فاتورة/تسجيل بيانات استحقاق بسيطة وتحديث غير محاسبي؛ لا Void نهائي ولا تعديل قيود مالية بعد التسوية بدون صلاحية أعلى.
- `accountant`: السلطة التشغيلية الأساسية على الفواتير والتحصيل المالي.
- `void` يُعامل كAction حساس وليس Delete عادي، ويجب Audit.

### Payments
- `teacher R*`: قراءة حالة الدفع للطلاب المرئيين له فقط، لا تفاصيل محاسبية زائدة.
- `receptionist C/R*`: تسجيل تحصيل مباشر وقراءة المدفوعات التشغيلية؛ التعديل/الإلغاء بعد التسجيل للمحاسب أو Owner/Admin.
- `accountant`: إنشاء/قراءة/تصحيح/إلغاء مدفوعات مع Audit.
- حذف Payment فعليًا غير مفضل؛ الأفضل reversal/void عند بناء Ledger.

### Audit logs
- Owner/Admin فقط.
- لا Update/Delete لأي Member Role.
- الإدخال يتم من النظام/Server Action باسم Actor الحالي، وليس CRUD UI مباشر.

## 6. Special Actions Matrix

| Action | Owner | Admin | Teacher | Receptionist | Accountant |
|---|---|---|---|---|---|
| Invite teacher/receptionist/accountant | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite admin | ✅ | ✅* | ❌ | ❌ | ❌ |
| Change member role | ✅ | ✅* | ❌ | ❌ | ❌ |
| Disable/reactivate member | ✅ | ✅* | ❌ | ❌ | ❌ |
| Manage another admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage owner | `IAM-006 only` | ❌ | ❌ | ❌ | ❌ |
| Transfer ownership | `IAM-006 only` | ❌ | ❌ | ❌ | ❌ |
| Mark attendance | ✅ | ✅ | ✅* | ✅ | ❌ |
| Correct attendance | ✅ | ✅ | ✅* | ✅* | ❌ |
| Create invoice | ✅ | ✅ | ❌ | ✅ | ✅ |
| Record payment | ✅ | ✅ | ❌ | ✅ | ✅ |
| Correct/void payment | ✅ | ✅ | ❌ | ❌ | ✅ |
| View audit log | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tenant destructive actions | ✅* | ❌ | ❌ | ❌ | ❌ |

`*` = يخضع للقيود المذكورة في القسم 5 ولا يعني صلاحية مطلقة.

## 7. Scope rules الإلزامية

1. **Tenant isolation first:** كل Query/Mutation يجب أن يثبت `tenant_id` قبل فحص الدور.
2. **Teacher scope:** الوصول الأكاديمي للمدرس يعتمد على `course_offerings.teacher_id` (أو `course_teachers`) مقابل هوية المدرس في الجلسة الموثقة، ثم يتفرع منه الطلاب/Enrollments/Cohorts/Sessions/Attendance. **لا** يُستخدم عمود مدرس مباشر على `cohorts`. وفوق ذلك يلزم **Entitlement** الميزة قبل أي فحص دور.
3. **No cross-role escalation:** `admin` لا يستطيع تعديل نفسه إلى Owner أو إدارة Owner، ولا إدارة Admin آخر في العمليات الحساسة.
4. **Self relationships:** Student/Guardian لا يحصلان على صلاحيات Member بمجرد وجود Auth user.
5. **Inactive membership = no member capability:** أي Membership بـ`active=false` تفقد كل صلاحيات Tenant فورًا.
6. **Cross-tenant IDs are always unauthorized:** امتلاك ID صحيح من Tenant آخر لا يمنح أي وصول.
7. **Server-derived actor fields:** `created_by`, `marked_by`, `received_by`, `actor_user_id` لا تؤخذ من Client كقيمة موثوقة؛ تُشتق من Session على الخادم.
8. **Sensitive mutations are audited:** invitations, membership state/role, attendance correction, invoice void, payment correction/void, ownership, tenant status.

## 8. Capability naming contract

سيستخدم DAL/UI لاحقًا أسماء Capabilities ثابتة بدل مقارنة Strings للأدوار داخل المكونات. الصيغة:

`<resource>.<action>`

أمثلة:
- `students.read`
- `students.create`
- `attendance.mark`
- `attendance.correct`
- `invoices.create`
- `payments.record`
- `payments.void`
- `team.invite`
- `team.change_role`
- `team.disable_member`
- `audit.read`
- `tenant.update_settings`

الـCapability لا تستبدل Scope. مثال: امتلاك `attendance.mark` للمدرس لا يعني أنه يستطيع تعليم حضور Session خارج مجموعاته.

**تمييز إلزامي في التسمية:** مفاتيح RBAC هنا (`students.read`, `attendance.mark`…) تخص **الأدوار**، ومفاتيح الـEntitlement في [`PRODUCT_VISION.md`](PRODUCT_VISION.md) §3.1 (`ops.core`, `platform.exams`, `learning.video`…) تخص **المساحة**. لا تُدمج في فضاء تسمية واحد، ولا يُستخدم مفتاح RBAC كقرار تجاري.

**ولا يجوز تقاسم البادئة بين الفضاءين.** قائمة بادئات RBAC محجوزة على مفاتيح الاستحقاق، ويفشل تحميل الكتالوج تلقائيًا عند أي تقاطع (`assertNoRbacNamespaceCollision`). السبب أن `payments.read` (صلاحية) بجوار `payments.online` (استحقاق) يسهّل الخطأ عند إضافة قدرة جديدة. ولذلك سُمّي الـadd-on `ops.online_payments` لا `payments.online`، و`ops.extra_branches` لا `branches.extra`.

## 9. قرارات تنفيذ IAM-005-02

عند تحويل هذه الوثيقة إلى RLS Policies:

- يمنع استخدام Policy عامة من نوع `any active member can update` على Resources متعددة.
- لكل جدول Policies منفصلة على `SELECT / INSERT / UPDATE / DELETE` حسب هذه المصفوفة.
- Helpers داخل `private` يمكن استخدامها لتقليل التكرار، بشرط أن تكون Tenant-scoped ولا تسبب RLS recursion.
- Teacher-scoped helpers يجب أن تتحقق من Assignment الفعلي عبر `course_offerings.teacher_id` / `course_teachers`، لا من عمود على المجموعة. التنفيذ في `src/lib/authorization/resource-scope.ts`.
- **مساران لا مسار واحد للفحص:** القدرة غير المقيّدة تُفرض بـ`requireTenantCapability`، والقدرة المقيّدة (`scoped`) تُفرض بـ`requireTenantCapabilityWithScope` مع فاحص المورد. استخدام المسار الأول على قدرة مقيّدة يُرفض دائمًا برسالة نطاق — وهو السلوك الصحيح، لأنه يمنع تمرير قدرة بلا تحقق مورد. ومن يحتاج السياق قبل تحديد المورد يستخدم `getTenantAuthorizationContext`.
- Finance writes يجب أن تقيد `accountant`/`owner`/`admin`، مع الاستثناء التشغيلي المحدد للـReceptionist.
- اختبارات `IAM-005-05` يجب أن تغطي كل Role × Resource × Action، بما فيها Negative tests وCross-tenant tests.

## 10. Out of scope لهذه المصفوفة

- Platform Admin control-plane permissions.
- LMS roles/entitlements.
- Student/Guardian claim flow التفصيلي (`IAM-005-06`).
- Ownership transfer (`IAM-006`).
- Device/session management (`IAM-007`).
- Branch-level staff scoping؛ يمكن إضافته لاحقًا كطبقة Scope فوق RBAC إذا احتاج المنتج ذلك.

---

**Status:** `IAM-005-01` complete when this document is committed and the technical pointer moves to `IAM-005-02`.
