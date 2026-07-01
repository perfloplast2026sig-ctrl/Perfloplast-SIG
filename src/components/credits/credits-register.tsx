"use client";

import { FileSpreadsheet, Landmark, Plus, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { createCreditPaymentAction, createCustomerCreditAction } from "@/actions/credits";
import { OperationalReportExport } from "@/components/reports/operational-report-export";
import { downloadExcelWorkbook, excelCell } from "@/lib/excel";
import type { CreditInvoiceOption, CreditRow, CreditsModuleData } from "@/services/credits";

type Filters = { search: string; status: string };

export function CreditsRegister({ data, generatedAt, generatedBy }: { data: CreditsModuleData; generatedAt: string; generatedBy: string }) {
  const [filters, setFilters] = useState<Filters>({ search: "", status: "Todos" });
  const [selectedCreditId, setSelectedCreditId] = useState("");
  const [fileName, setFileName] = useState("");
  const selectedCredit = useMemo(() => data.rows.find((row) => row.id === selectedCreditId) || null, [data.rows, selectedCreditId]);
  const filteredRows = useMemo(() => filterRows(data.rows, filters), [data.rows, filters]);
  const totals = useMemo(() => ({ credit: sum(filteredRows, "creditAmount"), paid: sum(filteredRows, "paid"), balance: sum(filteredRows, "balance") }), [filteredRows]);

  const exportExcel = () => downloadExcelWorkbook(`cartera-creditos-${new Date().toISOString().slice(0, 10)}.xls`, [{
    name: "Cartera creditos",
    rows: [
      { cells: [excelCell("Cartera de creditos", "Title", "String", 8)] },
      { cells: [excelCell(`Generado por ${generatedBy} - ${generatedAt}`, "Subtitle", "String", 8)] },
      { cells: ["Codigo", "Pedido", "Factura", "Cliente", "Vendedor", "Credito", "Abonado", "Saldo", "Estado"].map((value) => excelCell(value, "Header")) },
      ...filteredRows.map((row) => ({ cells: [row.code, row.preorder, row.invoice, row.client, row.seller, row.creditAmount, row.paid, row.balance, row.status.label].map((value) => excelCell(value, typeof value === "number" ? "Currency" : "Text", typeof value === "number" ? "Number" : "String")) })),
    ],
  }]);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <Kpi label="Credito filtrado" value={money(totals.credit)} detail={`${filteredRows.length} registros`} />
        <Kpi label="Abonado" value={money(totals.paid)} detail="Pagos registrados" />
        <Kpi label="Saldo pendiente" value={money(totals.balance)} detail="Cartera abierta" />
      </section>

      <section className="rounded-[24px] border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-muted">Cartera de clientes</p><h2 className="mt-1 text-xl font-semibold">Creditos y abonos</h2></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <FilterInput value={filters.search} onChange={(search) => setFilters((current) => ({ ...current, search }))} />
            <FilterSelect value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} />
            <OperationalReportExport title="Creditos" subtitle="Cartera y abonos filtrados" generatedAt={generatedAt} generatedBy={generatedBy} metrics={[{ label: "Registros", value: String(filteredRows.length), detail: "Creditos" }, { label: "Saldo", value: money(totals.balance), detail: "Pendiente" }, { label: "Abonado", value: money(totals.paid), detail: "Recuperado" }]} columns={[{ key: "pedido", label: "Pedido" }, { key: "cliente", label: "Cliente" }, { key: "vendedor", label: "Vendedor" }, { key: "credito", label: "Credito", align: "right" }, { key: "abonado", label: "Abonado", align: "right" }, { key: "saldo", label: "Saldo", align: "right" }, { key: "estado", label: "Estado" }]} rows={filteredRows.map((row) => ({ pedido: row.preorder, cliente: row.client, vendedor: row.seller, credito: money(row.creditAmount), abonado: money(row.paid), saldo: money(row.balance), estado: row.status.label }))} />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" onClick={exportExcel} type="button"><FileSpreadsheet size={16} />Excel</button>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-2xl border">
            <div className="hidden max-h-[62vh] overflow-auto md:block">
              <table className="w-full min-w-[980px] text-sm"><thead className="bg-card-muted/70 text-left text-xs uppercase tracking-[0.14em] text-muted"><tr>{["Pedido", "Cliente", "Vendedor", "Credito", "Abonado", "Saldo", "Estado", "Accion"].map((header) => <th key={header} className={`px-4 py-3 ${["Credito", "Abonado", "Saldo", "Accion"].includes(header) ? "text-right" : ""}`}>{header}</th>)}</tr></thead><tbody className="divide-y">{filteredRows.map((row) => <CreditTableRow key={row.id} row={row} onSelect={setSelectedCreditId} selected={selectedCreditId === row.id} />)}</tbody></table>
            </div>
            <div className="divide-y md:hidden">{filteredRows.map((row) => <CreditCard key={row.id} row={row} onSelect={setSelectedCreditId} selected={selectedCreditId === row.id} />)}</div>
            {filteredRows.length === 0 ? <p className="p-4 text-sm text-muted">No hay creditos con esos filtros.</p> : null}
          </div>

          <aside className="space-y-4">
            <CreditCreatePanel invoices={data.invoices} />
            <CreditPaymentPanel credit={selectedCredit} />
            <section className="rounded-2xl border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Carga Excel</p><h3 className="mt-1 font-semibold">Importar cartera</h3></div><UploadCloud className="text-accent" size={22} /></div><label className="mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-card-muted/40 p-4 text-center text-sm transition hover:bg-card-muted"><input accept=".xlsx,.xls,.csv" className="sr-only" type="file" onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} /><span className="font-black">Seleccionar Excel</span><span className="mt-1 text-xs text-muted">.xlsx, .xls o .csv</span></label><p className="mt-3 text-xs text-muted">Columnas esperadas: CODIGO, NOMBRE, VENDEDOR, DIRECCION, FECHA, TELEFONO, MONTO CREDITO, FECHA ABONO, BANCO, DOCUMENTO, MONTO ABONO, SALDO.</p><button className="mt-3 h-10 w-full rounded-full bg-card-muted text-sm font-black text-muted" disabled type="button">{fileName ? `Vista previa pendiente: ${fileName}` : "Vista previa pendiente"}</button></section>
          </aside>
        </div>
      </section>
    </div>
  );
}

function CreditCreatePanel({ invoices }: { invoices: CreditInvoiceOption[] }) {
  return <details className="rounded-2xl border bg-background p-4" open><summary className="cursor-pointer list-none font-semibold"><Plus className="mr-2 inline" size={16} />Nuevo credito</summary><form action={createCustomerCreditAction} className="mt-4 space-y-3"><label className="block text-sm font-semibold">Desde factura<select className="mt-1 h-11 w-full rounded-xl border bg-card px-3" name="invoiceId" defaultValue=""><option value="">Registro manual</option>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.label}</option>)}</select></label><div className="grid gap-2 sm:grid-cols-2"><TextField name="clientName" label="Cliente" /><TextField name="preorderCode" label="Pedido" /><TextField name="sellerName" label="Vendedor" /><TextField name="creditAmount" label="Monto credito" type="number" step="0.01" /><TextField name="openingBalance" label="Saldo inicial" type="number" step="0.01" /><TextField name="invoiceNumber" label="Factura" /></div><TextField name="notes" label="Nota" /><button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground" type="submit">Guardar credito</button></form></details>;
}

function CreditPaymentPanel({ credit }: { credit: CreditRow | null }) {
  return <section className="rounded-2xl border bg-background p-4"><div className="flex items-center gap-2 font-semibold"><Landmark size={16} />Registrar abono</div>{credit ? <p className="mt-2 text-sm text-muted">{credit.preorder} - saldo {money(credit.balance)}</p> : <p className="mt-2 text-sm text-muted">Selecciona un credito de la tabla.</p>}<form action={createCreditPaymentAction} className="mt-4 space-y-3"><input name="creditId" type="hidden" value={credit?.id || ""} readOnly /><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><TextField name="paymentDate" label="Fecha abono" type="date" /><TextField name="amount" label="Monto abono" type="number" step="0.01" /><TextField name="bank" label="Banco" /><TextField name="documentNumber" label="Documento" /></div><TextField name="notes" label="Nota" /><button className="inline-flex h-10 w-full items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-50" disabled={!credit} type="submit">Registrar abono</button></form></section>;
}

function CreditTableRow({ onSelect, row, selected }: { onSelect: (id: string) => void; row: CreditRow; selected: boolean }) {
  return <tr className={selected ? "bg-emerald-500/5" : "bg-card"}><td className="px-4 py-3 font-mono text-xs font-black">{row.preorder}<p className="mt-1 text-[11px] font-medium text-muted">{row.invoice}</p></td><td className="px-4 py-3"><p className="font-semibold">{row.client}</p><p className="text-xs text-muted">{row.phone || row.taxId}</p></td><td className="px-4 py-3">{row.seller}</td><td className="px-4 py-3 text-right font-semibold">{money(row.creditAmount)}</td><td className="px-4 py-3 text-right text-emerald-700">{money(row.paid)}</td><td className="px-4 py-3 text-right text-base font-black">{money(row.balance)}</td><td className="px-4 py-3"><StatusBadge label={row.status.label} /></td><td className="px-4 py-3 text-right"><button className="h-9 rounded-full border bg-background px-3 text-xs font-semibold" onClick={() => onSelect(row.id)} type="button">Abonar</button></td></tr>;
}

function CreditCard({ onSelect, row, selected }: { onSelect: (id: string) => void; row: CreditRow; selected: boolean }) {
  return <article className={selected ? "bg-emerald-500/5 p-4" : "bg-card p-4"}><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-sm font-black">{row.preorder}</p><p className="mt-1 font-semibold">{row.client}</p><p className="text-xs text-muted">{row.invoice}</p></div><StatusBadge label={row.status.label} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><Mini label="Credito" value={money(row.creditAmount)} /><Mini label="Abonado" value={money(row.paid)} /><Mini label="Saldo" value={money(row.balance)} /></div><button className="mt-3 h-9 w-full rounded-full border bg-background text-xs font-semibold" onClick={() => onSelect(row.id)} type="button">Registrar abono</button></article>;
}

function Kpi({ detail, label, value }: { detail: string; label: string; value: string }) { return <article className="rounded-[20px] border bg-card p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-muted">{label}</p><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-muted">{detail}</p></article>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-background p-2"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted">{label}</p><p className="mt-1 font-black">{value}</p></div>; }
function TextField({ label, name, step, type = "text" }: { label: string; name: string; step?: string; type?: string }) { return <label className="block text-sm font-semibold">{label}<input className="mt-1 h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-accent" name={name} step={step} type={type} /></label>; }
function FilterInput({ onChange, value }: { onChange: (value: string) => void; value: string }) { return <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-muted">Buscar</span><input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" onChange={(event) => onChange(event.target.value)} placeholder="Cliente, pedido, factura..." value={value} /></label>; }
function FilterSelect({ onChange, value }: { onChange: (value: string) => void; value: string }) { return <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-muted">Estado</span><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" onChange={(event) => onChange(event.target.value)} value={value}>{["Todos", "Abierto", "Pagado", "Anulado"].map((option) => <option key={option}>{option}</option>)}</select></label>; }
function StatusBadge({ label }: { label: string }) { const tone = label === "Pagado" ? "bg-emerald-500/10 text-emerald-700" : label === "Anulado" ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-700"; return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>; }
function filterRows(rows: CreditRow[], filters: Filters) { const term = normalize(filters.search); return rows.filter((row) => (filters.status === "Todos" || row.status.label === filters.status) && (!term || normalize([row.code, row.preorder, row.invoice, row.client, row.taxId, row.phone, row.seller].join(" ")).includes(term))); }
function normalize(value: string) { return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function sum(rows: CreditRow[], key: "creditAmount" | "paid" | "balance") { return rows.reduce((total, row) => total + row[key], 0); }
function money(value: number) { return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }