import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import pg from "pg";

import { hashPassword } from "../../src/lib/auth/password-rules.mjs";
import { seedCapabilityCatalog } from "./seed-capability-catalog.mjs";

const { Client } = pg;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export class CanonicalSeedError extends Error {}

/**
 * معرّف ثابت مشتق من مفتاح نصي (يشبه UUIDv5) ليكون الـSeed idempotent
 * وقابلًا لإعادة التشغيل مع نفس النتائج وreconciliation ثابت.
 *
 * @param {string} key
 * @returns {string}
 */
export function deterministicId(key) {
  const hash = createHash("sha1").update(`saboraty:${key}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Saboraty.Demo.2026";

/**
 * بيانات العرض الكانونية لنموذجي `teacher` و`center`.
 *
 * كل المعرّفات مشتقة من مفاتيح نصية ثابتة، وكل الكتابات `on conflict do nothing`،
 * فيمكن تشغيل السكربت أكثر من مرة بنفس النتيجة.
 *
 * @param {import("pg").Client} client
 * @param {string} passwordDigest
 */
async function seedDemo(client, passwordDigest) {
  const accounts = [];

  /** @param {{email: string, name: string, platformAdmin?: boolean}} input */
  async function upsertUser({ email, name, platformAdmin = false }) {
    const userId = deterministicId(`user:${email}`);
    await client.query(
      `insert into public.app_users (id, email, display_name) values ($1, $2, $3)
       on conflict (id) do update set display_name = excluded.display_name`,
      [userId, email, name],
    );
    await client.query(
      `insert into public.auth_password_credentials (user_id, password_digest) values ($1, $2)
       on conflict (user_id) do update set password_digest = excluded.password_digest, password_changed_at = now()`,
      [userId, passwordDigest],
    );
    if (platformAdmin) {
      await client.query(
        `insert into public.platform_admins (user_id) values ($1) on conflict (user_id) do nothing`,
        [userId],
      );
    }
    accounts.push({ email, userId, platformAdmin });
    return userId;
  }

  /**
   * @param {object} input
   * @param {string} input.key
   * @param {string} input.name
   * @param {string} input.slug
   * @param {"teacher"|"center"} input.tenantType
   * @param {"operations"|"management_platform"|"learning_platform"} input.productLevel
   * @param {string} input.ownerId
   * @param {string} input.currency
   * @param {{publicName: string, tagline: string, primaryColor: string}} input.branding
   */
  async function upsertTenant({ key, name, slug, tenantType, productLevel, ownerId, currency, branding }) {
    const tenantId = deterministicId(`tenant:${key}`);
    await client.query(
      `insert into public.tenants (id, name, slug, tenant_type, product_level, currency, timezone, locale, status, created_by)
       values ($1, $2, $3, $4, $5, $6, 'Africa/Cairo', 'ar', 'active', $7)
       on conflict (id) do update set
         name = excluded.name,
         tenant_type = excluded.tenant_type,
         product_level = excluded.product_level,
         currency = excluded.currency`,
      [tenantId, name, slug, tenantType, productLevel, currency, ownerId],
    );
    await client.query(
      `insert into public.tenant_branding (tenant_id, public_name, tagline, primary_color)
       values ($1, $2, $3, $4)
       on conflict (tenant_id) do update set
         public_name = excluded.public_name,
         tagline = excluded.tagline,
         primary_color = excluded.primary_color`,
      [tenantId, branding.publicName, branding.tagline, branding.primaryColor],
    );
    await client.query(
      `insert into public.memberships (tenant_id, user_id, role, active)
       values ($1, $2, 'owner', true)
       on conflict (tenant_id, user_id) do update set role = 'owner', active = true`,
      [tenantId, ownerId],
    );
    // منح قدرات المستوى — نفس الاشتقاق المستخدم في التطبيق عند الموافقة على طلب مساحة.
    await client.query(
      `insert into public.tenant_entitlements (tenant_id, capability_key, state, source, source_ref)
       select $1, c.key, 'active', 'plan', null
       from public.capability_catalog c
       where c.kind = 'feature'
         and c.included_from_level is not null
         and $2::public.product_level >= c.included_from_level
       on conflict (tenant_id, capability_key) do nothing`,
      [tenantId, productLevel],
    );
    return tenantId;
  }

  const insert = async (sql, values) => {
    await client.query(sql, values);
  };

  // ---------------------------------------------------------------- Platform Admin
  await upsertUser({ email: "platform.admin@saboraty.test", name: "مشرف المنصة", platformAdmin: true });

  // ---------------------------------------------------------------- نموذج المدرس المستقل
  const teacherOwner = await upsertUser({ email: "teacher.owner@saboraty.test", name: "أ. أحمد المصري" });
  const teacherTenant = await upsertTenant({
    key: "demo-teacher",
    name: "أ. أحمد المصري",
    slug: "demo-teacher",
    tenantType: "teacher",
    productLevel: "learning_platform",
    ownerId: teacherOwner,
    currency: "EGP",
    branding: {
      publicName: "أكاديمية أ. أحمد",
      tagline: "رياضيات الثانوية العامة",
      primaryColor: "#6547d9",
    },
  });

  const tStage = deterministicId("stage:teacher:secondary");
  await insert(
    `insert into public.stages (id, tenant_id, name, order_index) values ($1, $2, 'الثانوية', 1)
     on conflict (id) do nothing`,
    [tStage, teacherTenant],
  );
  const tGrade = deterministicId("grade:teacher:g10");
  await insert(
    `insert into public.grades (id, tenant_id, stage_id, name, order_index) values ($1, $2, $3, 'الصف العاشر', 1)
     on conflict (id) do nothing`,
    [tGrade, teacherTenant, tStage],
  );
  const tSubject = deterministicId("subject:teacher:math");
  await insert(
    `insert into public.subjects (id, tenant_id, name) values ($1, $2, 'الرياضيات')
     on conflict (id) do nothing`,
    [tSubject, teacherTenant],
  );
  const tTeacher = deterministicId("teacher-record:teacher:ahmed");
  await insert(
    `insert into public.teachers (id, tenant_id, membership_user_id, display_name, phone)
     values ($1, $2, $3, 'أ. أحمد المصري', '+201001111111')
     on conflict (id) do nothing`,
    [tTeacher, teacherTenant, teacherOwner],
  );

  for (const [index, title] of ["الجبر", "الهندسة", "حساب المثلثات"].entries()) {
    const courseId = deterministicId(`course:teacher:${title}`);
    await insert(
      `insert into public.courses (id, tenant_id, subject_id, grade_id, title) values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [courseId, teacherTenant, tSubject, tGrade, title],
    );
    await insert(
      `insert into public.course_teachers (tenant_id, course_id, teacher_id) values ($1, $2, $3)
       on conflict do nothing`,
      [teacherTenant, courseId, tTeacher],
    );
    await insert(
      `insert into public.course_offerings
         (id, tenant_id, course_id, teacher_id, mode, capacity, price_amount, currency)
       values ($1, $2, $3, $4, 'online', 30, $5, 'EGP')
       on conflict (id) do nothing`,
      [deterministicId(`offering:teacher:${title}`), teacherTenant, courseId, tTeacher, `${450 + index * 50}.00`],
    );
  }

  // ---------------------------------------------------------------- نموذج السنتر التعليمي
  const centerOwner = await upsertUser({ email: "center.owner@saboraty.test", name: "م. هالة عبد الرحمن" });
  const centerTenant = await upsertTenant({
    key: "demo-center",
    name: "سنتر التفوق",
    slug: "demo-center",
    tenantType: "center",
    productLevel: "management_platform",
    ownerId: centerOwner,
    currency: "EGP",
    branding: {
      publicName: "سنتر التفوق التعليمي",
      tagline: "إعدادي وثانوي — فرعان",
      primaryColor: "#46309f",
    },
  });

  const branches = [
    { key: "main", name: "الفرع الرئيسي", address: "المعادي، القاهرة", phone: "+20220000001" },
    { key: "maadi", name: "فرع المعادي الجديدة", address: "المعادي، القاهرة", phone: "+20220000002" },
  ];
  /** @type {Record<string, string>} */
  const branchIds = {};
  for (const branch of branches) {
    branchIds[branch.key] = deterministicId(`branch:center:${branch.key}`);
    await insert(
      `insert into public.branches (id, tenant_id, name, address, phone) values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [branchIds[branch.key], centerTenant, branch.name, branch.address, branch.phone],
    );
  }

  const rooms = [
    { key: "main-1", branch: "main", name: "قاعة 1", capacity: 25 },
    { key: "main-2", branch: "main", name: "قاعة 2", capacity: 20 },
    { key: "maadi-a", branch: "maadi", name: "قاعة A", capacity: 18 },
  ];
  /** @type {Record<string, string>} */
  const roomIds = {};
  for (const room of rooms) {
    roomIds[room.key] = deterministicId(`room:center:${room.key}`);
    await insert(
      `insert into public.rooms (id, tenant_id, branch_id, name, capacity) values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [roomIds[room.key], centerTenant, branchIds[room.branch], room.name, room.capacity],
    );
  }

  const stages = [
    { key: "prep", name: "الإعدادية", order: 1 },
    { key: "secondary", name: "الثانوية", order: 2 },
  ];
  /** @type {Record<string, string>} */
  const stageIds = {};
  for (const stage of stages) {
    stageIds[stage.key] = deterministicId(`stage:center:${stage.key}`);
    await insert(
      `insert into public.stages (id, tenant_id, name, order_index) values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [stageIds[stage.key], centerTenant, stage.name, stage.order],
    );
  }

  const grades = [
    { key: "prep-3", stage: "prep", name: "الصف الثالث الإعدادي", order: 1 },
    { key: "sec-1", stage: "secondary", name: "الصف الأول الثانوي", order: 2 },
    { key: "sec-2", stage: "secondary", name: "الصف الثاني الثانوي", order: 3 },
  ];
  /** @type {Record<string, string>} */
  const gradeIds = {};
  for (const grade of grades) {
    gradeIds[grade.key] = deterministicId(`grade:center:${grade.key}`);
    await insert(
      `insert into public.grades (id, tenant_id, stage_id, name, order_index) values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [gradeIds[grade.key], centerTenant, stageIds[grade.stage], grade.name, grade.order],
    );
  }

  const subjects = [
    { key: "math", name: "الرياضيات" },
    { key: "physics", name: "الفيزياء" },
    { key: "chemistry", name: "الكيمياء" },
  ];
  /** @type {Record<string, string>} */
  const subjectIds = {};
  for (const subject of subjects) {
    subjectIds[subject.key] = deterministicId(`subject:center:${subject.key}`);
    await insert(
      `insert into public.subjects (id, tenant_id, name) values ($1, $2, $3) on conflict (id) do nothing`,
      [subjectIds[subject.key], centerTenant, subject.name],
    );
  }

  const teachers = [
    { key: "ahmed", name: "أ. أحمد المصري", membership: centerOwner, phone: "+201001111111" },
    { key: "mona", name: "أ. منى سليم", membership: null, phone: "+201002222222" },
    { key: "khaled", name: "أ. خالد فؤاد", membership: null, phone: "+201003333333" },
  ];
  /** @type {Record<string, string>} */
  const teacherIds = {};
  for (const teacher of teachers) {
    teacherIds[teacher.key] = deterministicId(`teacher-record:center:${teacher.key}`);
    await insert(
      `insert into public.teachers (id, tenant_id, membership_user_id, display_name, phone)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [teacherIds[teacher.key], centerTenant, teacher.membership, teacher.name, teacher.phone],
    );
  }

  // المادة الواحدة يدرّسها أكثر من مدرس: الجبر لمدرسين، وباقي المقررات لمدرس واحد.
  const courses = [
    { key: "sec1-algebra", grade: "sec-1", subject: "math", title: "الجبر", teachers: ["ahmed", "mona"] },
    { key: "sec1-geometry", grade: "sec-1", subject: "math", title: "الهندسة", teachers: ["mona"] },
    { key: "sec1-mechanics", grade: "sec-1", subject: "physics", title: "الميكانيكا", teachers: ["khaled"] },
    { key: "sec2-chemistry", grade: "sec-2", subject: "chemistry", title: "الكيمياء العضوية", teachers: ["khaled"] },
    { key: "prep3-algebra", grade: "prep-3", subject: "math", title: "الجبر الأساسي", teachers: ["ahmed"] },
  ];
  /** @type {Record<string, string>} */
  const courseIds = {};
  for (const course of courses) {
    courseIds[course.key] = deterministicId(`course:center:${course.key}`);
    await insert(
      `insert into public.courses (id, tenant_id, subject_id, grade_id, title) values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [courseIds[course.key], centerTenant, subjectIds[course.subject], gradeIds[course.grade], course.title],
    );
    for (const teacherKey of course.teachers) {
      await insert(
        `insert into public.course_teachers (tenant_id, course_id, teacher_id) values ($1, $2, $3)
         on conflict do nothing`,
        [centerTenant, courseIds[course.key], teacherIds[teacherKey]],
      );
    }
  }

  const offerings = [
    { key: "sec1-algebra-ahmed-main", course: "sec1-algebra", teacher: "ahmed", branch: "main", room: "main-1", mode: "onsite", capacity: 25, price: "500.00" },
    { key: "sec1-algebra-mona-maadi", course: "sec1-algebra", teacher: "mona", branch: "maadi", room: "maadi-a", mode: "onsite", capacity: 18, price: "550.00" },
    { key: "sec1-geometry-mona-main", course: "sec1-geometry", teacher: "mona", branch: "main", room: "main-2", mode: "onsite", capacity: 20, price: "500.00" },
    { key: "sec1-mechanics-khaled-main", course: "sec1-mechanics", teacher: "khaled", branch: "main", room: "main-2", mode: "hybrid", capacity: 20, price: "600.00" },
    { key: "sec2-chemistry-khaled-online", course: "sec2-chemistry", teacher: "khaled", branch: null, room: null, mode: "online", capacity: 40, price: "700.00" },
    { key: "prep3-algebra-ahmed-main", course: "prep3-algebra", teacher: "ahmed", branch: "main", room: "main-1", mode: "onsite", capacity: 25, price: "400.00" },
  ];
  /** @type {Record<string, string>} */
  const offeringIds = {};
  for (const offering of offerings) {
    offeringIds[offering.key] = deterministicId(`offering:center:${offering.key}`);
    await insert(
      `insert into public.course_offerings
         (id, tenant_id, course_id, teacher_id, branch_id, room_id, mode, capacity, price_amount, currency)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'EGP')
       on conflict (id) do nothing`,
      [
        offeringIds[offering.key],
        centerTenant,
        courseIds[offering.course],
        teacherIds[offering.teacher],
        offering.branch ? branchIds[offering.branch] : null,
        offering.room ? roomIds[offering.room] : null,
        offering.mode,
        offering.capacity,
        offering.price,
      ],
    );
  }

  const cohortIds = {};
  for (const offering of offerings) {
    const cohortKey = `${offering.key}-cohort-a`;
    cohortIds[cohortKey] = deterministicId(`cohort:center:${cohortKey}`);
    await insert(
      `insert into public.cohorts (id, tenant_id, course_offering_id, branch_id, room_id, name, capacity)
       values ($1, $2, $3, $4, $5, 'مجموعة أ', $6)
       on conflict (id) do nothing`,
      [
        cohortIds[cohortKey],
        centerTenant,
        offeringIds[offering.key],
        offering.branch ? branchIds[offering.branch] : null,
        offering.room ? roomIds[offering.room] : null,
        offering.capacity,
      ],
    );
  }

  const students = [
    { key: "s1", name: "يوسف إبراهيم", grade: "sec-1", branch: "main" },
    { key: "s2", name: "ملك حسام", grade: "sec-1", branch: "main" },
    { key: "s3", name: "عمر شريف", grade: "sec-1", branch: "maadi" },
    { key: "s4", name: "جنّى طارق", grade: "sec-1", branch: "maadi" },
    { key: "s5", name: "آدم مصطفى", grade: "sec-2", branch: "main" },
    { key: "s6", name: "روان عادل", grade: "prep-3", branch: "main" },
    { key: "s7", name: "زياد أشرف", grade: "prep-3", branch: "main" },
    { key: "s8", name: "حلا ناجي", grade: "sec-2", branch: "main" },
  ];
  /** @type {Record<string, string>} */
  const studentIds = {};
  for (const [index, student] of students.entries()) {
    studentIds[student.key] = deterministicId(`student:center:${student.key}`);
    await insert(
      `insert into public.students (id, tenant_id, branch_id, grade_id, code, full_name)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing`,
      [
        studentIds[student.key],
        centerTenant,
        branchIds[student.branch],
        gradeIds[student.grade],
        `E-${String(index + 1).padStart(4, "0")}`,
        student.name,
      ],
    );
  }

  const guardians = [
    { key: "g1", name: "إبراهيم سعد", phone: "+201100000001", children: ["s1"] },
    { key: "g2", name: "حسام الدين محمود", phone: "+201100000002", children: ["s2"] },
    { key: "g3", name: "شريف عبد الله", phone: "+201100000003", children: ["s3", "s4"] },
    { key: "g4", name: "عادل رشدي", phone: "+201100000004", children: ["s5", "s8"] },
    { key: "g5", name: "مصطفى كامل", phone: "+201100000005", children: ["s6", "s7"] },
  ];
  for (const guardian of guardians) {
    const guardianId = deterministicId(`guardian:center:${guardian.key}`);
    await insert(
      `insert into public.guardians (id, tenant_id, full_name, phone) values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [guardianId, centerTenant, guardian.name, guardian.phone],
    );
    for (const [index, childKey] of guardian.children.entries()) {
      await insert(
        `insert into public.student_guardians (tenant_id, student_id, guardian_id, relationship)
         values ($1, $2, $3, $4)
         on conflict do nothing`,
        [centerTenant, studentIds[childKey], guardianId, index === 0 ? "father" : "guardian"],
      );
    }
  }

  // التسجيل على العرض + عضوية المجموعة: كل طالب مسجَّل في عرض مطابق لصفه.
  const enrollmentsByGrade = {
    "sec-1": ["sec1-algebra-ahmed-main", "sec1-geometry-mona-main"],
    "sec-2": ["sec2-chemistry-khaled-online"],
    "prep-3": ["prep3-algebra-ahmed-main"],
  };
  for (const student of students) {
    for (const offeringKey of enrollmentsByGrade[student.grade] ?? []) {
      await insert(
        `insert into public.enrollments (tenant_id, course_offering_id, student_id) values ($1, $2, $3)
         on conflict do nothing`,
        [centerTenant, offeringIds[offeringKey], studentIds[student.key]],
      );
      const cohortKey = `${offeringKey}-cohort-a`;
      await insert(
        `insert into public.cohort_members (tenant_id, cohort_id, student_id) values ($1, $2, $3)
         on conflict do nothing`,
        [centerTenant, cohortIds[cohortKey], studentIds[student.key]],
      );
    }
  }

  // حصص وحضور لآخر أسبوعين + فواتير ومدفوعات لمجموعتين
  const sessions = [];
  for (let week = 0; week < 2; week += 1) {
    for (const offeringKey of ["sec1-algebra-ahmed-main", "sec1-geometry-mona-main", "prep3-algebra-ahmed-main"]) {
      const cohortKey = `${offeringKey}-cohort-a`;
      const sessionKey = `${cohortKey}-w${week}`;
      const sessionId = deterministicId(`session:center:${sessionKey}`);
      await insert(
        `insert into public.class_sessions (id, tenant_id, cohort_id, starts_at, ends_at, created_by, notes)
         values ($1, $2, $3, now() + ($4 || ' days')::interval, now() + ($4 || ' days')::interval + interval '90 minutes', $5, $6)
         on conflict (id) do nothing`,
        [sessionId, centerTenant, cohortIds[cohortKey], String(week * 7 + 1), centerOwner, "حصة أسبوعية"],
      );
      sessions.push({ id: sessionId, cohortId: cohortIds[cohortKey] });
    }
  }

  // حضور كل أعضاء المجموعة في كل حصة تابعة لها
  for (const session of sessions) {
    const members = await client.query(
      `select student_id from public.cohort_members where tenant_id = $1 and cohort_id = $2 order by student_id`,
      [centerTenant, session.cohortId],
    );
    for (const [index, member] of members.rows.entries()) {
      await insert(
        `insert into public.attendance (tenant_id, session_id, student_id, status, marked_by)
         values ($1, $2, $3, $4, $5)
         on conflict do nothing`,
        [centerTenant, session.id, member.student_id, index % 5 === 0 ? "late" : "present", centerOwner],
      );
    }
  }

  // حسابات البوابات: طالب وولي أمر مرتبطان بعلاقة محمية داخل نفس المساحة.
  const demoStudentUser = await upsertUser({ email: "student.demo@saboraty.test", name: "يوسف إبراهيم" });
  await insert(
    `update public.students set user_id = $1 where id = $2 and tenant_id = $3`,
    [demoStudentUser, studentIds.s1, centerTenant],
  );
  const demoGuardianUser = await upsertUser({ email: "parent.demo@saboraty.test", name: "شريف عبد الله" });
  await insert(
    `update public.guardians set user_id = $1 where id = $2 and tenant_id = $3`,
    [demoGuardianUser, deterministicId("guardian:center:g3"), centerTenant],
  );

  for (const student of students) {
    const invoiceId = deterministicId(`invoice:center:${student.key}`);
    await insert(
      `insert into public.invoices (id, tenant_id, student_id, title, amount, due_date, status)
       values ($1, $2, $3, 'رسوم شهر أكتوبر', 500.00, current_date + 10, 'due')
       on conflict (id) do nothing`,
      [invoiceId, centerTenant, studentIds[student.key]],
    );
  }
  for (const student of students.slice(0, 4)) {
    const paymentId = deterministicId(`payment:center:${student.key}`);
    const invoiceId = deterministicId(`invoice:center:${student.key}`);
    await insert(
      `insert into public.payments (id, tenant_id, invoice_id, amount, method, reference, received_by)
       values ($1, $2, $3, 250.00, 'cash', 'RCPT-DEMO', $4)
       on conflict (id) do nothing`,
      [paymentId, centerTenant, invoiceId, centerOwner],
    );
    await client.query(`update public.invoices set status = 'partial' where id = $1 and status = 'due'`, [invoiceId]);
  }

  await insert(
    `insert into public.platform_audit_logs (actor_user_id, action, entity_type, entity_id, details)
     select $1, 'canonical_seed.applied', 'platform', null, $2::jsonb
     where not exists (
       select 1 from public.platform_audit_logs
       where action = 'canonical_seed.applied' and entity_type = 'platform' and entity_id is null
     )`,
    [accounts[0]?.userId ?? null, JSON.stringify({ teacherTenant, centerTenant })],
  );

  return { teacherTenant, centerTenant, accounts };
}

/**
 * @param {string} targetUrl
 */
export async function seedCanonicalDemo(targetUrl) {
  const client = new Client({ connectionString: targetUrl });
  await client.connect();
  try {
    const passwordDigest = await hashPassword(DEMO_PASSWORD);
    await client.query("begin");
    const result = await seedDemo(client, passwordDigest);

    const counts = await client.query(
      `select
         (select count(*)::int from public.app_users) as users,
         (select count(*)::int from public.platform_admins) as platform_admins,
         (select count(*)::int from public.tenants where tenant_type = 'teacher') as teacher_tenants,
         (select count(*)::int from public.tenants where tenant_type = 'center') as center_tenants,
         (select count(*)::int from public.tenant_entitlements) as entitlements,
         (select count(*)::int from public.branches) as branches,
         (select count(*)::int from public.rooms) as rooms,
         (select count(*)::int from public.stages) as stages,
         (select count(*)::int from public.grades) as grades,
         (select count(*)::int from public.subjects) as subjects,
         (select count(*)::int from public.teachers) as teachers,
         (select count(*)::int from public.courses) as courses,
         (select count(*)::int from public.course_teachers) as course_teacher_links,
         (select count(*)::int from public.course_offerings) as offerings,
         (select count(*)::int from public.cohorts) as cohorts,
         (select count(*)::int from public.students) as students,
         (select count(*)::int from public.guardians) as guardians,
         (select count(*)::int from public.student_guardians) as student_guardian_links,
         (select count(*)::int from public.enrollments) as enrollments,
         (select count(*)::int from public.cohort_members) as cohort_members,
         (select count(*)::int from public.class_sessions) as sessions,
         (select count(*)::int from public.attendance) as attendance_rows,
         (select count(*)::int from public.invoices) as invoices,
         (select count(*)::int from public.payments) as payments`,
    );

    // اتساق التسليم مع التسجيل: كل عضو مجموعة له تسجيل نشط على نفس العرض القابل للبيع.
    const consistency = await client.query(
      `select
         (select count(*)::int from public.cohort_members cm
            join public.cohorts c on c.tenant_id = cm.tenant_id and c.id = cm.cohort_id
           where not exists (
             select 1 from public.enrollments e
             where e.tenant_id = cm.tenant_id
               and e.student_id = cm.student_id
               and e.course_offering_id = c.course_offering_id
           )) as members_without_matching_enrollment,
         (select count(*)::int from public.students where grade_id is null) as students_without_grade,
         (select count(*)::int from public.course_offerings o
           where not exists (
             select 1 from public.course_teachers ct
             where ct.tenant_id = o.tenant_id and ct.course_id = o.course_id and ct.teacher_id = o.teacher_id
           )) as offerings_without_assigned_teacher`,
    );

    await client.query("commit");
    return { ...result, counts: counts.rows[0], consistency: consistency.rows[0] };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) throw new CanonicalSeedError("DATABASE_URL is not set.");
  const hostname = new URL(targetUrl).hostname;
  if (!LOOPBACK_HOSTS.has(hostname) && !process.argv.includes("--allow-remote")) {
    throw new CanonicalSeedError(
      `DATABASE_URL host "${hostname}" is not loopback. Re-run with --allow-remote when this is the intended environment.`,
    );
  }

  await seedCapabilityCatalog(targetUrl);
  const { counts, consistency, accounts } = await seedCanonicalDemo(targetUrl);

  if (consistency.members_without_matching_enrollment !== 0) {
    throw new CanonicalSeedError(
      `canonical seed inconsistency: ${consistency.members_without_matching_enrollment} cohort members without a matching enrollment`,
    );
  }
  if (consistency.students_without_grade !== 0) {
    throw new CanonicalSeedError(
      `canonical seed inconsistency: ${consistency.students_without_grade} students without a grade`,
    );
  }
  if (consistency.offerings_without_assigned_teacher !== 0) {
    throw new CanonicalSeedError(
      `canonical seed inconsistency: ${consistency.offerings_without_assigned_teacher} offerings without an assigned teacher`,
    );
  }

  console.log("Canonical demo seeded.");
  console.log(JSON.stringify(counts, null, 2));
  console.log("Demo accounts (development only):");
  for (const account of accounts) {
    console.log(`  ${account.platformAdmin ? "[platform admin] " : ""}${account.email}  →  ${DEMO_PASSWORD}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
