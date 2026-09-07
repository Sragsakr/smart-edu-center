import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getStudentPortalData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id,tenant_id,code,full_name,grade,phone,joined_on")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (studentError) throw new Error("تعذر تحميل بيانات الطالب");
  if (!student) return null;

  const [{ data: enrollments }, { data: attendance }, { data: invoices }] = await Promise.all([
    supabase.from("enrollments").select("cohort_id,enrolled_on,active").eq("student_id", student.id).eq("active", true),
    supabase.from("attendance").select("session_id,status,marked_at").eq("student_id", student.id).order("marked_at", { ascending: false }).limit(12),
    supabase.from("invoices").select("id,title,amount,due_date,status,created_at").eq("student_id", student.id).order("created_at", { ascending: false }),
  ]);

  const cohortIds = (enrollments ?? []).map((row) => row.cohort_id);
  const invoiceIds = (invoices ?? []).map((row) => row.id);

  const [{ data: cohorts }, { data: sessions }, { data: payments }] = await Promise.all([
    cohortIds.length ? supabase.from("cohorts").select("id,name,subject").in("id", cohortIds) : Promise.resolve({ data: [] }),
    cohortIds.length ? supabase.from("class_sessions").select("id,cohort_id,starts_at,ends_at,notes").in("cohort_id", cohortIds).order("starts_at", { ascending: true }).limit(12) : Promise.resolve({ data: [] }),
    invoiceIds.length ? supabase.from("payments").select("invoice_id,amount,method,paid_at").in("invoice_id", invoiceIds).order("paid_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  return { student, enrollments: enrollments ?? [], cohorts: cohorts ?? [], sessions: sessions ?? [], attendance: attendance ?? [], invoices: invoices ?? [], payments: payments ?? [] };
}

export async function getParentPortalData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: guardian, error } = await supabase
    .from("guardians")
    .select("id,tenant_id,full_name,phone,email")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("تعذر تحميل حساب ولي الأمر");
  if (!guardian) return null;

  const { data: links } = await supabase.from("student_guardians").select("student_id,relationship").eq("guardian_id", guardian.id);
  const studentIds = (links ?? []).map((row) => row.student_id);
  if (!studentIds.length) return { guardian, children: [], links: [], attendance: [], invoices: [], enrollments: [], sessions: [] };

  const [{ data: children }, { data: attendance }, { data: invoices }, { data: enrollments }] = await Promise.all([
    supabase.from("students").select("id,code,full_name,grade,phone,active").in("id", studentIds),
    supabase.from("attendance").select("student_id,session_id,status,marked_at").in("student_id", studentIds).order("marked_at", { ascending: false }).limit(20),
    supabase.from("invoices").select("id,student_id,title,amount,due_date,status").in("student_id", studentIds).order("due_date", { ascending: true }),
    supabase.from("enrollments").select("student_id,cohort_id,active").in("student_id", studentIds).eq("active", true),
  ]);

  const cohortIds = [...new Set((enrollments ?? []).map((row) => row.cohort_id))];
  const { data: sessions } = cohortIds.length
    ? await supabase.from("class_sessions").select("id,cohort_id,starts_at,ends_at,notes").in("cohort_id", cohortIds).order("starts_at", { ascending: true }).limit(20)
    : { data: [] };

  return { guardian, children: children ?? [], links: links ?? [], attendance: attendance ?? [], invoices: invoices ?? [], enrollments: enrollments ?? [], sessions: sessions ?? [] };
}
