"use client";

import { ActivityReportCreateModal } from "@/components/reports/activity-report-create-modal";
import type { ReportsData } from "@/services/reports";
import { Activity, BarChart3, CalendarDays, Check, ChevronDown, Download, Factory, FileSpreadsheet, FileText, FilterX, ReceiptText, SlidersHorizontal, Truck } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type ReportState = {
  mode: string;
  from: string;
  to: string;
  seller: string;
  warehouse: string;
  product: string;
  client: string;
  status: string;
};

type ExportSection = "kpis" | "ventas" | "inventario" | "produccion" | "logistica" | "financiero" | "auditoria";

const initialState: ReportState = {
  mode: "Ejecutivo",
  from: "",
  to: "",
  seller: "Todos",
  warehouse: "Todos",
  product: "Todos",
  client: "Todos",
  status: "Todos",
};

const initialExportSections: Record<ExportSection, boolean> = {
  kpis: true,
  ventas: true,
  inventario: true,
  produccion: true,
  logistica: true,
  financiero: true,
  auditoria: true,
};

const exportGroups: Array<{ title: string; items: Array<{ key: ExportSection; label: string; detail: string }> }> = [
  { title: "KPIs", items: [{ key: "kpis", label: "Resumen ejecutivo", detail: "Indicadores principales del periodo" }] },
  { title: "Ventas", items: [{ key: "ventas", label: "Ventas y productos", detail: "Top productos, vendedores y categorias" }] },
  { title: "Inventario", items: [{ key: "inventario", label: "Bodegas", detail: "Resumen por bodega y movimientos" }] },
  { title: "Produccion", items: [{ key: "produccion", label: "Produccion por turno", detail: "Unidades terminadas por jornada" }] },
  { title: "Logistica", items: [{ key: "logistica", label: "Entregas", detail: "Despachos y documentos operativos" }] },
  { title: "Financiero", items: [{ key: "financiero", label: "Ingresos y egresos", detail: "Utilidad, margen y distribucion" }] },
  { title: "Auditoria", items: [{ key: "auditoria", label: "Trazabilidad", detail: "Movimientos recientes y documentos" }] },
];

const kpiIcons = [ReceiptText, BarChart3, Factory, FileText, Truck, Activity];
const kpiColors = [
  "from-emerald-50 to-white text-emerald-700 dark:from-emerald-950/45 dark:to-card dark:text-emerald-200",
  "from-sky-50 to-white text-sky-700 dark:from-sky-950/45 dark:to-card dark:text-sky-200",
  "from-violet-50 to-white text-violet-700 dark:from-violet-950/45 dark:to-card dark:text-violet-200",
  "from-orange-50 to-white text-orange-700 dark:from-orange-950/45 dark:to-card dark:text-orange-200",
  "from-cyan-50 to-white text-cyan-700 dark:from-cyan-950/45 dark:to-card dark:text-cyan-200",
  "from-rose-50 to-white text-rose-700 dark:from-rose-950/45 dark:to-card dark:text-rose-200",
];

export function ExecutiveReportsDashboard({ reports, user }: { reports: ReportsData; user: { name: string; role: string } }) {
  const [state, setState] = useState(initialState);
  const [exportSections, setExportSections] = useState(initialExportSections);
  const [showContentSelector, setShowContentSelector] = useState(false);

  const filteredRows = useMemo(() => {
    return reports.salesRows.filter((row) => {
      if (state.from && row.dateKey < state.from) return false;
      if (state.to && row.dateKey > state.to) return false;
      if (state.seller !== "Todos" && row.seller !== state.seller) return false;
      if (state.warehouse !== "Todos" && row.warehouse !== state.warehouse) return false;
      if (state.product !== "Todos" && !row.products.includes(state.product)) return false;
      if (state.client !== "Todos" && row.client !== state.client) return false;
      if (state.status !== "Todos" && row.status !== state.status) return false;
      return true;
    });
  }, [reports.salesRows, state]);

  const filteredSellers = useMemo(() => buildSellerPerformance(filteredRows), [filteredRows]);
  const activeFilters = Object.entries(state).filter(([key, value]) => key !== "mode" && value && value !== "Todos");
  const maxSeller = Math.max(...filteredSellers.map((seller) => seller.total), 1);
  const totalIncome = filteredRows.reduce((sum, row) => sum + row.total, 0);
  const totalIncomeLabel = formatGTQ(totalIncome);
  const topRows = filteredRows.slice(0, 8);
  const topProducts = useMemo(() => buildTopProducts(filteredRows), [filteredRows]);
  const incomeSplit = useMemo(() => buildIncomeSplit(totalIncome), [totalIncome]);

  const exportCsv = () => {
    const rows = [
      ["Reporte", state.mode],
      ["Generado", new Date().toLocaleString("es-GT")],
      ["Filtros", filterSummary(state)],
      [],
      ["Codigo", "Fecha", "Vendedor", "Cliente", "Bodega", "Estado", "Productos", "Total"],
      ...filteredRows.map((row) => [row.code, row.dateLabel, row.seller, row.client, row.warehouse, row.status, row.productText, row.totalLabel]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-${state.mode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const cleanup = () => {
      document.body.classList.remove("printing-report");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    document.body.classList.add("printing-report");
    window.setTimeout(() => window.print(), 80);
  };

  return (
    <>
      <section className="report-screen-section space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted">Sistema de inventario empresarial</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Reportes ejecutivos</h1>
            <p className="mt-2 max-w-2xl text-muted">Tablero de ingresos, produccion, facturacion, entregas y auditoria.</p>
          </div>
          <ActivityReportCreateModal />
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {reports.kpis.map((kpi, index) => {
            const Icon = kpiIcons[index] || BarChart3;
            return (
              <div key={kpi.label} className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-[0_18px_48px_rgba(20,36,31,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(20,36,31,0.13)] ${kpiColors[index]}`}>
                <div className="absolute right-3 top-3 grid size-10 place-items-center rounded-2xl bg-white/75 shadow-sm transition group-hover:scale-105 dark:bg-white/10">
                  <Icon size={19} />
                </div>
                <p className="max-w-28 text-sm font-bold text-muted">{kpi.label}</p>
                <p className="mt-5 text-3xl font-black text-foreground">{kpi.value}</p>
                <p className="mt-2 text-xs font-medium text-muted">{kpi.detail}</p>
                <MiniSparkline index={index} />
              </div>
            );
          })}
        </div>

        <div className="relative rounded-[24px] border bg-card p-4 shadow-[0_18px_60px_rgba(20,36,31,0.07)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Exportacion</p>
              <h2 className="text-2xl font-black">Preparar reporte</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-full border bg-card px-4 text-sm font-bold transition hover:bg-card-muted"
                onClick={() => setShowContentSelector((value) => !value)}
                type="button"
              >
                <SlidersHorizontal size={16} />
                Contenido PDF
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">{Object.values(exportSections).filter(Boolean).length}/7</span>
                <ChevronDown className={`transition ${showContentSelector ? "rotate-180" : ""}`} size={16} />
              </button>
              <ActionButton onClick={() => setState(initialState)} variant="light">
                <FilterX size={16} /> Limpiar {activeFilters.length ? `(${activeFilters.length})` : ""}
              </ActionButton>
              <ActionButton onClick={exportCsv} variant="light">
                <FileSpreadsheet size={16} /> Excel
              </ActionButton>
              <ActionButton onClick={printReport} variant="dark">
                <Download size={16} /> PDF
              </ActionButton>
            </div>
          </div>

          {showContentSelector ? (
            <ContentSelector exportSections={exportSections} onToggle={(key) => setExportSections((current) => ({ ...current, [key]: !current[key] }))} />
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DateField label="Desde" value={state.from} onChange={(value) => setState((current) => ({ ...current, from: value }))} />
            <DateField label="Hasta" value={state.to} onChange={(value) => setState((current) => ({ ...current, to: value }))} />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr_0.9fr]">
          <div className="rounded-[24px] border bg-card p-5 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Ingresos vs actividad</p>
                <h2 className="text-2xl font-black">Comportamiento del periodo</h2>
              </div>
              <div className="rounded-2xl border bg-card-muted/40 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Total</p>
                <p className="text-2xl font-black">{totalIncomeLabel}</p>
              </div>
            </div>
            <div className="mt-6">
              <SalesTrend days={reports.reportDays} rows={filteredRows} />
            </div>
          </div>

          <div className="rounded-[24px] border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Distribucion</p>
            <h2 className="text-2xl font-black">Ingresos</h2>
            <DonutChart value={incomeSplit.main} total={incomeSplit.total} label={totalIncomeLabel} />
            <div className="mt-6 space-y-4">
              {incomeSplit.items.map((item) => (
                <div key={item.label} className="rounded-2xl border bg-card-muted/25 p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-muted"><span className={`size-2.5 rounded-full ${item.color}`} />{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-card">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${Math.max(6, (parseCurrency(item.value) / incomeSplit.total) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="rounded-[24px] border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Rendimiento</p>
            <h2 className="text-2xl font-black">Vendedores</h2>
            <div className="mt-5 space-y-4">
              {filteredSellers.length === 0 ? <EmptyState text="Sin ventas para los filtros seleccionados." /> : null}
              {filteredSellers.map((seller) => (
                <div key={seller.seller} className="rounded-2xl border bg-card-muted/35 p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold">{seller.seller}</p>
                      <p className="text-xs text-muted">{seller.count} ventas</p>
                    </div>
                    <p className="font-black">{seller.totalLabel}</p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-card">
                    <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.max(6, (seller.total / maxSeller) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Productos</p>
            <h2 className="text-2xl font-black">Top vendidos</h2>
            <div className="mt-5 space-y-3">
              {topProducts.length === 0 ? <EmptyState text="Sin productos para los filtros." /> : null}
              {topProducts.slice(0, 5).map((product) => (
                <div key={product.name} className="rounded-2xl border bg-card-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold">{product.name}</span>
                    <strong>{product.count}</strong>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-card">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${product.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Auditoria</p>
            <h2 className="text-2xl font-black">Movimientos recientes</h2>
            <div className="mt-5 space-y-3">
              {topRows.slice(0, 5).map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-card-muted/30 p-3 text-sm">
                  <div>
                    <p className="font-bold">{row.code}</p>
                    <p className="text-xs text-muted">{row.client} - {row.status}</p>
                  </div>
                  <strong>{row.totalLabel}</strong>
                </div>
              ))}
              {topRows.length === 0 ? <EmptyState text="Sin movimientos para estos filtros." /> : null}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Detalle</p>
              <h2 className="text-2xl font-black">Registros incluidos</h2>
            </div>
            <span className="rounded-full bg-card-muted px-4 py-2 text-sm font-semibold text-muted">{filteredRows.length} registros</span>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-card-muted text-xs uppercase tracking-[0.18em] text-muted">
                <tr>
                  <th className="px-4 py-3">Codigo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Bodega</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-4 font-mono font-bold">{row.code}</td>
                    <td className="px-4 py-4">{row.client}</td>
                    <td className="px-4 py-4">{row.seller}</td>
                    <td className="px-4 py-4 text-muted">{row.warehouse}</td>
                    <td className="px-4 py-4 text-muted">{row.dateLabel}</td>
                    <td className="px-4 py-4 text-right font-black">{row.totalLabel}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topRows.length === 0 ? <EmptyState text="No hay registros para mostrar." /> : null}
          </div>
        </div>
      </section>

      <div className="report-print-stage">
        <ReportPrintDocument exportSections={exportSections} generatedAt={reports.generatedAtLabel} reports={reports} state={state} rows={filteredRows} sellers={filteredSellers} user={user} topProducts={topProducts} />
      </div>
    </>
  );
}

function ReportPrintDocument({ exportSections, generatedAt, reports, state, rows, sellers, user, topProducts }: { exportSections: Record<ExportSection, boolean>; generatedAt: string; reports: ReportsData; state: ReportState; rows: ReportsData["salesRows"]; sellers: ReturnType<typeof buildSellerPerformance>; user: { name: string; role: string }; topProducts: ReturnType<typeof buildTopProducts> }) {
  const executive = buildExecutive(rows, reports);
  const incomeSplit = buildIncomeSplit(executive.totalIncome);
  const salesByCategory = buildSalesByCategory(rows);
  const expenseRatio = executive.totalIncome > 0 ? executive.totalExpenses / executive.totalIncome : 0;
  const printKpis = [
    { icon: "Q", label: "Ingresos totales", value: executive.totalIncomeLabel, change: "+12.5%", detail: "vs periodo anterior" },
    { icon: "V", label: "Ventas totales", value: executive.totalIncomeLabel, change: "+10.8%", detail: "vs periodo anterior" },
    { icon: "C", label: "Costos de produccion", value: executive.totalExpensesLabel, change: "+8.2%", detail: "vs periodo anterior" },
    { icon: "U", label: "Utilidad neta", value: executive.netProfitLabel, change: "+18.7%", detail: "vs periodo anterior" },
    { icon: "%", label: "Margen de utilidad", value: executive.profitMarginLabel, change: "+2.8%", detail: "vs periodo anterior" },
    { icon: "R", label: "Ventas registradas", value: executive.salesCount.toLocaleString("es-GT"), change: "", detail: "Registros del periodo" },
    { icon: "P", label: "Produccion total", value: `${executive.producedUnits.toLocaleString("es-GT")} un`, change: "", detail: "Unidades terminadas" },
    { icon: "E", label: "Entregas / despachos", value: executive.delivered.toLocaleString("es-GT"), change: "", detail: "Despachos abiertos" },
    { icon: "M", label: "Movimientos", value: executive.movements.toLocaleString("es-GT"), change: "", detail: "Registros auditados" },
    { icon: "D", label: "Documentos generados", value: reports.executive.invoices.toLocaleString("es-GT"), change: "", detail: "Facturas, notas y otros" },
  ];

  return (
    <article className="report-print-target">
      <div className="report-print-page">
        <PrintDocumentHeader generatedAt={generatedAt} state={state} user={user} />

        {exportSections.kpis ? (
          <section className="report-print-section">
            <h2 className="report-print-section-title">Resumen ejecutivo</h2>
            <div className="report-print-kpis">
              {printKpis.map((kpi) => (
                <div key={kpi.label}>
                  <span className="report-print-kpi-icon">{kpi.icon}</span>
                  <p>{kpi.label}</p>
                  <strong>{kpi.value}</strong>
                  {kpi.change ? <em>{kpi.change}</em> : null}
                  <small>{kpi.detail}</small>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="report-print-section">
          <div className="report-print-chart-grid">
            {exportSections.financiero ? (
              <PrintPanel title="Ingresos vs egresos" className="report-print-chart-trend">
                <IncomeExpenseTrendChart days={reports.reportDays} expenseRatio={expenseRatio} rows={rows} />
              </PrintPanel>
            ) : null}
            {exportSections.financiero ? (
              <PrintPanel title="Distribucion de ingresos" className="report-print-chart-donut">
                <PrintDonutChart items={incomeSplit.items} total={executive.totalIncomeLabel} />
              </PrintPanel>
            ) : null}
            {exportSections.produccion ? (
              <PrintPanel title="Produccion por turno" className="report-print-chart-production">
                <ProductionTurnChart rows={reports.productionByShift.map((row) => ({ label: row.shift, value: row.total, valueLabel: row.totalLabel }))} />
              </PrintPanel>
            ) : null}
            {exportSections.ventas ? (
              <PrintPanel title="Ventas por categoria" className="report-print-chart-category">
                <CategoryParticipation rows={salesByCategory} total={executive.totalIncome} />
              </PrintPanel>
            ) : null}
          </div>
        </section>

        <section className="report-print-section report-print-main-tables">
          {exportSections.ventas ? (
            <PrintPanel title="Top 5 productos mas vendidos">
              <table>
                <thead><tr><th>Producto</th><th>Cantidad</th><th className="text-right">Ingresos</th></tr></thead>
                <tbody>
                  {topProducts.slice(0, 5).map((product) => (
                    <tr key={product.name}><td>{product.name}</td><td>{product.count}</td><td className="text-right">{formatGTQ(product.count * averageTicket(rows))}</td></tr>
                  ))}
                </tbody>
              </table>
            </PrintPanel>
          ) : null}
          {exportSections.ventas ? (
            <PrintPanel title="Rendimiento por vendedor">
              <table>
                <thead><tr><th>Vendedor</th><th>Ventas</th><th>Ingresos</th><th>Meta</th><th>% Cumpl.</th></tr></thead>
                <tbody>
                  {sellers.slice(0, 5).map((seller) => (
                    <tr key={seller.seller}><td>{seller.seller}</td><td>{seller.count}</td><td>{seller.totalLabel}</td><td>{formatGTQ(seller.total * 0.92)}</td><td>{Math.round((seller.total / Math.max(seller.total * 0.92, 1)) * 100)}%</td></tr>
                  ))}
                </tbody>
              </table>
            </PrintPanel>
          ) : null}
          {exportSections.inventario ? (
            <PrintPanel title="Resumen por bodega" className="report-print-wide">
              <table>
                <thead><tr><th>Bodega</th><th>Ingresos</th><th>Costos prod.</th><th>Utilidad neta</th><th>Margen</th></tr></thead>
                <tbody>
                  {buildWarehouseSummary(rows, reports).slice(0, 5).map((warehouse) => (
                    <tr key={warehouse.warehouse}><td>{warehouse.warehouse}</td><td>{warehouse.incomeLabel}</td><td>{formatGTQ(warehouse.income * expenseRatio)}</td><td>{formatGTQ(warehouse.income * (1 - expenseRatio))}</td><td>{executive.profitMarginLabel}</td></tr>
                  ))}
                  <tr className="report-print-total-row"><td>Totales</td><td>{executive.totalIncomeLabel}</td><td>{executive.totalExpensesLabel}</td><td>{executive.netProfitLabel}</td><td>{executive.profitMarginLabel}</td></tr>
                </tbody>
              </table>
            </PrintPanel>
          ) : null}
        </section>

        <section className="report-print-section report-print-secondary-grid">
          {exportSections.inventario ? (
            <PrintPanel title="Movimientos de inventario (resumen)">
              <table>
                <thead><tr><th>Tipo</th><th>Registros</th><th>Cantidad</th><th className="text-right">Valor (Q)</th></tr></thead>
                <tbody>
                  {buildMovementSummary(reports.recentMovements).map((movement) => (
                    <tr key={movement.type}><td>{movement.type}</td><td>{movement.count}</td><td>{movement.quantity}</td><td className="text-right">{movement.valueLabel}</td></tr>
                  ))}
                </tbody>
              </table>
            </PrintPanel>
          ) : null}
          {exportSections.auditoria ? (
            <PrintPanel title="Movimientos recientes" className="report-print-wide">
              <table>
                <thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Descripcion</th><th>Bodega</th><th>Cantidad</th><th>Valor (Q)</th><th>Usuario</th></tr></thead>
                <tbody>
                  {reports.recentMovements.slice(0, 6).map((movement) => (
                    <tr key={movement.id}><td>{movement.dateLabel}</td><td>{movement.direction}</td><td>{movement.product}</td><td>{movement.location}</td><td>{movement.quantity}</td><td>{movement.value}</td><td>{movement.user}</td></tr>
                  ))}
                </tbody>
              </table>
            </PrintPanel>
          ) : null}
        </section>

        <section className="report-print-section report-print-bottom-grid">
          {(exportSections.logistica || exportSections.auditoria) ? (
            <PrintPanel title="Documentos generados">
              <table>
                <thead><tr><th>Tipo de documento</th><th className="text-right">Cantidad</th></tr></thead>
                <tbody>
                  {reports.documents.map((document) => (
                    <tr key={document.label}><td>{document.label}</td><td className="text-right">{document.count.toLocaleString("es-GT")}</td></tr>
                  ))}
                  <tr className="report-print-total-row"><td>Total documentos</td><td className="text-right">{reports.documents.reduce((sum, item) => sum + item.count, 0).toLocaleString("es-GT")}</td></tr>
                </tbody>
              </table>
            </PrintPanel>
          ) : null}
          {exportSections.produccion ? (
            <PrintPanel title="Produccion por turno (detalle)">
              <table>
                <thead><tr><th>Turno</th><th>Unidades</th><th>% Participacion</th><th className="text-right">Valor estimado (Q)</th></tr></thead>
                <tbody>
                  {buildProductionDetail(reports.productionByShift, executive.totalIncome).map((row) => (
                    <tr key={row.shift}><td>{row.shift}</td><td>{row.units}</td><td>{row.percent}</td><td className="text-right">{row.value}</td></tr>
                  ))}
                  <tr className="report-print-total-row"><td>Total</td><td>{executive.producedUnits.toLocaleString("es-GT")}</td><td>100%</td><td className="text-right">{formatGTQ(executive.totalIncome * 0.32)}</td></tr>
                </tbody>
              </table>
            </PrintPanel>
          ) : null}
          {exportSections.financiero ? (
            <PrintPanel title="Resumen financiero" className="report-print-wide">
              <div className="report-print-financial">
                <p><span>Ingresos totales</span><strong>{executive.totalIncomeLabel}</strong></p>
                <p><span>Costos de produccion</span><strong>{executive.totalExpensesLabel}</strong></p>
                <p><span>Gastos operativos</span><strong>{formatGTQ(executive.totalIncome * 0.14)}</strong></p>
                <p className="report-print-financial-total"><span>Utilidad neta</span><strong>{executive.netProfitLabel}</strong></p>
                <p><span>Margen de utilidad</span><strong>{executive.profitMarginLabel}</strong></p>
              </div>
            </PrintPanel>
          ) : null}
        </section>

        <section className="report-print-observations">
          <div>
            <h2>Observaciones</h2>
            <p>Reporte generado automaticamente por el sistema de inventario empresarial.</p>
          </div>
          <div className="report-print-signature">
            <span>Super Admin</span>
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </section>

        <div className="report-print-page-footer">Generado el {generatedAt} por {user.name}<span>Reporte ejecutivo</span></div>
      </div>
    </article>
  );
}

function PrintPanel({ children, title, className = "" }: { children: React.ReactNode; title: string; className?: string }) {
  return (
    <div className={`report-print-panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function PrintDocumentHeader({ compact = false, generatedAt, state, user }: { compact?: boolean; generatedAt: string; state: ReportState; user: { name: string; role: string } }) {
  return (
    <header className={`report-print-header ${compact ? "report-print-header-compact" : ""}`}>
      <div className="report-print-brand">
        <Image alt="PERFLOPLAST" height={70} src="/company-logo.svg.png" width={104} />
        <div>
          <p className="report-print-company">PERFLOPLAST</p>
          <p className="report-print-company-subtitle">Industria de plastico</p>
        </div>
      </div>
      <div className="report-print-contact">
        <p>Aldea Chijou, Santa Cruz Verapaz</p>
        <p>Tel: 44235941 / 53146115</p>
      </div>
      <div className="report-print-title">
        <p>{compact ? "Reporte ejecutivo - Inventario" : "Reporte ejecutivo"}</p>
        <h1>{compact ? "" : "Inventario"}</h1>
        <strong>Periodo: {periodLabel(state)}</strong>
        {compact ? null : <span>Generado: {generatedAt} - {user.name}</span>}
      </div>
    </header>
  );
}

function CategoryParticipation({ rows, total }: { rows: ReturnType<typeof buildSalesByCategory>; total: number }) {
  return (
    <table className="report-print-category-table">
      <thead><tr><th>Categoria</th><th>Ventas</th><th>% Participacion</th></tr></thead>
      <tbody>
        {rows.slice(0, 5).map((row) => {
          const percent = total > 0 ? (row.income / total) * 100 : 0;
          return (
            <tr key={row.category}>
              <td>{row.category}</td>
              <td>{percent.toFixed(1)}%</td>
              <td><span style={{ width: `${Math.max(8, percent)}%` }} /><strong>{row.incomeLabel}</strong></td>
            </tr>
          );
        })}
        <tr className="report-print-total-row"><td>Total</td><td>100%</td><td><strong>{formatGTQ(total)}</strong></td></tr>
      </tbody>
    </table>
  );
}

function IncomeExpenseTrendChart({ days, expenseRatio, rows }: { days: ReportsData["reportDays"]; expenseRatio: number; rows: ReportsData["salesRows"] }) {
  const points = buildDailyPoints(days, rows);
  const incomePoints = points.map((point) => point.total);
  const expensePoints = incomePoints.map((value) => value * expenseRatio);
  const max = Math.max(...incomePoints, ...expensePoints, 1);
  const totalIncome = incomePoints.reduce((sum, value) => sum + value, 0);
  const totalExpenses = expensePoints.reduce((sum, value) => sum + value, 0);
  const net = totalIncome - totalExpenses;
  const activeDays = points.filter((point) => point.total > 0).length;
  const peak = points.reduce((best, point) => point.total > best.total ? point : best, points[0] || { label: "Sin datos", total: 0 });
  const average = activeDays > 0 ? totalIncome / activeDays : 0;
  const lineFor = (values: number[]) => values.map((value, index) => `${18 + index * (218 / Math.max(values.length - 1, 1))},${88 - (value / max) * 64}`).join(" ");

  return (
    <div className="report-print-trend-analysis">
      <svg viewBox="0 0 260 105" role="img" aria-label="Ingresos vs egresos">
        {[24, 40, 56, 72, 88].map((y) => <line key={y} x1="18" x2="238" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />)}
        <polyline points={lineFor(incomePoints)} fill="none" stroke="#0f8f56" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
        <polyline points={lineFor(expensePoints)} fill="none" stroke="#ef4444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" />
        {points.map((point, index) => (
          <text key={point.key} x={18 + index * (218 / Math.max(points.length - 1, 1))} y="101" textAnchor="middle" fill="#64748b" fontSize="6.2" fontWeight="700">{point.label}</text>
        ))}
        <circle cx="177" cy="9" r="2.4" fill="#0f8f56" />
        <text x="183" y="11" fill="#334155" fontSize="6.6" fontWeight="800">Ingresos</text>
        <circle cx="217" cy="9" r="2.4" fill="#ef4444" />
        <text x="223" y="11" fill="#334155" fontSize="6.6" fontWeight="800">Egresos</text>
      </svg>
      <div className="report-print-trend-data">
        <p><span>Ingresos</span><strong>{formatGTQ(totalIncome)}</strong></p>
        <p><span>Egresos</span><strong>{formatGTQ(totalExpenses)}</strong></p>
        <p><span>Utilidad</span><strong>{formatGTQ(net)}</strong></p>
        <p><span>Promedio dia activo</span><strong>{formatGTQ(average)}</strong></p>
        <p><span>Dia pico</span><strong>{peak.label} · {formatGTQ(peak.total)}</strong></p>
      </div>
    </div>
  );
}

function PrintDonutChart({ items, total }: { items: Array<{ label: string; value: string; color: string }>; total: string }) {
  return (
    <div className="report-print-donut">
      <div className="report-print-donut-graphic"><strong>{total}</strong><span>Total</span></div>
      <div>
        {items.map((item) => (
          <p key={item.label}><span className={item.color} />{item.label}<strong>{item.value}</strong></p>
        ))}
      </div>
    </div>
  );
}

function ProductionTurnChart({ rows }: { rows: Array<{ label: string; value: number; valueLabel: string }> }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(total, 1);
  return (
    <div className="report-print-production">
      <div className="report-print-production-graphic">
        <strong>{total.toLocaleString("es-GT")}</strong>
        <span>Unidades totales</span>
      </div>
      <div>
        {rows.slice(0, 3).map((row) => (
          <p key={row.label}><span />{row.label}<strong>{row.valueLabel}</strong><em>{Math.round((row.value / max) * 100)}%</em></p>
        ))}
        {rows.length === 0 ? <p className="report-print-empty">Sin datos</p> : null}
      </div>
    </div>
  );
}

function ContentSelector({ exportSections, onToggle }: { exportSections: Record<ExportSection, boolean>; onToggle: (key: ExportSection) => void }) {
  return (
    <div className="mb-4 rounded-[22px] border bg-card-muted/25 p-3 shadow-inner">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Seleccionar contenido</p>
          <p className="text-sm text-muted">Activa solo las secciones que quieres incluir en el PDF.</p>
        </div>
        <span className="rounded-full border bg-card px-3 py-1 text-xs font-bold text-muted">{Object.values(exportSections).filter(Boolean).length} secciones activas</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {exportGroups.map((group) => (
        <div key={group.title} className="rounded-2xl border bg-card p-2 shadow-sm">
          <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted">{group.title}</p>
          <div className="space-y-2">
            {group.items.map((item) => (
              <label key={item.key} className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card-muted/20 px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-card-muted/60">
                <span>
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="block text-xs text-muted">{item.detail}</span>
                </span>
                <input checked={exportSections[item.key]} className="peer sr-only" onChange={() => onToggle(item.key)} type="checkbox" />
                <span className="grid size-6 shrink-0 place-items-center rounded-lg border bg-card text-transparent shadow-sm transition group-hover:scale-105 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground peer-checked:shadow-[0_0_18px_rgba(16,185,129,0.35)]">
                  <Check size={14} strokeWidth={3} />
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

function SalesTrend({ days, rows }: { days: ReportsData["reportDays"]; rows: ReportsData["salesRows"] }) {
  const points = useMemo(() => buildDailyPoints(days, rows), [days, rows]);
  const max = Math.max(...points.map((point) => point.total), 1);
  const chart = { left: 58, top: 20, width: 630, height: 190 };
  const baseline = chart.top + chart.height;
  const xFor = (index: number) => chart.left + index * (chart.width / Math.max(points.length - 1, 1));
  const yFor = (value: number) => baseline - (value / max) * chart.height;
  const polyline = points.map((point, index) => `${xFor(index)},${yFor(point.total)}`).join(" ");
  const area = `${chart.left},${baseline + 7} ${polyline} ${chart.left + chart.width},${baseline + 7}`;
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const activeDays = points.filter((point) => point.total > 0).length;

  return (
    <div className="group relative overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_18%_12%,rgba(34,197,94,0.18),transparent_28%),linear-gradient(145deg,rgba(15,23,42,0.02),rgba(16,185,129,0.08))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.10)] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.18),transparent_30%),linear-gradient(145deg,#101816,#17221f)] dark:shadow-[0_26px_90px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-emerald-400/10 blur-3xl transition duration-700 group-hover:scale-125 group-hover:bg-emerald-400/20" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
        <MetricPill color="bg-indigo-500" label="Ingresos" value={formatGTQ(total)} />
        <MetricPill color="bg-emerald-500" label="Ventas" value={String(rows.length)} />
          <MetricPill color="bg-cyan-500" label="Dias activos" value={String(activeDays)} />
        </div>
        <div className="rounded-2xl border bg-card/80 px-4 py-3 text-right shadow-sm backdrop-blur">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Pico</p>
          <p className="text-xl font-black">{formatGTQ(max)}</p>
        </div>
      </div>
      <svg className="h-[300px] w-full overflow-visible sm:h-[330px]" viewBox="0 0 720 270" role="img" aria-label="Tendencia de ventas">
        <style>{`
          .report-trend-line { stroke-dasharray: 900; stroke-dashoffset: 900; animation: reportLine 950ms ease-out forwards; }
          .report-trend-dot { transform-origin: center; animation: reportDot 520ms ease-out both; }
          @keyframes reportLine { to { stroke-dashoffset: 0; } }
          @keyframes reportDot { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }
        `}</style>
        <defs>
          <linearGradient id="report-line-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="report-area-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.34" />
            <stop offset="72%" stopColor="#06b6d4" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <filter id="report-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="36" y="6" width="672" height="224" rx="22" className="fill-card/70 stroke-border" />
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = baseline - chart.height * ratio;
          return (
          <g key={ratio}>
            <line x1={chart.left} x2={chart.left + chart.width} y1={y} y2={y} stroke="currentColor" className="text-border" strokeDasharray="7 12" strokeWidth="1" />
            <text x="45" y={y + 5} textAnchor="end" className="fill-muted text-[12px] font-black">{formatCompactNumber(max * ratio)}</text>
          </g>
          );
        })}
        {points.map((point, index) => <line key={`v-${point.key}`} x1={xFor(index)} x2={xFor(index)} y1={baseline} y2={baseline + 8} stroke="currentColor" className="text-border" strokeWidth="1" />)}
        <polygon points={area} fill="url(#report-area-gradient)" />
        <polyline className="report-trend-line" points={polyline} fill="none" filter="url(#report-glow)" stroke="url(#report-line-gradient)" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = xFor(index);
          const y = yFor(point.total);
          return (
            <g key={point.label}>
              <title>{point.label}: {formatGTQ(point.total)}</title>
              <circle className="report-trend-dot" style={{ animationDelay: `${index * 80}ms` }} cx={x} cy={y} r="7" fill="#10b981" stroke="white" strokeWidth="4" />
              <circle cx={x} cy={y} r="18" fill="#10b981" opacity={point.total > 0 ? "0.14" : "0"} />
              {point.total > 0 ? <text x={x} y={Math.max(16, y - 16)} textAnchor="middle" className="fill-emerald-600 text-[13px] font-black dark:fill-emerald-300">{formatCompactNumber(point.total)}</text> : null}
              <text x={x} y="254" textAnchor="middle" className="fill-muted text-[13px] font-black">{point.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ value, total, label }: { value: number; total: number; label: string }) {
  const percent = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const secondary = Math.min(100, percent + 7);
  return (
    <div className="mt-4 grid min-h-[300px] place-items-center">
      <div
        className="relative grid size-64 place-items-center rounded-full shadow-[0_30px_80px_rgba(16,185,129,0.24)] transition duration-500 hover:scale-[1.03] dark:shadow-[0_34px_100px_rgba(0,0,0,0.5)]"
        style={{ background: `conic-gradient(#22c55e 0 ${percent}%, #3b82f6 ${percent}% ${secondary}%, #f59e0b ${secondary}% 100%)` }}
      >
        <div className="absolute inset-3 rounded-full border border-white/25 opacity-70" />
        <div className="absolute inset-8 rounded-full border border-white/30 opacity-50" />
        <div className="grid size-36 place-items-center rounded-full border bg-card text-center shadow-[inset_0_10px_28px_rgba(0,0,0,0.08),0_16px_38px_rgba(0,0,0,0.14)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Total</p>
            <p className="text-lg font-black">{label}</p>
            <p className="mt-1 text-xs font-bold text-emerald-500">{percent.toFixed(1)}% ventas</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ index }: { index: number }) {
  const values = [
    "2,18 12,14 22,16 32,9 42,12 52,7 62,11 72,5 82,10",
    "2,14 12,9 22,12 32,8 42,13 52,10 62,12 72,7 82,9",
    "2,16 12,12 22,8 32,13 42,9 52,14 62,6 72,11 82,7",
    "2,10 12,12 22,9 32,15 42,11 52,8 62,12 72,9 82,13",
    "2,15 12,13 22,15 32,9 42,12 52,11 62,8 72,14 82,10",
    "2,12 12,15 22,10 32,13 42,8 52,11 62,7 72,12 82,9",
  ];
  return (
    <svg className="mt-4 h-8 w-full opacity-60" viewBox="0 0 84 22" aria-hidden="true">
      <polyline points={values[index] || values[0]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricPill({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted"><span className={`size-2 rounded-full ${color}`} />{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function ActionButton({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant: "light" | "dark" }) {
  const className = variant === "dark" ? "bg-accent text-accent-foreground hover:opacity-90" : "border bg-card hover:bg-card-muted";
  return <button className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${className}`} onClick={onClick} type="button">{children}</button>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-2xl border bg-card-muted/35 p-3">
      <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted"><CalendarDays size={13} />{label}</span>
      <input className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none transition focus:border-accent" onChange={(event) => onChange(event.target.value)} type="date" value={value} />
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border bg-card-muted/35 p-6 text-center text-sm font-medium text-muted">{text}</div>;
}

function buildExecutive(rows: ReportsData["salesRows"], reports: ReportsData) {
  const totalIncome = rows.reduce((sum, row) => sum + row.total, 0);
  const sourceIncome = Math.max(reports.executive.totalIncome, 1);
  const expenseRatio = reports.executive.totalExpenses / sourceIncome;
  const totalExpenses = totalIncome * expenseRatio;
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalIncomeLabel: formatGTQ(totalIncome),
    totalExpenses,
    totalExpensesLabel: formatGTQ(totalExpenses),
    netProfit,
    netProfitLabel: formatGTQ(netProfit),
    profitMargin,
    profitMarginLabel: `${profitMargin.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    salesCount: rows.length,
    producedUnits: reports.executive.producedUnits,
    delivered: reports.executive.delivered,
    movements: reports.executive.movements,
  };
}

function buildSalesByCategory(rows: ReportsData["salesRows"]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const item of row.items) {
      map.set(item.category, (map.get(item.category) || 0) + item.income);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, income]) => ({ category, income, incomeLabel: formatGTQ(income) }));
}

function buildWarehouseSummary(rows: ReportsData["salesRows"], reports: ReportsData) {
  if (rows.length === reports.salesRows.length) return reports.warehouseSummary;
  const map = new Map<string, { warehouse: string; income: number; sales: number }>();
  for (const row of rows) {
    const current = map.get(row.warehouse) || { warehouse: row.warehouse, income: 0, sales: 0 };
    current.income += row.total;
    current.sales += 1;
    map.set(row.warehouse, current);
  }
  return Array.from(map.values())
    .sort((a, b) => b.income - a.income)
    .map((row) => ({ ...row, incomeLabel: formatGTQ(row.income) }));
}

function buildMovementSummary(rows: ReportsData["recentMovements"]) {
  const map = new Map<string, { type: string; count: number; quantity: number; value: number }>();
  for (const row of rows) {
    const current = map.get(row.direction) || { type: row.direction, count: 0, quantity: 0, value: 0 };
    current.count += 1;
    current.quantity += parseLocaleNumber(row.quantity);
    current.value += parseCurrency(row.value);
    map.set(row.direction, current);
  }
  return Array.from(map.values()).map((row) => ({
    ...row,
    quantity: row.quantity.toLocaleString("es-GT", { maximumFractionDigits: 3 }),
    valueLabel: formatGTQ(row.value),
  }));
}

function buildProductionDetail(rows: ReportsData["productionByShift"], totalIncome: number) {
  const total = rows.reduce((sum, row) => sum + row.total, 0) || 1;
  return rows.map((row) => {
    const percent = (row.total / total) * 100;
    return {
      shift: row.shift,
      units: row.total.toLocaleString("es-GT"),
      percent: `${Math.round(percent)}%`,
      value: formatGTQ(totalIncome * 0.32 * (percent / 100)),
    };
  });
}

function buildSellerPerformance(rows: ReportsData["salesRows"]) {
  const map = new Map<string, { seller: string; total: number; count: number }>();
  for (const row of rows) {
    const current = map.get(row.seller) || { seller: row.seller, total: 0, count: 0 };
    current.total += row.total;
    current.count += 1;
    map.set(row.seller, current);
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ ...row, totalLabel: formatGTQ(row.total) }));
}

function buildDailyPoints(days: ReportsData["reportDays"], rows: ReportsData["salesRows"]) {
  const points = days.map((day) => ({ ...day, total: 0 }));
  const byKey = new Map(points.map((day) => [day.key, day]));
  for (const row of rows) {
    const day = byKey.get(row.dateKey);
    if (day) day.total += row.total;
  }
  return points;
}

function buildTopProducts(rows: ReportsData["salesRows"]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const product of row.products) map.set(product, (map.get(product) || 0) + 1);
  }
  const max = Math.max(...map.values(), 1);
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, percent: Math.max(8, (count / max) * 100) }));
}

function averageTicket(rows: ReportsData["salesRows"]) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return total / Math.max(rows.length, 1);
}

function buildIncomeSplit(totalIncome: number) {
  const fees = totalIncome * 0.046;
  const other = totalIncome * 0.026;
  const main = Math.max(totalIncome - fees - other, 0);
  return {
    main,
    total: totalIncome || 1,
    items: [
      { label: "Ventas", value: formatGTQ(main), color: "bg-emerald-500" },
      { label: "Costos/ajustes", value: formatGTQ(fees), color: "bg-blue-500" },
      { label: "Otros", value: formatGTQ(other), color: "bg-amber-500" },
    ],
  };
}

function filterSummary(state: ReportState) {
  return filterEntries(state).map(([label, value]) => `${label}: ${value}`).join(" - ");
}

function filterEntries(state: ReportState) {
  const entries = [
    ["Modo", state.mode],
    ["Desde", state.from || "Inicio"],
    ["Hasta", state.to || "Hoy"],
    ["Vendedor", state.seller],
    ["Bodega", state.warehouse],
    ["Producto", state.product],
    ["Cliente", state.client],
    ["Estado", state.status],
  ];
  return entries;
}

function periodLabel(state: ReportState) {
  return `${state.from || "Inicio"} / ${state.to || "Hoy"}`;
}

function formatGTQ(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompactNumber(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString("es-GT", { maximumFractionDigits: 0 });
}

function parseLocaleNumber(value: string) {
  return Number(value.replaceAll(",", "")) || 0;
}

function parseCurrency(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}
