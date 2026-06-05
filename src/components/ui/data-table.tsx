import { Fragment, type ReactNode } from "react";
import { PaginatedDataTable } from "./paginated-data-table";

export type Column<T> = {
  header: string;
  cell: (item: T) => ReactNode;
  align?: "left" | "right";
};

export function DataTable<T>({ columns, data, pageSize = 10 }: { columns: Array<Column<T>>; data: T[]; pageSize?: number }) {
  return (
    <PaginatedDataTable
      columns={columns.map((column) => ({ header: column.header, align: column.align }))}
      pageSize={pageSize}
      rows={data.map((item, index) => ({ key: String(index), cells: columns.map((column) => <Fragment key={column.header}>{column.cell(item)}</Fragment>) }))}
    />
  );
}
