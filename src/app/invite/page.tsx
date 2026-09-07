import Link from "next/link";
import { MailCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/app/team/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InvitePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const error = typeof params.error === "string" ? params.error : null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main dir="rtl" className="grid min-h-dvh place-items-center bg-[#f6f5fb] px-4 py-10 text-[#17152b]">
      <section className="w-full max-w-xl rounded-3xl border border-[#e7e3ef] bg-white p-6 shadow-sm md:p-8">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#eeeaff] text-[#6547d9]"><MailCheck /></span>
        <h1 className="mt-5 text-2xl font-extrabold">قبول دعوة الانضمام</h1>
        <p className="mt-2 text-sm leading-7 text-[#777386]">الدعوة مرتبطة بالبريد الإلكتروني الذي أرسلها إليه مدير مساحة العمل، ولا يمكن استخدامها بحساب آخر.</p>

        {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
        {!token ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">رابط الدعوة ناقص أو غير صالح.</div> : null}

        {token && user ? (
          <div className="mt-6">
            <div className="rounded-2xl bg-[#f7f5ff] p-4 text-sm text-[#5e5870]"><ShieldCheck className="ml-2 inline size-4 text-[#6547d9]" />أنت مسجل الدخول حاليًا بالبريد: <b>{user.email}</b></div>
            <form action={acceptInvitation} className="mt-4">
              <input type="hidden" name="token" value={token} />
              <button className="w-full rounded-xl bg-[#6547d9] px-5 py-3 text-sm font-bold text-white">قبول الدعوة والانضمام</button>
            </form>
          </div>
        ) : token ? (
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-[#ddd8e9] bg-[#faf9fc] p-4 text-sm leading-7 text-[#6f6a80]">سجّل الدخول أولًا بنفس البريد الذي استلم الدعوة، ثم افتح رابط الدعوة مرة أخرى. لو الدعوة وصلت عبر Supabase لمستخدم جديد فالرابط نفسه سيكمل جلسة الدخول قبل الوصول هنا.</div>
            <Link href={`/login?error=${encodeURIComponent("سجل الدخول بنفس البريد المدعو ثم افتح رابط الدعوة مرة أخرى")}`} className="block w-full rounded-xl border border-[#6547d9] px-5 py-3 text-center text-sm font-bold text-[#6547d9]">الذهاب لتسجيل الدخول</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
