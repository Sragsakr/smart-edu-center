import { headers } from "next/headers";
import { GraduationCap } from "lucide-react";
import { signIn, signUp } from "@/app/auth/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? `https://${headerStore.get("host")}`;
  return <main className="grid min-h-dvh place-items-center bg-[#f6f5fb] p-4" dir="rtl"><section className="w-full max-w-md rounded-3xl border border-[#e8e5ef] bg-white p-7 shadow-xl shadow-purple-100/50"><div className="mb-7 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#6547d9] text-white"><GraduationCap/></span><div><h1 className="font-extrabold">Smart Edu Center</h1><p className="text-xs text-[#858197]">إدارة السنتر من مكان واحد</p></div></div>{params.error&&<p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}{params.message&&<p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{params.message}</p>}<form className="space-y-4"><input type="hidden" name="origin" value={origin}/><label className="block text-sm font-bold">البريد الإلكتروني<input name="email" type="email" required className="mt-2 w-full rounded-xl border border-[#ddd8e9] px-4 py-3 font-normal outline-none focus:border-[#6547d9]"/></label><label className="block text-sm font-bold">كلمة المرور<input name="password" type="password" minLength={8} required className="mt-2 w-full rounded-xl border border-[#ddd8e9] px-4 py-3 font-normal outline-none focus:border-[#6547d9]"/></label><div className="grid grid-cols-2 gap-3 pt-2"><button formAction={signIn} className="rounded-xl bg-[#6547d9] py-3 text-sm font-bold text-white">دخول</button><button formAction={signUp} className="rounded-xl border border-[#6547d9] py-3 text-sm font-bold text-[#6547d9]">حساب جديد</button></div></form></section></main>;
}

