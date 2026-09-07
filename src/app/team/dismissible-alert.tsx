"use client";

import { useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

export function DismissibleAlert({
  kind,
  message,
}: {
  kind: "error" | "success";
  message: string;
}) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const isError = kind === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-bold ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {isError ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="إغلاق الرسالة"
        className="grid size-7 shrink-0 place-items-center rounded-lg transition hover:bg-black/5"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
