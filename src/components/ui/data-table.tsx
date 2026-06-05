import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (item: T) => ReactNode;
  align?: "left" | "right";
};

export function DataTable<T>({ columns, data }: { columns: Array<Column<T>>; data: T[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="grid max-h-[68vh] gap-3 overflow-y-auto overscroll-contain bg-card p-3 md:hidden">
        {data.length === 0 ? <p className="p-4 text-sm text-muted">Sin registros.</p> : null}
        {data.map((item, index) => <MobileRecord key={index} columns={columns} item={item} />)}
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
