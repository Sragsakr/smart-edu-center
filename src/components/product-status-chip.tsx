import { type FeatureStatus, featureStatusShortLabels } from "@/lib/product/feature-status";

type ChipTone = "light" | "dark";

const toneClasses: Record<FeatureStatus, Record<ChipTone, string>> = {
  available: {
    light: "bg-[#e8f7f2] text-[#1d7a61] border-[#bfe6d9]",
    dark: "bg-[#2fab88]/15 text-[#8bd7bd] border-[#8bd7bd]/30",
  },
  coming_soon: {
    light: "bg-[#fdf4e6] text-[#9a6a15] border-[#f2ddb8]",
    dark: "bg-[#e09d36]/15 text-[#f0c479] border-[#f0c479]/30",
  },
  planned: {
    light: "bg-[#f1edff] text-[#5c47b8] border-[#ded5fb]",
    dark: "bg-white/10 text-[#c9c0f0] border-white/20",
  },
};

const dotClasses: Record<FeatureStatus, string> = {
  available: "bg-[#2fab88]",
  coming_soon: "bg-[#e09d36]",
  planned: "bg-[#9b8ad6]",
};

/**
 * وسم حالة موحّد لكل ميزة معروضة للمستخدم.
 * `tone="dark"` للاستخدام فوق الخلفيات الداكنة.
 */
export function ProductStatusChip({
  status,
  tone = "light",
  compact = false,
}: {
  status: FeatureStatus;
  tone?: ChipTone;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-bold ${toneClasses[status][tone]} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dotClasses[status]}`} />
      {featureStatusShortLabels[status]}
    </span>
  );
}
