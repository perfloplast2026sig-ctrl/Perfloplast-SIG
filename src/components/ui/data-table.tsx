"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

export type Column<T> = {
  header: string;
  cell: (item: T) => ReactNode;
  align?: "left" | "right";
};

export function DataTable<T>({ columns, data, pageSize = 10 }: { columns: Array<Column<T>>; data: T[]; pageSize?: number }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedData = useMemo(() => data.slice(start, start + pageSize), [data, pageSize, start]);

  function goToPage(nextPage: number) {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="grid max-h-[68vh] gap-3 overflow-y-auto overscroll-contain bg-card p-3 md:hidden">
        {data.length === 0 ? <p className="p-4 text-sm text-muted">Sin registros.</p> : null}
        {pagedData.map((item, index) => <MobileRecord key={start + index} columns={columns} item={item} />)}
      </div>
      <div className="hidden max-h-[70vh] overflow-auto md:block">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-card-muted/80 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className={`whitespace-nowrap px-4 py-3 ${column.align === "right" ? "text-right" : "text-left"}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {pagedData.map((item, index) => (
              <tr key={start + index} className="transition-colors hover:bg-card-muted/60">
                {columns.map((column) => (
                  <td key={column.header} className={`px-4 py-4 align-top ${column.align === "right" ? "text-right" : "text-left"}`}>
                    {column.cell(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationFooter currentPage={currentPage} end={Math.min(start + pageSize, data.length)} goToPage={goToPage} pageSize={pageSize} start={data.length === 0 ? 0 : start + 1} total={data.length} totalPages={totalPages} />
    </div>
  );
}

function PaginationFooter({ currentPage, end, goToPage, pageSize, start, total, totalPages }: { currentPage: number; end: number; goToPage: (page: number) => void; pageSize: number; start: number; total: number; totalPages: number }) {
  if (total <= pageSize) {
    return <div className="border-t bg-card-muted/35 px-4 py-3 text-xs font-semibold text-muted">{total} registros</div>;
  }

  return (
    <div className="flex flex-col gap-3 border-t bg-card-muted/35 px-4 py-3 text-xs font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>Mostrando {start}-{end} de {total}</span>
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded-full border bg-card px-3 py-1.5 transition hover:bg-card-muted disabled:cursor-not-allowed disabled:opacity-45" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)} type="button">Anterior</button>
        {pageNumbers(currentPage, totalPages).map((item) => item === "..." ? (
          <span key={`${item}-${currentPage}`} className="px-1">...</span>
        ) : (
          <button key={item} className={`min-w-8 rounded-full border px-3 py-1.5 transition ${item === currentPage ? "bg-accent text-accent-foreground" : "bg-card hover:bg-card-muted"}`} onClick={() => goToPage(item)} type="button">{item}</button>
        ))}
        <button className="rounded-full border bg-card px-3 py-1.5 transition hover:bg-card-muted disabled:cursor-not-allowed disabled:opacity-45" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)} type="button">Siguiente</button>
      </div>
    </div>
  );
}

function pageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
    .flatMap((page, index, rows) => index > 0 && page - rows[index - 1] > 1 ? ["..." as const, page] : [page]);
}

function MobileRecord<T>({ columns, item }: { columns: Array<Column<T>>; item: T }) {
  const titleColumn = columns[0];
  const statusColumn = columns.find((column) => normalizedHeader(column.header) === "estado");
  const actionColumn = columns.find((column) => ["accion", "acciones", "ver"].includes(normalizedHeader(column.header)));
  const amountColumn = columns.find((column) => ["total", "valor", "ingresos"].includes(normalizedHeader(column.header)));
  const detailColumns = columns.filter((column) => column !== titleColumn && column !== statusColumn && column !== actionColumn && column !== amountColumn);

  return (
    <article className="rounded-2xl border bg-card-muted/35 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{titleColumn.header}</p>
          <div className="mt-1 break-words text-sm font-black text-foreground">{titleColumn.cell(item)}</div>
        </div>
        {statusColumn ? <div className="shrink-0">{statusColumn.cell(item)}</div> : null}
      </div>

      {amountColumn ? (
        <div className="mt-3 rounded-2xl border bg-card px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">{amountColumn.header}</p>
          <div className="mt-1 break-words text-lg font-black text-foreground">{amountColumn.cell(item)}</div>
        </div>
      ) : null}

      {detailColumns.length > 0 ? (
        <dl className="mt-3 grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
          {detailColumns.map((column) => (
            <div key={column.header} className="min-w-0 rounded-xl border bg-card/70 px-3 py-2">
              <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">{column.header}</dt>
              <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-foreground">{column.cell(item)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actionColumn ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
          {actionColumn.cell(item)}
        </div>
      ) : null}
    </article>
  );
}

function normalizedHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
