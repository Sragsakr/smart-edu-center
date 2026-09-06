"use client";

import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  idleLabel: string;
  pendingLabel: string;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  className,
  disabled,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-65`}
    >
      <span className="inline-flex items-center justify-center gap-2" aria-live="polite">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {pending ? pendingLabel : idleLabel}
      </span>
    </button>
  );
}
