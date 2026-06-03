"use client";

import { Download, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type PreorderRow = {
  code: string;
  client: string;
  seller: string;
  sellerEmail: string;
  products: string;
  warehouse: string;
  totalNumber: number;
  total: string;
  payment: string;
  dateKey: string;
  date: string;
  status: { label: string };
  items: Array<{ product: string; color: string; quantity: string; unitPrice: string; subtotal: string }>;
};

export function PreorderReportExport({ preorders }: { preorders: PreorderRow[] }) {
  const [seller, setSeller] = useState("Todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const sellers = useMemo(() => Array.from(new Set(preorders.map((row) => row.seller).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es")), [preorders]);
  const rows = useMemo(() => preorders.filter((row) => {
    if (seller !== "Todos" && row.seller !== seller) return false;
    if (from && row.dateKey < from) return false;
    if (to && row.dateKey > to) return false;
    return true;
  }), [from, preorders, seller, to]);
  const total = rows.reduce((sum, row) => sum + row.totalNumber, 0);
  const sellerSummary = useMemo(() => buildSellerSummary(rows), [rows]);
  const productRows = useMemo(() => rows.flatMap((row) => row.items.map((item, index) => ({ ...item, code: row.code, key: `${row.code}-${index}` }))), [rows]);

  const print = () => {
    const cleanup = () => {
      document.body.classList.remove("printing-preorder-report");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    document.body.classList.add("printing-preorder-report");
    window.setTimeout(() => window.print(), 80);
  };

  return (
    <>
      <section className="preorder-report-controls rounded-2xl border bg-card/70 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted">
            <SlidersHorizontal size={15} />
            Exportacion PDF
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
            <select className="h-9 rounded-full border bg-card px-3 text-sm outline-none focus:border-accent" onChange={(event) => setSeller(event.target.value)} value={seller}>
              <option>Todos</option>
              {sellers.map((name) => <option key={name}>{name}</option>)}
            </select>
            <input className="h-9 rounded-full border bg-card px-3 text-sm outline-none focus:border-accent" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
            <input className="h-9 rounded-full border bg-card px-3 text-sm outline-none focus:border-accent" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
            <button className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90" onClick={print} type="button">
              <Download size={15} /> PDF
            </button>
          </div>
        </div>
      </section>

      <div className="preorder-report-print-stage">
        <article className="preorder-report-print-target">
          <header className="preorder-report-header">
            <div className="preorder-report-brand-block">
              <Image alt="PERFLOPLAST" height={68} src="/company-logo.svg.png" width={96} />
              <div>
                <p className="preorder-report-brand">PERFLOPLAST</p>
                <p>Industria de plastico</p>
                <p>Aldea Chijou, Santa Cruz Verapaz</p>
                <p>Tel: 44235941 / 53146115</p>
              </div>
            </div>
            <div>
              <p>Reporte comercial ejecutivo</p>
              <h1>Preventas</h1>
              <strong>{from || "Inicio"} / {to || "Hoy"}</strong>
            </div>
          </header>

          <section className="preorder-report-filters">
            <div><span>Vendedor</span><strong>{seller}</strong></div>
            <div><span>Desde</span><strong>{from || "Inicio"}</strong></div>
            <div><span>Hasta</span><strong>{to || "Hoy"}</strong></div>
            <div><span>Tipo de reporte</span><strong>Comercial</strong></div>
          </section>

          <section className="preorder-report-summary">
            <div><span>Registros</span><strong>{rows.length}</strong><small>Preventas incluidas</small></div>
            <div><span>Total vendido</span><strong>{formatGTQ(total)}</strong><small>Monto acumulado</small></div>
            <div><span>Ticket promedio</span><strong>{formatGTQ(total / Math.max(rows.length, 1))}</strong><small>Promedio por venta</small></div>
            <div><span>Vendedores</span><strong>{sellerSummary.length}</strong><small>Con actividad</small></div>
          </section>

          <section className="preorder-report-grid">
            <div className="preorder-report-card">
              <h2>Resumen por vendedor</h2>
              <table>
                <thead><tr><th>Vendedor</th><th>Ventas</th><th>Total</th></tr></thead>
                <tbody>
                  {sellerSummary.map((row) => <tr key={row.seller}><td>{row.seller}</td><td>{row.count}</td><td>{formatGTQ(row.total)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="preorder-report-card">
              <h2>Distribucion comercial</h2>
              <div className="preorder-report-bars">
                {sellerSummary.map((row) => (
                  <div key={row.seller}>
                    <p><span>{row.seller}</span><strong>{formatGTQ(row.total)}</strong></p>
                    <i style={{ width: `${Math.max(8, (row.total / Math.max(total, 1)) * 100)}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="preorder-report-detail-grid">
            <div className="preorder-report-table">
              <h2>Detalle de preventas</h2>
              <table>
                <thead><tr><th>Codigo</th><th>Cliente</th><th>Vendedor</th><th>Bodega</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.code}><td>{row.code}</td><td>{row.client}</td><td>{row.seller}</td><td>{row.warehouse}</td><td>{row.date}</td><td>{row.status.label}</td><td>{row.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="preorder-report-table">
              <h2>Productos incluidos</h2>
              <table>
                <thead><tr><th>Preventa</th><th>Producto</th><th>Color</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {productRows.map((item) => (
                    <tr key={item.key}><td>{item.code}</td><td>{item.product}</td><td>{item.color}</td><td>{item.quantity}</td><td>{item.subtotal}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer>Generado automaticamente por el sistema de inventario empresarial</footer>
        </article>
      </div>
    </>
  );
}

function formatGTQ(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildSellerSummary(rows: PreorderRow[]) {
  const map = new Map<string, { seller: string; count: number; total: number }>();
  for (const row of rows) {
    const current = map.get(row.seller) || { seller: row.seller, count: 0, total: 0 };
    current.count += 1;
    current.total += row.totalNumber;
    map.set(row.seller, current);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
