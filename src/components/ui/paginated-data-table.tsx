"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { PaginationControls } from "./pagination-controls";

type DisplayColumn = {
  header: string;
  align?: "left" | "right";
};

type DisplayRow = {
  key: string;
  cells: ReactNode[];
};

export function PaginatedDataTable({ columns, rows, pageSize }: { columns: DisplayColumn[]; rows: DisplayRow[]; pageSize: number }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = useMemo(() => rows.slice(start, start + pageSize), [rows, pageSize, start]);

  function goToPage(nextPage: number) {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="grid max-h-[68vh] gap-3 overflow-y-auto overscroll-contain bg-card p-3 md:hidden">
        {rows.length === 0 ? <p className="p-4 text-sm text-muted">Sin registros.</p> : null}
        {pagedRows.map((row) => <MobileRecord key={row.key} columns={columns} row={row} />)}
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
            {pagedRows.map((row) => (
              <tr key={row.key} className="transition-colors hover:bg-card-muted/60">
                {columns.map((column, index) => (
                  <td key={`${row.key}-${column.header}`} className={`px-4 py-4 align-top ${column.align === "right" ? "text-right" : "text-left"}`}>
                    {row.cells[index]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationFooter currentPage={currentPage} end={Math.min(start + pageSize, rows.length)} goToPage={goToPage} pageSize={pageSize} start={rows.length === 0 ? 0 : start + 1} total={rows.length} totalPages={totalPages} />
    </div>
  );
}

function MobileRecord({ columns, row }: { columns: DisplayColumn[]; row: DisplayRow }) {
  const titleIndex = 0;
  const statusIndex = columns.findIndex((column) => normalizedHeader(column.header) === "estado");
  const actionIndex = columns.findIndex((column) => ["accion", "acciones", "ver"].includes(normalizedHeader(column.header)));
  const amountIndex = columns.findIndex((column) => ["total", "valor", "ingresos"].includes(normalizedHeader(column.header)));
  const detailIndexes = columns
    .map((_, index) => index)
    .filter((index) => ![titleIndex, statusIndex, actionIndex, amountIndex].includes(index));

  return (
    <article className="rounded-2xl border bg-card-muted/35 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">{columns[titleIndex]?.header}</p>
          <div className="mt-1 break-words text-sm font-black text-foreground">{row.cells[titleIndex]}</div>
        </div>
        {statusIndex >= 0 ? <div className="shrink-0">{row.cells[statusIndex]}</div> : null}
      </div>

      {amountIndex >= 0 ? (
        <div className="mt-3 rounded-2xl border bg-card px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">{columns[amountIndex].header}</p>
          <div className="mt-1 break-words text-lg font-black text-foreground">{row.cells[amountIndex]}</div>
        </div>
      ) : null}

      {detailIndexes.length > 0 ? (
        <dl className="mt-3 grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
          {detailIndexes.map((index) => (
            <div key={columns[index].header} className="min-w-0 rounded-xl border bg-card/70 px-3 py-2">
              <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">{columns[index].header}</dt>
              <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-foreground">{row.cells[index]}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actionIndex >= 0 ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
          {row.cells[actionIndex]}
        </div>
      ) : null}
    </article>
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
        <PaginationControls currentPage={currentPage} onPageChange={goToPage} totalPages={totalPages} />
      </div>
    </div>
  );
}

function normalizedHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
