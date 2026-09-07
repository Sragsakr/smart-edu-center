import Link from "next/link";
import { Building2, GraduationCap, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentAccountAccess, getPortalCount } from "@/lib/auth/account-access";

export default async function ChooseContextPage() {
  const access = await getCurrentAccountAccess();
  if (!access.user) redirect("/login");
  if (getPortalCount(access) <= 1) redirect("/");

  return (
    <main dir="rtl" className="grid min-h-dvh place-items-center bg-[#f6f5fb] p-4">
      <section className="w-full max-w-2xl rounded-3xl border border-[#e8e5ef] bg-white p-6 shadow-xl shadow-purple-100/40 md:p-8">
        <h1 className="text-2xl font-extrabold">اختر الواجهة التي تريد الدخول إليها</h1>
        <p className="mt-2 text-sm leading-7 text-[#6f6a80]">هذا الحساب مرتبط بأكثر من دور. يمكنك الانتقال بين الواجهات دون إنشاء حساب جديد.</p>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {access.membership ? <Link href="/" className="rounded-2xl border border-[#e5e2ec] p-5 transition hover:border-[#6547d9] hover:bg-[#faf9ff]"><Building2 className="size-6 text-[#6547d9]" /><b className="mt-4 block">إدارة السنتر/المدرس</b><span className="mt-1 block text-xs text-[#6f6a80]">لوحة التشغيل والإدارة</span></Link> : null}
          {access.student ? <Link href="/student" className="rounded-2xl border border-[#e5e2ec] p-5 transition hover:border-[#6547d9] hover:bg-[#faf9ff]"><GraduationCap className="size-6 text-[#6547d9]" /><b className="mt-4 block">حساب الطالب</b><span className="mt-1 block text-xs text-[#6f6a80]">الحصص والحضور والمدفوعات</span></Link> : null}
          {access.guardian ? <Link href="/parent" className="rounded-2xl border border-[#e5e2ec] p-5 transition hover:border-[#6547d9] hover:bg-[#faf9ff]"><UsersRound className="size-6 text-[#6547d9]" /><b className="mt-4 block">حساب ولي الأمر</b><span className="mt-1 block text-xs text-[#6f6a80]">متابعة الأبناء والتواصل</span></Link> : null}
        </div>
      </section>
    </main>
  );
}
