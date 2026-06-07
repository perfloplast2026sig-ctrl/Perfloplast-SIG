"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SectionCard } from "@/components/ui/section-card";
import type { StatusTone } from "@/types";

type ReturnProduct = {
  id: string;
  product: string;
  color: string;
  quantity: string;
  returnedQuantity: number;
};

type ReturnRow = {
  id: string;
  dispatch: string;
  client: string;
  driver: string;
  reason: string;
  requestedAt: string;
  resolvedAt: string;
  scope: string;
  status: { label: string; tone: StatusTone };
  products: ReturnProduct[];
};

export type DispatchReturnGroup = {
  preorder: string;
  client: string;
  returns: ReturnRow[];
};

const PAGE_SIZE = 5;

export function DispatchReturnsRegistry({ groups }: { groups: DispatchReturnGroup[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleGroups = useMemo(() => groups.slice(start, start + PAGE_SIZE), [groups, start]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-5">
      {visibleGroups.map((group) => {
        const stats = groupStats(group.returns);
        return (
          <SectionCard key={group.preorder} title={`${group.preorder} - ${group.client}`} eyebrow={`${group.returns.length} devolucion(es)`}>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border bg-card-muted/40 p-3 text-xs font-semibold text-muted">
              <span className="rounded-full bg-card px-3 py-1 shadow-sm ring-1 ring-border">{stats.dispatches} despacho(s)</span>
              <span className="rounded-full bg-card px-3 py-1 shadow-sm ring-1 ring-border">{stats.products} producto(s)</span>
              <span className="rounded-full bg-card px-3 py-1 shadow-sm ring-1 ring-border">{stats.units.toLocaleString("es-GT")} un devueltas</span>
              {stats.pending > 0 ? <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-300">{stats.pending} pendiente(s)</span> : <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300">Sin pendientes</span>}
            </div>

            <div className="overflow-hidden rounded-2xl border bg-card">
              {group.returns.map((item) => (
                <article key={item.id} className="grid gap-3 border-b p-4 last:border-b-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-card-muted px-2.5 py-1 font-mono text-xs font-bold ring-1 ring-border">{item.dispatch}</span>
                      <Badge label={item.scope} tone={item.scope === "Devolucion total" ? "warning" : "info"} />
                      <Badge label={item.status.label} tone={item.status.tone} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{item.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      <span>Piloto: {item.driver}</span>
                      <span>Registrada: {item.requestedAt}</span>
                      <span>Resolucion: {item.resolvedAt}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {item.products.map((product) => (
                      <div key={product.id} className="min-w-[10.5rem] rounded-xl border bg-card-muted/30 px-3 py-2 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{product.product}</p>
                            <p className="truncate text-xs text-muted">{product.color}</p>
                          </div>
                          <span className="shrink-0 text-sm font-black">{product.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        );
      })}

      <div className="rounded-3xl border bg-card-muted/35 px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-muted">Mostrando {start + 1}-{Math.min(start + PAGE_SIZE, groups.length)} de {groups.length} pedidos con devolucion</p>
          <PaginationControls currentPage={currentPage} onPageChange={setPage} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}

function groupStats(rows: ReturnRow[]) {
  const dispatches = new Set(rows.map((row) => row.dispatch)).size;
  const products = rows.reduce((sum, row) => sum + row.products.length, 0);
  const units = rows.reduce((sum, row) => sum + row.products.reduce((itemSum, product) => itemSum + product.returnedQuantity, 0), 0);
  const pending = rows.filter((row) => row.status.label === "Pendiente").length;
  return { dispatches, pending, products, units };
}
