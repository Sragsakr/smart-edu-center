"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, LoaderCircle, MessageCircle } from "lucide-react";

export function ActionSubmitButton({
  idleLabel,
  pendingLabel = "جارٍ التنفيذ...",
  className,
}: {
  idleLabel: string;
  pendingLabel?: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function InvitationShare({ invitationUrl }: { invitationUrl: string }) {
  const [copied, setCopied] = useState(false);
  const message = `تمت دعوتك للانضمام إلى Smart Edu. افتح الرابط التالي. إذا كان هذا أول حساب لك ستنشئ كلمة المرور من صفحة الدعوة، وإذا كان لديك حساب ستدخل كلمة مرورك الحالية:\n${invitationUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copyInvitation() {
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copyInvitation}
        className="inline-flex items-center gap-2 rounded-xl border border-[#cfc7f5] bg-white px-4 py-2 text-xs font-bold text-[#6547d9]"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "تم النسخ" : "نسخ رابط الدعوة"}
      </button>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2 text-xs font-bold text-white"
      >
        <MessageCircle className="size-4" />
        إرسال عبر واتساب
      </a>
    </div>
  );
}
