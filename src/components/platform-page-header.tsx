import { ShieldCheck } from "lucide-react";

export function PlatformPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-7 flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#6547d9] text-white lg:hidden">
        <ShieldCheck size={22} aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-bold text-[#6547d9]">إدارة المنصة</p>
        <h1 className="text-xl font-extrabold md:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-xs text-[#777386] md:text-sm">{description}</p> : null}
      </div>
    </header>
  );
}
