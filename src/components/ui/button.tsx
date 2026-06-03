import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({ children, variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition sm:w-auto",
        variant === "primary" ? "bg-accent text-accent-foreground hover:opacity-90" : "border bg-card text-foreground hover:bg-card-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
