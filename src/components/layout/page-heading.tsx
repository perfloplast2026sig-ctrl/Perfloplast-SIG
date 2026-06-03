import type { ReactNode } from "react";

export function PageHeading({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="min-w-0 max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">Sistema de inventario empresarial</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted md:text-base">{description}</p>
      </div>
      {actions ? <div className="page-actions grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">{actions}</div> : null}
    </div>
  );
}
