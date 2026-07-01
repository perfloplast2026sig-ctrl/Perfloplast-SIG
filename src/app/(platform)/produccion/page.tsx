import { PageHeading } from "@/components/layout/page-heading";
import { ProductionEntryForm } from "@/components/production/production-entry-form";
import { OperationalReportExport } from "@/components/reports/operational-report-export";
import { Badge } from "@/components/ui/badge";
import { AutoFilterForm } from "@/components/ui/auto-filter-form";
import { DataTable } from "@/components/ui/data-table";
import { RecordDetailButton } from "@/components/ui/record-detail-button";
import { SectionCard } from "@/components/ui/section-card";
import { TableActions } from "@/components/ui/table-actions";
import { requireCurrentUser } from "@/services/auth";
import { getProductionModuleData } from "@/services/production";
import { CalendarDays, Clock3, Factory, Warehouse } from "lucide-react";
import { redirect } from "next/navigation";

type ProductionSearchParams = {
  error?: string;
  created?: string;
  updated?: string;
  search?: string;
  responsible?: string;
  period?: string;
  rejected?: string;
  from?: string;
  to?: string;
};

export default async function ProductionPage({ searchParams }: { searchParams: Promise<ProductionSearchParams> }) {
  const params = await searchParams;
  const user = await requireCurrentUser();
  if (!["Super admin", "Administrador"].includes(user.role.name)) redirect("/inventario");
  const { products, warehouses, orders, nextCode, currentShift, currentShiftRange, currentDateTime, shiftSchedules, productionToday, productionMonth } = await getProductionModuleData();
  const canManageShiftSchedules = ["Super admin", "Administrador"].includes(user.role.name);
  const responsibleOptions = uniqueOptions(orders.map((order) => order.responsible));
  const filteredOrders = filterProductionRows(orders, params);
  const totalRejected = filteredOrders.reduce((sum, order) => sum + Number(order.rejectedQuantity || 0), 0);
  const registered = filteredOrders.filter((order) => order.status.label === "Registrada").length;
  const producedInFilter = filteredOrders.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
  const generatedAt = formatOperationalDate(new Date());

  return (
    <>
      <PageHeading
        title="Produccion"
        actions={<div className="page-action-group"><OperationalReportExport title="Produccion" subtitle="Ordenes de produccion registradas" generatedAt={generatedAt} generatedBy={user.name} metrics={[
          { label: "Produccion del dia", value: `${productionToday.toLocaleString("es-GT")} un`, detail: "Unidades de hoy" },
          { label: "Produccion del mes", value: `${productionMonth.toLocaleString("es-GT")} un`, detail: "Acumulado mensual" },
          { label: "Rechazos", value: `${totalRejected.toLocaleString("es-GT")} un`, detail: "Producto no aceptado" },
          { label: "Ordenes", value: String(filteredOrders.length), detail: `${registered} registradas` },
        ]} columns={[
          { key: "codigo", label: "Orden" },
          { key: "productos", label: "Productos" },
          { key: "bodega", label: "Bodega" },
          { key: "turno", label: "Turno" },
          { key: "cantidad", label: "Cantidad", align: "right" },
          { key: "rechazos", label: "Rechazos", align: "right" },
          { key: "responsable", label: "Responsable" },
          { key: "estado", label: "Estado" },
        ]} rows={filteredOrders.map((order) => ({
          codigo: order.code,
          productos: order.product,
          bodega: order.warehouse,
          turno: `${order.shift}\n${order.createdAt}`,
          cantidad: order.quantity,
          rechazos: order.rejectedQuantity,
          responsable: order.responsible,
          estado: order.status.label,
        }))} /><ProductionEntryForm products={products} warehouses={warehouses} nextCode={nextCode} currentShift={currentShift} currentShiftRange={currentShiftRange} currentDateTime={currentDateTime} shiftSchedules={shiftSchedules} canManageShiftSchedules={canManageShiftSchedules} /></div>}
      />

      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Produccion registrada y stock actualizado.</div> : null}
      {params.updated === "shifts" ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Turnos actualizados correctamente.</div> : null}
      {params.search ? <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm font-medium text-sky-700 dark:text-sky-300">Busqueda aplicada: {params.search}. Mostrando {filteredOrders.length} resultado(s).</div> : null}

      <ProductionFilters params={params} responsibleOptions={responsibleOptions} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MiniKpi label="Produccion del dia" value={`${productionToday.toLocaleString("es-GT")} un`} detail="Unidades de hoy" icon={Factory} tone="emerald" />
        <MiniKpi label="Produccion del mes" value={`${productionMonth.toLocaleString("es-GT")} un`} detail="Acumulado mensual" icon={CalendarDays} tone="sky" />
        <MiniKpi label="Turno actual" value={currentShift} detail={currentShiftRange} icon={Clock3} tone="violet" />
        <MiniKpi label="Rechazos" value={`${totalRejected.toLocaleString("es-GT")} un`} detail="Producto no aceptado" icon={Warehouse} tone="amber" />
      </div>

      {products.length === 0 ? <p className="mt-6 rounded-2xl border bg-card-muted/60 p-4 text-sm text-muted">Primero registra productos terminados en Inventario.</p> : null}

      <div className="mt-6">
        <SectionCard title="Ordenes registradas" eyebrow="Produccion y entrada a bodega" action={<div className="flex flex-wrap items-center gap-2"><Badge label={`${producedInFilter.toLocaleString("es-GT")} un filtradas`} tone="info" /><Badge label="Kardex automatico" tone="info" /></div>}>
          <DataTable
            data={filteredOrders}
            columns={[
              { header: "Orden", cell: (item) => <span className="font-mono text-xs font-semibold">{item.code}</span> },
              { header: "Productos", cell: (item) => <ProductSummary value={item.product} /> },
              { header: "Bodega", cell: (item) => item.warehouse },
              { header: "Turno", cell: (item) => <div><p>{item.shift}</p><p className="text-xs text-muted">{item.createdAt}</p></div> },
              { header: "Cantidad", align: "right", cell: (item) => <div className="text-right"><p className="font-semibold">{item.quantity}</p>{Number(item.rejectedQuantity) > 0 ? <p className="text-xs text-red-600 dark:text-red-300">Rech. {item.rejectedQuantity}</p> : null}</div> },
              { header: "Responsable", cell: (item) => <span className="text-muted">{item.responsible}</span> },
              { header: "Estado", cell: (item) => <Badge label={item.status.label} tone={item.status.tone} /> },
              { header: "Ver", align: "right", cell: (item) => <TableActions><RecordDetailButton detail={buildProductionDetail(item)} /></TableActions> },
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

function filterProductionRows(rows: Awaited<ReturnType<typeof getProductionModuleData>>["orders"], params: ProductionSearchParams) {
  const today = currentGuatemalaDateKey();
  const month = today.slice(0, 7);
  const term = normalizeSearch(params.search || "");
  const responsible = params.responsible || "Todos";
  const rejected = params.rejected || "Todos";
  const period = params.period || "Todos";

  return rows.filter((row) => {
    if (term && !normalizeSearch([row.code, row.product, row.warehouse, row.shift, row.schedule, row.quantity, row.rejectedQuantity, row.responsible, row.status.label].join(" ")).includes(term)) return false;
    if (responsible !== "Todos" && row.responsible !== responsible) return false;
    if (rejected === "Con rechazos" && Number(row.rejectedQuantity) <= 0) return false;
    if (rejected === "Sin rechazos" && Number(row.rejectedQuantity) > 0) return false;
    return matchesPeriod(row.dateKey, period, params.from, params.to, today, month);
  });
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function ProductSummary({ value }: { value: string }) {
  const lines = value.split("\n").filter(Boolean);
  return (
    <div className="max-w-[420px] space-y-1.5 whitespace-normal leading-tight">
      {lines.map((line, index) => <p key={`${line}-${index}`} className={index % 2 === 0 ? "font-semibold" : "text-xs text-muted"}>{line}</p>)}
    </div>
  );
}

function ProductionFilters({ params, responsibleOptions }: { params: ProductionSearchParams; responsibleOptions: string[] }) {
  return (
    <AutoFilterForm className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 shadow-sm sm:gap-3 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.85fr_0.85fr_0.9fr_auto] lg:items-end">
      <FilterInput label="Buscar" name="search" placeholder="Orden, producto, bodega..." defaultValue={params.search || ""} />
      <FilterSelect label="Responsable" name="responsible" defaultValue={params.responsible || "Todos"} options={["Todos", ...responsibleOptions]} />
      <FilterSelect label="Periodo" name="period" defaultValue={params.period || "Todos"} options={["Todos", "Hoy", "Mes", "Personalizado"]} />
      <FilterInput label="Desde" name="from" type="date" defaultValue={params.from || ""} />
      <FilterInput label="Hasta" name="to" type="date" defaultValue={params.to || ""} />
      <FilterSelect label="Rechazos" name="rejected" defaultValue={params.rejected || "Todos"} options={["Todos", "Con rechazos", "Sin rechazos"]} />
      <div className="col-span-2 flex gap-2 lg:col-span-1 lg:justify-end">
        <a className="inline-flex h-10 items-center justify-center rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" href="/produccion">Todos</a>
      </div>
    </AutoFilterForm>
  );
}

function FilterInput({ defaultValue, label, name, placeholder, type = "text" }: { defaultValue: string; label: string; name: string; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-muted">{label}</span>
      <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-accent" defaultValue={defaultValue} name={name} placeholder={placeholder} type={type} />
    </label>
  );
}

function FilterSelect({ defaultValue, label, name, options }: { defaultValue: string; label: string; name: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-muted">{label}</span>
      <select className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-accent" defaultValue={defaultValue} name={name}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function matchesPeriod(dateKey: string, period: string, from: string | undefined, to: string | undefined, today: string, month: string) {
  if (period === "Hoy") return dateKey === today;
  if (period === "Mes") return dateKey.startsWith(month);
  if (period === "Personalizado") {
    if (from && dateKey < from) return false;
    if (to && dateKey > to) return false;
  }
  return true;
}

function currentGuatemalaDateKey() {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone: "America/Guatemala" }).format(new Date());
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
          { label: "Buenos", value: item.quantity },
          { label: "Rechazados", value: item.rejectedQuantity },
          { label: "Responsable", value: item.responsible },
        ],
      },
    ],
    items: item.items.map((row) => ({
      title: row.product,
      subtitle: row.color,
      quantity: `Buenos ${row.quantity}`,
      total: Number(row.rejectedQuantity) > 0 ? `Rechazados ${row.rejectedQuantity}` : row.quantity,
    })),
  };
}
