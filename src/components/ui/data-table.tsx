import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (item: T) => ReactNode;
  align?: "left" | "right";
};

export function DataTable<T>({ columns, data }: { columns: Array<Column<T>>; data: T[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="divide-y divide-border bg-card md:hidden">
        {data.length === 0 ? <p className="p-4 text-sm text-muted">Sin registros.</p> : null}
        {data.map((item, index) => (
          <article key={index} className="grid gap-3 p-4">
            {columns.map((column) => (
              <div key={column.header} className="grid gap-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{column.header}</p>
                <div className={`min-w-0 text-sm ${column.align === "right" ? "text-left" : ""}`}>
                  {column.cell(item)}
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
            {data.map((item, index) => (
              <tr key={index} className="transition-colors hover:bg-card-muted/60">
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
    </div>
  );
}
