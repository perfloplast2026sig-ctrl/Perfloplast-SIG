import { PageHeading } from "@/components/layout/page-heading";
import { ProductionEntryForm } from "@/components/production/production-entry-form";
import { OperationalReportExport } from "@/components/reports/operational-report-export";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { RecordDetailButton } from "@/components/ui/record-detail-button";
import { SectionCard } from "@/components/ui/section-card";
import { requireProductionManager } from "@/services/auth";
import { getProductionModuleData } from "@/services/production";
import { ClipboardList, Clock3, Factory, Warehouse } from "lucide-react";

export default async function ProductionPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; updated?: string; search?: string }> }) {
  const params = await searchParams;
  const user = await requireProductionManager();
  const { products, warehouses, orders, nextCode, currentShift, currentShiftRange, currentDateTime, shiftSchedules } = await getProductionModuleData();
  const totalProduced = orders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
  const registered = orders.filter((order) => order.status.label === "Registrada").length;
  const filteredOrders = filterRows(orders, params.search, (order) => [order.code, order.product, order.warehouse, order.shift, order.schedule, order.responsible, order.status.label]);
  const warehousesUsed = new Set(orders.map((order) => order.warehouse).filter(Boolean)).size;
  const generatedAt = formatOperationalDate(new Date());

  return (
    <>
      <PageHeading
        title="Produccion"
        actions={<div className="flex flex-wrap items-center gap-2"><OperationalReportExport title="Produccion" subtitle="Ordenes de produccion registradas" generatedAt={generatedAt} generatedBy={user.name} metrics={[
          { label: "Produccion total", value: `${totalProduced.toLocaleString("es-GT")} un`, detail: "Unidades registradas" },
          { label: "Ordenes", value: String(orders.length), detail: `${registered} registradas` },
          { label: "Turno actual", value: currentShift, detail: currentShiftRange },
          { label: "Bodegas destino", value: String(warehousesUsed), detail: "Con produccion reciente" },
        ]} columns={[
          { key: "codigo", label: "Orden" },
          { key: "productos", label: "Productos" },
          { key: "bodega", label: "Bodega" },
          { key: "turno", label: "Turno" },
          { key: "cantidad", label: "Cantidad", align: "right" },
          { key: "responsable", label: "Responsable" },
          { key: "estado", label: "Estado" },
        ]} rows={orders.map((order) => ({
          codigo: order.code,
          productos: order.product,
          bodega: order.warehouse,
          turno: `${order.shift} ${order.schedule}`,
          cantidad: order.quantity,
          responsable: order.responsible,
          estado: order.status.label,
        }))} /><ProductionEntryForm products={products} warehouses={warehouses} nextCode={nextCode} currentShift={currentShift} currentShiftRange={currentShiftRange} currentDateTime={currentDateTime} shiftSchedules={shiftSchedules} /></div>}
      />

      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Produccion registrada y stock actualizado.</div> : null}
      {params.updated === "shifts" ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Turnos actualizados correctamente.</div> : null}
      {params.search ? <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm font-medium text-sky-700 dark:text-sky-300">Busqueda aplicada: {params.search}. Mostrando {filteredOrders.length} resultado(s).</div> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MiniKpi label="Produccion total" value={`${totalProduced.toLocaleString("es-GT")} un`} detail="Unidades registradas" icon={Factory} tone="emerald" />
        <MiniKpi label="Ordenes" value={String(orders.length)} detail={`${registered} registradas`} icon={ClipboardList} tone="sky" />
        <MiniKpi label="Turno actual" value={currentShift} detail={currentShiftRange} icon={Clock3} tone="violet" />
        <MiniKpi label="Bodegas destino" value={String(warehousesUsed)} detail="Con produccion reciente" icon={Warehouse} tone="amber" />
      </div>

      {products.length === 0 ? <p className="mt-6 rounded-2xl border bg-card-muted/60 p-4 text-sm text-muted">Primero registra productos terminados en Inventario.</p> : null}

      <div className="mt-6">
        <SectionCard title="Ordenes registradas" eyebrow="Produccion y entrada a bodega" action={<Badge label="Kardex automatico" tone="info" />}>
          <DataTable
            data={filteredOrders}
            columns={[
              { header: "Orden", cell: (item) => <span className="font-mono text-xs font-semibold">{item.code}</span> },
              { header: "Productos", cell: (item) => <p className="max-w-[380px] whitespace-normal leading-6">{item.product}</p> },
              { header: "Bodega", cell: (item) => item.warehouse },
              { header: "Turno", cell: (item) => <div><p>{item.shift}</p><p className="text-xs text-muted">{item.schedule}</p></div> },
              { header: "Cantidad", align: "right", cell: (item) => <span className="font-semibold">{item.quantity}</span> },
              { header: "Responsable", cell: (item) => <span className="text-muted">{item.responsible}</span> },
              { header: "Estado", cell: (item) => <Badge label={item.status.label} tone={item.status.tone} /> },
              { header: "Ver", align: "right", cell: (item) => <RecordDetailButton detail={buildProductionDetail(item)} /> },
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}

function formatOperationalDate(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guatemala" }).format(date);
}

function filterRows<T>(rows: T[], query: string | undefined, fields: (row: T) => Array<string | number | null | undefined>) {
  const term = normalizeSearch(query || "");
  if (!term) return rows;
  return rows.filter((row) => normalizeSearch(fields(row).join(" ")).includes(term));
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function MiniKpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Factory; tone: "emerald" | "sky" | "violet" | "amber" }) {
  const tones = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 shadow-emerald-950/25",
    sky: "from-sky-500/20 to-sky-500/5 text-sky-300 shadow-sky-950/25",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-300 shadow-violet-950/25",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-300 shadow-amber-950/25",
  };
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3 shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-5 ${tones[tone]}`}>
      <div className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-2xl border bg-background/50 text-current shadow-sm transition duration-300 group-hover:scale-105 sm:right-4 sm:top-4 sm:size-11">
        <Icon size={16} />
      </div>
      <p className="pr-8 text-[11px] font-black uppercase leading-4 tracking-[0.12em] text-muted sm:pr-12 sm:text-xs sm:tracking-[0.16em]">{label}</p>
      <p className="mt-3 break-words text-xl font-black text-foreground sm:mt-4 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{detail}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10 sm:mt-5">
        <div className="h-full w-2/3 rounded-full bg-current opacity-70 transition-all duration-500 group-hover:w-full" />
      </div>
    </div>
  );
}

function buildProductionDetail(item: Awaited<ReturnType<typeof getProductionModuleData>>["orders"][number]) {
  return {
    title: item.code,
    subtitle: `${item.shift} - ${item.createdAt}`,
    badge: item.status.label,
    sections: [
      {
        title: "Orden",
        rows: [
          { label: "Codigo", value: item.code },
          { label: "Fecha", value: item.createdAt },
          { label: "Cierre", value: item.closedAt },
          { label: "Estado", value: item.status.label },
        ],
      },
      {
        title: "Produccion",
        rows: [
          { label: "Turno", value: item.shift },
          { label: "Horario", value: item.schedule },
          { label: "Bodega", value: item.warehouse },
          { label: "Cantidad", value: item.quantity },
          { label: "Responsable", value: item.responsible },
        ],
      },
    ],
    items: item.items.map((row) => ({
      title: row.product,
      subtitle: row.color,
      quantity: row.quantity,
      total: row.quantity,
    })),
  };
}
