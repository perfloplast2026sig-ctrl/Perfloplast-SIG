import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TableActions({ align = "end", children, className }: { align?: "start" | "end"; children: ReactNode; className?: string }) {
  return (
    <div className={cn("inline-flex min-w-max flex-wrap items-center gap-2", align === "end" ? "justify-end" : "justify-start", className)}>
      {children}
    </div>
  );
}
