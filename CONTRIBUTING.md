# المساهمة في Smart Edu Center

## اختيار العمل

- نفّذ فقط `CURRENT_TASK` من `docs/MASTER_EXECUTION_PLAN.md`، وهو مصدر ترتيب العمل الوحيد.
- لا تتجاوز اعتماديات غير مكتملة ولا تنشئ Backlog موازية.
- حدّث README وAGENTS وخطة التنفيذ والمراجع التخصصية المتأثرة عندما يتغير السلوك أو البنية أو التشغيل.

## الفروع

لا تعمل مباشرة على `main`. أنشئ فرعًا قصير العمر بالصيغة:

```text
<type>/<task-id>-<short-kebab-description>
```

الأنواع المسموحة:

- `feat`: ميزة جديدة.
- `fix`: إصلاح خلل.
- `chore`: إعداد أو حوكمة أو صيانة.
- `docs`: توثيق فقط.
- `ci`: CI/CD وفحوص آلية.
- `db`: migrations وRLS.
- `test`: اختبارات فقط.

أمثلة:

```text
feat/iam-003-password-reset
fix/std-001-student-code-collision
ci/fnd-008-security-scanning
db/ops-001-tenant-settings
```

يجب أن يكون الاسم lowercase، وأن يبدأ بمعرّف التاسك متى وُجد، وألا يحتوي اسم شخص أو تاريخًا أو كلمات عامة مثل `updates`.

## الرسائل

استخدم Conventional Commits:

```text
<type>(optional-scope): imperative summary
```

أمثلة:

```text
feat(auth): add password reset request
fix(students): prevent duplicate tenant codes
ci: scan client bundles for secrets
docs: document environment promotion flow
```

استخدم `!` و`BREAKING CHANGE:` فقط عند وجود كسر متعمد وموثق مع خطة ترقية. اجعل كل Commit وحدة مترابطة، ولا تجمع تغييرات غير مرتبطة.

## Pull Requests

1. افتح PR إلى `main` باستخدام القالب.
2. انتظر نجاح GitHub Actions وبيئة الـPreview/Staging المعتمدة في `docs/MASTER_EXECUTION_PLAN.md`.
3. راجع المسارات المتأثرة وحالات الخطأ والصلاحيات وRTL حسب نوع التغيير.
4. لا تطبق migration على Production قبل نجاحها على Preview.
5. ادمج بعد اكتمال القبول، ثم تحقق من Production وسجّل النتيجة في خطة التنفيذ.

## بوابة الجودة

```bash
npm ci
npm run check
```

لا تُرفع أسرار أو ملفات `.env.local` أو بيانات مستخدمين حقيقية. migrations المطبقة immutable؛ أضف migration جديدة forward-only بدل تعديل ملف قائم.
