"use client";

import {
  Building2,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  Clock3,
  FileJson2,
  Filter,
  GraduationCap,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AuditRow, AuditTenant } from "@/lib/platform-admin-data";

const actionLabels: Record<string, string> = {
  "workspace_request.approved": "اعتماد طلب مساحة عمل",
  "workspace_request.rejected": "رفض طلب مساحة عمل",
  "password_reset.approved": "اعتماد استعادة كلمة المرور",
  "password_reset.rejected": "رفض استعادة كلمة المرور",
  "tenant.activated": "إعادة تفعيل مساحة العمل",
  "tenant.suspended": "تعليق مساحة العمل",
};

const detailLabels: Record<string, string> = {
  tenant_id: "معرّف مساحة العمل",
  applicant_user_id: "معرّف صاحب الطلب",
  reason: "السبب",
  from: "الحالة السابقة",
  to: "الحالة الجديدة",
};

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Cairo",
});

function accountTypeLabel(accountType: string | null) {
  if (accountType === "center") return "سنتر تعليمي";
  if (accountType === "independent_teacher") return "مدرس مستقل";
  return "المنصة";
}

function TenantIcon({ tenant }: { tenant: AuditTenant }) {
  if (tenant.accountType === "center") return <Building2 aria-hidden="true" />;
  if (tenant.accountType === "independent_teacher") return <GraduationCap aria-hidden="true" />;
  return <ShieldCheck aria-hidden="true" />;
}

function eventMatchesDate(entry: AuditRow, range: string) {
  if (range === "all") return true;
  const age = Date.now() - new Date(entry.created_at).getTime();
  const day = 24 * 60 * 60 * 1000;
  return age <= day * Number(range);
}

function readableDetail(detail: unknown) {
  if (detail === null) return "—";
  if (typeof detail === "string" || typeof detail === "number" || typeof detail === "boolean") {
    return String(detail);
  }
  return JSON.stringify(detail, null, 2);
}

function EventDetails({ entry }: { entry: AuditRow }) {
  return (
    <details className="group mt-4 rounded-2xl border border-[#e8e5f1] bg-[#faf9fc]">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#6547d9]">
        عرض تفاصيل الحدث كاملة
        <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-[#e8e5f1] p-4">
        <dl className="grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-3">
          <Detail label="الإجراء التقني" value={entry.action} ltr />
          <Detail label="نوع الكيان" value={entry.entity_type} ltr />
          <Detail label="معرّف الكيان" value={entry.entity_id ?? "—"} ltr />
          <Detail label="منفّذ العملية" value={entry.actorEmail ?? "غير معروف"} ltr />
          <Detail label="معرّف المنفّذ" value={entry.actor_user_id ?? "—"} ltr />
          <Detail label="وقت الحدث" value={dateFormatter.format(new Date(entry.created_at))} />
        </dl>

        <h4 className="mt-5 flex items-center gap-2 text-sm font-extrabold">
          <FileJson2 className="size-4 text-[#6547d9]" aria-hidden="true" /> بيانات الحدث
        </h4>
        {Object.keys(entry.details).length === 0 ? (
          <p className="mt-3 text-xs text-[#6f6a80]">لم تُسجل بيانات إضافية لهذا الحدث.</p>
        ) : (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(entry.details).map(([key, detail]) => (
              <Detail key={key} label={detailLabels[key] ?? key} value={readableDetail(detail)} ltr />
            ))}
          </dl>
        )}

        <details className="mt-4">
          <summary className="focus-ring w-fit cursor-pointer rounded-lg text-xs font-bold text-[#6f6a80]">
            عرض JSON الخام
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-[#211d35] p-4 text-left text-[11px] leading-5 text-white" dir="ltr">
            {JSON.stringify(entry, null, 2)}
          </pre>
        </details>
      </div>
    </details>
  );
}

function Detail({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-3">
      <dt className="text-[#6f6a80]">{label}</dt>
      <dd className="mt-1 break-words font-bold text-[#29263d]" dir={ltr ? "ltr" : undefined}>{value}</dd>
    </div>
  );
}

function AuditEvent({ entry }: { entry: AuditRow }) {
  return (
    <article className="border-t border-[#efedf3] px-4 py-5 first:border-0 md:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-extrabold">{actionLabels[entry.action] ?? entry.action}</h3>
            <span className="rounded-full bg-[#eeeaff] px-2.5 py-1 text-[10px] font-bold text-[#6042d3]">
              {entry.entity_type}
            </span>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6f6a80]">
            <span className="flex items-center gap-1.5">
              <CircleUserRound className="size-4" aria-hidden="true" /> {entry.actorEmail ?? "مستخدم غير معروف"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-4" aria-hidden="true" /> {dateFormatter.format(new Date(entry.created_at))}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-[#f6f5fb] px-3 py-2 text-xs font-bold text-[#6f6a80]">
          حدث #{entry.id}
        </span>
      </div>
      <EventDetails entry={entry} />
    </article>
  );
}

function TenantGroup({ tenant, entries }: { tenant: AuditTenant; entries: AuditRow[] }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-5 md:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]">
            <TenantIcon tenant={tenant} />
          </span>
          <div>
            <h2 className="font-extrabold">{tenant.name}</h2>
            <p className="mt-1 text-xs text-[#6f6a80]">
              {accountTypeLabel(tenant.accountType)}
              {tenant.slug ? <span dir="ltr"> · /{tenant.slug}</span> : null}
              {tenant.source === "workspace_request" ? " · طلب لم يُفعّل" : null}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#f6f5fb] px-3 py-1.5 text-xs font-bold text-[#6042d3]">
          {entries.length} {entries.length === 1 ? "حدث" : "أحداث"}
        </span>
      </header>
      <div className="border-t border-[#efedf3]">
        {entries.map((entry) => <AuditEvent key={entry.id} entry={entry} />)}
      </div>
    </section>
  );
}

export function PlatformAuditLog({ entries }: { entries: AuditRow[] }) {
  const [query, setQuery] = useState("");
  const [tenantId, setTenantId] = useState("all");
  const [accountType, setAccountType] = useState("all");
  const [action, setAction] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const tenants = useMemo(() => [...new Map(entries.map((entry) => [entry.tenant.id, entry.tenant])).values()], [entries]);
  const actions = useMemo(() => [...new Set(entries.map((entry) => entry.action))], [entries]);
  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const searchable = `${entry.tenant.name} ${entry.tenant.slug ?? ""} ${entry.action} ${actionLabels[entry.action] ?? ""}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase())
      && (tenantId === "all" || entry.tenant.id === tenantId)
      && (accountType === "all" || entry.tenant.accountType === accountType)
      && (action === "all" || entry.action === action)
      && eventMatchesDate(entry, dateRange);
  }), [accountType, action, dateRange, entries, query, tenantId]);
  const groups = useMemo(() => {
    const grouped = new Map<string, { tenant: AuditTenant; entries: AuditRow[] }>();
    for (const entry of filteredEntries) {
      const group = grouped.get(entry.tenant.id) ?? { tenant: entry.tenant, entries: [] };
      group.entries.push(entry);
      grouped.set(entry.tenant.id, group);
    }
    return [...grouped.values()];
  }, [filteredEntries]);

  return (
    <>
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="إجمالي الأحداث" value={entries.length} Icon={CalendarDays} />
        <Summary label="المساحات المسجلة" value={tenants.filter((tenant) => tenant.source === "tenant").length} Icon={Building2} />
        <Summary label="السناتر" value={tenants.filter((tenant) => tenant.accountType === "center").length} Icon={Building2} />
        <Summary label="المدرسون المستقلون" value={tenants.filter((tenant) => tenant.accountType === "independent_teacher").length} Icon={GraduationCap} />
      </section>

      <section className="card mb-5 p-4 md:p-5" aria-label="فلاتر سجل التدقيق">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <Filter className="size-4 text-[#6547d9]" aria-hidden="true" /> البحث والفلترة
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex items-center gap-2 rounded-xl border border-[#ddd8e9] bg-white px-3 py-2.5 text-sm focus-within:border-[#6547d9]">
            <Search className="size-4 shrink-0 text-[#777386]" aria-hidden="true" />
            <span className="sr-only">البحث في سجل التدقيق</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم المساحة أو الحدث" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <FilterSelect label="مساحة العمل" value={tenantId} onChange={setTenantId} options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))} />
          <FilterSelect label="نوع المساحة" value={accountType} onChange={setAccountType} options={[{ value: "center", label: "سنتر تعليمي" }, { value: "independent_teacher", label: "مدرس مستقل" }]} />
          <FilterSelect label="نوع الحدث" value={action} onChange={setAction} options={actions.map((eventAction) => ({ value: eventAction, label: actionLabels[eventAction] ?? eventAction }))} />
          <FilterSelect label="الفترة" value={dateRange} onChange={setDateRange} options={[{ value: "1", label: "آخر 24 ساعة" }, { value: "7", label: "آخر 7 أيام" }, { value: "30", label: "آخر 30 يومًا" }]} />
        </div>
      </section>

      {groups.length === 0 ? (
        <section className="card grid min-h-56 place-items-center p-8 text-center">
          <div>
            <Search className="mx-auto size-9 text-[#6547d9]" aria-hidden="true" />
            <h2 className="mt-3 font-extrabold">لا توجد نتائج مطابقة</h2>
            <p className="mt-2 text-sm text-[#6f6a80]">جرّب تغيير البحث أو أحد الفلاتر المحددة.</p>
          </div>
        </section>
      ) : (
        <div className="space-y-5">{groups.map((group) => <TenantGroup key={group.tenant.id} {...group} />)}</div>
      )}
    </>
  );
}

function Summary({ label, value, Icon }: { label: string; value: number; Icon: typeof Building2 }) {
  return (
    <article className="card p-4 md:p-5">
      <Icon className="size-5 text-[#6547d9]" aria-hidden="true" />
      <strong className="mt-3 block text-2xl font-extrabold">{value}</strong>
      <span className="mt-1 block text-xs text-[#6f6a80]">{label}</span>
    </article>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring h-full w-full rounded-xl border border-[#ddd8e9] bg-white px-3 py-2.5 text-sm font-semibold outline-none">
        <option value="all">كل {label}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
