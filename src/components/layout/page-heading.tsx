import type { ReactNode } from "react";

export function PageHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(22rem,0.82fr)_minmax(34rem,1.18fr)] xl:items-end">
      <div className="min-w-0 max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">Sistema de inventario empresarial</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 text-sm leading-6 text-muted md:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3 xl:justify-self-end">{actions}</div> : null}
    </div>
  );
}
