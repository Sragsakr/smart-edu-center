"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut, UserPlus } from "lucide-react";

import { acceptExistingInvitation, acceptNewInvitation, switchInvitationAccount } from "./actions";

function SubmitButton({ idle, pending, tone = "primary" }: { idle: string; pending: string; tone?: "primary" | "outline" }) {
  const { pending: isPending } = useFormStatus();
  const classes = tone === "primary"
    ? "bg-[#6547d9] text-white disabled:bg-[#9b8be5]"
    : "border border-[#6547d9] bg-white text-[#6547d9] disabled:opacity-60";
  return <button disabled={isPending} className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${classes}`}>
    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}{isPending ? pending : idle}
  </button>;
}

export function NewInviteAccountForm({ token, email }: { token: string; email: string }) {
  return <form action={acceptNewInvitation} className="mt-5 space-y-4">
    <input type="hidden" name="token" value={token} />
    <div>
      <label className="mb-2 block text-sm font-bold">البريد المدعو</label>
      <input value={email} readOnly className="w-full rounded-xl border border-[#ddd8e9] bg-[#f7f5fb] px-4 py-3 text-sm text-[#625d70]" />
    </div>
    <div>
      <label htmlFor="invite-password" className="mb-2 block text-sm font-bold">إنشاء كلمة المرور</label>
      <input id="invite-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
    </div>
    <div>
      <label htmlFor="invite-confirm-password" className="mb-2 block text-sm font-bold">تأكيد كلمة المرور</label>
      <input id="invite-confirm-password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="w-full rounded-xl border border-[#ddd8e9] px-4 py-3 outline-none focus:border-[#6547d9]" />
    </div>
    <SubmitButton idle="إنشاء الحساب وقبول الدعوة" pending="جارٍ إنشاء الحساب والانضمام..." />
  </form>;
}

export function ExistingInviteForm({ token }: { token: string }) {
  return <form action={acceptExistingInvitation} className="mt-4">
    <input type="hidden" name="token" value={token} />
    <SubmitButton idle="قبول الدعوة والانضمام" pending="جارٍ قبول الدعوة..." />
  </form>;
}

export function SwitchInviteAccountForm({ token }: { token: string }) {
  return <form action={switchInvitationAccount} className="mt-4">
    <input type="hidden" name="token" value={token} />
    <SubmitButton idle="تسجيل الخروج والدخول بالحساب المدعو" pending="جارٍ تبديل الحساب..." tone="outline" />
  </form>;
}

export function InviteModeIcon({ kind }: { kind: "new" | "switch" }) {
  return kind === "new" ? <UserPlus className="size-4" /> : <LogOut className="size-4" />;
}
