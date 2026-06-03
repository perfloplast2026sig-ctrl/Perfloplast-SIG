import type { StatusTone } from "@/types";
import { cn } from "@/lib/utils";

const toneClass: Record<StatusTone, string> = {
  neutral: "bg-card-muted text-muted ring-border",
  info: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  warning: "bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300",
};

export function Badge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1", toneClass[tone])}>
      {label}
    </span>
  );
}
