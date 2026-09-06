"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function AuthSubmitButtons() {
  const { data, pending } = useFormStatus();
  const intent = data?.get("intent");

  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      <button
        type="submit"
        name="intent"
        value="sign-in"
        disabled={pending}
        className="rounded-xl bg-[#6547d9] py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-65"
      >
        <span className="inline-flex items-center gap-2" aria-live="polite">
          {pending && intent === "sign-in" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {pending && intent === "sign-in" ? "جارٍ الدخول..." : "دخول"}
        </span>
      </button>
      <button
        type="submit"
        name="intent"
        value="sign-up"
        disabled={pending}
        className="rounded-xl border border-[#6547d9] py-3 text-sm font-bold text-[#6547d9] disabled:cursor-not-allowed disabled:opacity-65"
      >
        <span className="inline-flex items-center gap-2" aria-live="polite">
          {pending && intent === "sign-up" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {pending && intent === "sign-up" ? "جارٍ إنشاء الحساب..." : "حساب جديد"}
        </span>
      </button>
    </div>
  );
}
