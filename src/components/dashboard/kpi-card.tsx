import { ArrowUpRight, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const toneClass = {
  neutral: "border-violet-200 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.20),transparent_34%),linear-gradient(140deg,#ffffff,#f4f1ff)] text-violet-800 shadow-violet-900/10 dark:border-violet-900/70 dark:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.22),transparent_34%),linear-gradient(140deg,#171123,#121917)] dark:text-violet-100",
  info: "border-sky-200 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,.22),transparent_34%),linear-gradient(140deg,#ffffff,#eef8ff)] text-sky-800 shadow-sky-900/10 dark:border-sky-900/70 dark:bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,.22),transparent_34%),linear-gradient(140deg,#0b1d2a,#121917)] dark:text-sky-100",
  success: "border-emerald-200 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.24),transparent_34%),linear-gradient(140deg,#ffffff,#edfdf5)] text-emerald-800 shadow-emerald-900/10 dark:border-emerald-900/70 dark:bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.23),transparent_34%),linear-gradient(140deg,#0b261d,#121917)] dark:text-emerald-100",
  warning: "border-amber-200 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.25),transparent_34%),linear-gradient(140deg,#ffffff,#fff7df)] text-amber-800 shadow-amber-900/10 dark:border-amber-900/70 dark:bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.22),transparent_34%),linear-gradient(140deg,#2a1d0b,#121917)] dark:text-amber-100",
};

const iconClass = {
  neutral: "bg-violet-500/15 text-violet-700 shadow-violet-900/10 dark:text-violet-200",
  info: "bg-sky-500/15 text-sky-700 shadow-sky-900/10 dark:text-sky-200",
  success: "bg-emerald-500/15 text-emerald-700 shadow-emerald-900/10 dark:text-emerald-200",
  warning: "bg-amber-500/15 text-amber-700 shadow-amber-900/10 dark:text-amber-200",
};

export function KpiCard({ label, value, change, tone }: { label: string; value: string; change: string; tone: keyof typeof toneClass }) {
  return (
    <div className={cn("group relative overflow-hidden rounded-3xl border p-5 shadow-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl dark:shadow-[0_18px_45px_rgba(0,0,0,0.28)]", toneClass[tone])}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-current opacity-60" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(120deg,rgba(255,255,255,.85)_0_1px,transparent_1px_12px)] dark:opacity-[0.08]" />
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-current opacity-10 blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-20" />
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-36 text-sm font-semibold opacity-80">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-full shadow-sm transition duration-300 group-hover:rotate-12 group-hover:scale-110", iconClass[tone])}>
          {tone === "warning" ? <CircleAlert size={17} /> : <ArrowUpRight size={17} />}
        </span>
      </div>
      <p className="mt-5 text-4xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-sm font-semibold opacity-70">{change}</p>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/35 dark:bg-white/10">
        <div className="h-full w-2/3 rounded-full bg-current opacity-70 transition-all duration-700 group-hover:w-full" />
      </div>
    </div>
  );
}
