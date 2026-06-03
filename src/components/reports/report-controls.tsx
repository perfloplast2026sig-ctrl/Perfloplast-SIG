"use client";

import { Download, FileSpreadsheet, FilterX } from "lucide-react";
import { useMemo, useState } from "react";

type Filters = {
  sellers: string[];
  warehouses: string[];
  products: string[];
  clients: string[];
  statuses: string[];
  shifts: string[];
  drivers: string[];
};

type Kpi = { label: string; value: string; detail: string };
type Seller = { seller: string; total: number; totalLabel: string; count: number };

const initialFilters = {
  seller: "Todos",
  warehouse: "Todos",
  product: "Todos",
  client: "Todos",
  status: "Todos",
  shift: "Todos",
  driver: "Todos",
  from: "",
  to: "",
};

export function ReportControls({ filters, kpis, sellers }: { filters: Filters; kpis: Kpi[]; sellers: Seller[] }) {
  const [state, setState] = useState(initialFilters);
  const activeCount = useMemo(() => Object.entries(state).filter(([, value]) => value && value !== "Todos").length, [state]);

  const exportCsv = () => {
    const rows = [
      ["Indicador", "Valor", "Detalle"],
      ...kpis.map((kpi) => [kpi.label, kpi.value, kpi.detail]),
      [],
      ["Vendedor", "Ventas", "Total"],
      ...sellers.map((seller) => [seller.seller, String(seller.count), seller.totalLabel]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-ejecutivo-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="report-no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Filtros del reporte</p>
          <h2 className="mt-1 text-xl font-semibold">Segmentar informacion</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" onClick={() => setState(initialFilters)} type="button">
            <FilterX size={15} />Limpiar {activeCount > 0 ? `(${activeCount})` : ""}
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" onClick={exportCsv} type="button">
            <FileSpreadsheet size={15} />Excel
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90" onClick={() => window.print()} type="button">
            <Download size={15} />PDF
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DateField label="Desde" value={state.from} onChange={(value) => setState((current) => ({ ...current, from: value }))} />
        <DateField label="Hasta" value={state.to} onChange={(value) => setState((current) => ({ ...current, to: value }))} />
        <SelectField label="Vendedor" options={filters.sellers} value={state.seller} onChange={(value) => setState((current) => ({ ...current, seller: value }))} />
        <SelectField label="Bodega" options={filters.warehouses} value={state.warehouse} onChange={(value) => setState((current) => ({ ...current, warehouse: value }))} />
        <SelectField label="Producto" options={filters.products} value={state.product} onChange={(value) => setState((current) => ({ ...current, product: value }))} />
        <SelectField label="Cliente" options={filters.clients} value={state.client} onChange={(value) => setState((current) => ({ ...current, client: value }))} />
        <SelectField label="Estado" options={filters.statuses} value={state.status} onChange={(value) => setState((current) => ({ ...current, status: value }))} />
        <SelectField label="Piloto" options={filters.drivers} value={state.driver} onChange={(value) => setState((current) => ({ ...current, driver: value }))} />
      </div>

      {activeCount > 0 ? (
        <div className="rounded-2xl border bg-card-muted/40 p-4 text-sm text-muted">
          Filtros seleccionados para exportacion: {Object.entries(state).filter(([, value]) => value && value !== "Todos").map(([key, value]) => `${labelFor(key)}: ${value}`).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-2xl border bg-card-muted/35 p-3">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <select className="h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-accent" onChange={(event) => onChange(event.target.value)} value={value}>
        <option>Todos</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-2xl border bg-card-muted/35 p-3">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <input className="h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-accent" onChange={(event) => onChange(event.target.value)} type="date" value={value} />
    </label>
  );
}

function labelFor(key: string) {
  const labels: Record<string, string> = {
    seller: "Vendedor",
    warehouse: "Bodega",
    product: "Producto",
    client: "Cliente",
    status: "Estado",
    shift: "Turno",
    driver: "Piloto",
    from: "Desde",
    to: "Hasta",
  };
  return labels[key] || key;
}
