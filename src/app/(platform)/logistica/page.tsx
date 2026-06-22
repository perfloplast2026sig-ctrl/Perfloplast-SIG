import { DispatchCreateModal } from "@/components/logistics/dispatch-create-modal";
import { DispatchStatusActions } from "@/components/logistics/dispatch-status-actions";
import { LogisticsLiveMaps } from "@/components/logistics/logistics-live-maps";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { OperationalReportExport } from "@/components/reports/operational-report-export";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { RecordDetailButton } from "@/components/ui/record-detail-button";
import { SectionCard } from "@/components/ui/section-card";
import { TableActions } from "@/components/ui/table-actions";
import { requireCurrentUser } from "@/services/auth";
import { getLogisticsModuleData } from "@/services/logistics";
import Link from "next/link";

type LogisticsSearchParams = {
  error?: string;
  created?: string;
  rejected?: string;
  cancelled?: string;
  search?: string;
  driver?: string;
  period?: string;
  from?: string;
  to?: string;
};

export default async function LogisticsPage({ searchParams }: { searchParams: Promise<LogisticsSearchParams> }) {
  const params = await searchParams;
  const user = await requireCurrentUser();
  if (user.role.name === "Vendedor") redirect("/preventas");
  if (!["Super admin", "Administrador", "Piloto", "Bodeguero"].includes(user.role.name)) redirect("/");
  const { preorders, drivers, dispatches, latestLocations, latestSellerLocations, deliveryMapOrders, warehouses } = await getLogisticsModuleData(user);
  const canSeeMap = ["Super admin", "Administrador"].includes(user.role.name);
  const canCreateDispatch = ["Super admin", "Administrador", "Bodeguero"].includes(user.role.name);
  const isDriver = user.role.name === "Piloto";
  const driverOptions = uniqueOptions(dispatches.map((dispatch) => dispatch.driver));
  const visibleDispatches = filterDispatchRows(dispatches, params);
  const driverOrders = deliveryMapOrders;
  const totalLoad = visibleDispatches.reduce((sum, dispatch) => sum + Number(dispatch.load.replace(/[^\d.-]/g, "") || 0), 0);
  const delivered = visibleDispatches.filter((dispatch) => dispatch.status.label === "Entregado").length;
  const active = visibleDispatches.filter((dispatch) => !["Entregado", "Cancelado"].includes(dispatch.status.label)).length;
  const generatedAt = formatOperationalDate(new Date());

  return (
    <>
      <PageHeading
        title="Logistica y despachos"
        actions={<><Link className="inline-flex h-11 items-center justify-center rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" href="/logistica/devoluciones">Ver devoluciones</Link><OperationalReportExport title="Logistica" subtitle="Despachos y rutas registradas" generatedAt={generatedAt} generatedBy={user.name} metrics={[
          { label: "Despachos", value: String(visibleDispatches.length), detail: "Registros incluidos" },
          { label: "Activos", value: String(active), detail: "Pendientes o en ruta" },
          { label: "Entregados", value: String(delivered), detail: "Cerrados correctamente" },
          { label: "Carga total", value: `${totalLoad.toLocaleString("es-GT")} un`, detail: "Unidades en despachos" },
        ]} columns={[
          { key: "codigo", label: "Despacho" },
          { key: "preventa", label: "Preventa" },
          { key: "cliente", label: "Cliente" },
          { key: "piloto", label: "Piloto" },
          { key: "destino", label: "Destino" },
          { key: "carga", label: "Carga", align: "right" },
          { key: "rechazos", label: "Rechazos" },
          { key: "valor", label: "Valor", align: "right" },
          { key: "estado", label: "Estado" },
        ]} rows={visibleDispatches.map((dispatch) => ({
          codigo: dispatch.code,
          preventa: dispatch.preorder,
          cliente: dispatch.client,
          piloto: dispatch.driver,
          destino: dispatch.destination,
          carga: dispatch.load,
          rechazos: dispatch.rejectedLoad,
          valor: dispatch.value,
          estado: dispatch.status.label,
        }))} />{canCreateDispatch ? <DispatchCreateModal preorders={preorders} drivers={drivers} warehouses={warehouses} /> : null}</>}
      />

      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Despacho creado correctamente.</div> : null}
      {params.rejected ? <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-300">Pedido rechazado en revision de bodega. No se envio al piloto.</div> : null}
      {params.cancelled ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Despacho anulado correctamente.</div> : null}
      {params.search ? <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm font-medium text-sky-700 dark:text-sky-300">Busqueda aplicada: {params.search}. Mostrando {visibleDispatches.length} resultado(s).</div> : null}

      <LogisticsFilters params={params} driverOptions={driverOptions} />

      <SectionCard title="Despachos" eyebrow="Rutas, piloto y valoracion">
        <DataTable
          data={visibleDispatches}
          columns={[
            { header: "Despacho", cell: (item) => <span className="font-mono text-xs font-semibold">{item.code}</span> },
            { header: "Preventa", cell: (item) => <div><p className="font-medium">{item.preorder}</p><p className="text-xs text-muted">{item.invoice}</p></div> },
            { header: "Cliente", cell: (item) => item.client },
            { header: "Piloto", cell: (item) => <span className="font-medium">{item.driver}</span> },
            { header: "Destino", cell: (item) => <span className="text-muted">{item.destination}</span> },
            { header: "Carga", align: "right", cell: (item) => <span className="font-semibold">{item.load}</span> },
            { header: "Rechazos", cell: (item) => item.rejectedLoad === "Sin rechazos" ? <span className="text-xs text-muted">Sin rechazos</span> : <span className="block max-w-52 whitespace-normal text-xs font-semibold text-red-600 dark:text-red-300">{item.rejectedLoad}</span> },
            { header: "Valor", align: "right", cell: (item) => <span className="font-semibold">{item.value}</span> },
            { header: "Estado", cell: (item) => <div><Badge label={item.status.label} tone={item.status.tone} />{item.latestReturnReason ? <p className="mt-1 max-w-44 truncate text-xs text-muted">{item.latestReturnReason}</p> : null}</div> },
            { header: "Accion", align: "right", cell: (item) => <TableActions><RecordDetailButton detail={buildDispatchDetail(item)} /><DispatchStatusActions dispatch={item} roleName={user.role.name} /></TableActions> },
          ]}
        />
      </SectionCard>

      <LogisticsLiveMaps canSeeMap={canSeeMap} initialData={{ latestLocations, latestSellerLocations, deliveryMapOrders: driverOrders }} isDriver={isDriver} />
    </>
  );
}

function formatOperationalDate(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guatemala" }).format(date);
}

function filterDispatchRows(rows: Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"], params: LogisticsSearchParams) {
  const today = currentGuatemalaDateKey();
  const month = today.slice(0, 7);
  const term = normalizeSearch(params.search || "");
  const driver = params.driver || "Todos";
  const period = params.period || "Todos";

  return rows.filter((row) => {
    if (term && !normalizeSearch([row.code, row.preorder, row.invoice, row.client, row.driver, row.destination, row.status.label, row.rejectedLoad].join(" ")).includes(term)) return false;
    if (driver !== "Todos" && row.driver !== driver) return false;
    return matchesPeriod(row.scheduledDateKey, period, params.from, params.to, today, month);
  });
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function LogisticsFilters({ params, driverOptions }: { params: LogisticsSearchParams; driverOptions: string[] }) {
  return (
    <form className="mb-6 grid gap-3 rounded-[24px] border bg-card p-4 shadow-sm lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.85fr_0.85fr_auto] lg:items-end" method="get">
      <FilterInput label="Buscar" name="search" placeholder="Despacho, cliente, destino..." defaultValue={params.search || ""} />
      <FilterSelect label="Piloto" name="driver" defaultValue={params.driver || "Todos"} options={["Todos", ...driverOptions]} />
      <FilterSelect label="Periodo" name="period" defaultValue={params.period || "Todos"} options={["Todos", "Hoy", "Mes", "Personalizado"]} />
      <FilterInput label="Desde" name="from" type="date" defaultValue={params.from || ""} />
      <FilterInput label="Hasta" name="to" type="date" defaultValue={params.to || ""} />
      <div className="flex gap-2">
        <a className="inline-flex h-10 items-center justify-center rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" href="/logistica">Todos</a>
        <button className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90" type="submit">Filtrar</button>
      </div>
    </form>
  );
}

function FilterInput({ defaultValue, label, name, placeholder, type = "text" }: { defaultValue: string; label: string; name: string; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</span>
      <input className="h-11 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-accent" defaultValue={defaultValue} name={name} placeholder={placeholder} type={type} />
    </label>
  );
}

function FilterSelect({ defaultValue, label, name, options }: { defaultValue: string; label: string; name: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</span>
      <select className="h-11 w-full rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-accent" defaultValue={defaultValue} name={name}>
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

function buildDispatchDetail(item: Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"][number]) {
  const audits = (item.auditTrail || []).map((log: DispatchAuditTrailEntry) => ({
    title: log.action,
    subtitle: `${log.user} - ${log.date}`,
    rows: [
      { label: "Motivo", value: log.reason },
      { label: "Usuario", value: log.user },
      { label: "Fecha", value: log.date },
      { label: "Estado previo", value: log.previousStatus },
      { label: "Inventario", value: log.inventoryEffect },
      { label: "Preventa", value: log.preorder },
    ],
  }));

  return {
    title: item.code,
    subtitle: `${item.client} - ${item.destination}`,
    badge: item.status.label,
    sections: [
      {
        title: "Despacho",
        rows: [
          { label: "Codigo", value: item.code },
          { label: "Preventa", value: item.preorder },
          { label: "Factura", value: item.invoice },
          { label: "Ruta", value: item.routeName || "Ruta directa" },
          { label: "Programado", value: item.scheduledAt },
          { label: "Entregado", value: item.deliveredAt },
        ],
      },
      {
        title: "Entrega",
        rows: [
          { label: "Cliente", value: item.client },
          { label: "NIT", value: item.taxId },
          { label: "Telefono", value: item.phone },
          { label: "Piloto", value: item.driver },
          { label: "Destino", value: item.destination },
          { label: "Rechazos", value: item.rejectedLoad },
          { label: "Valor", value: item.value },
          { label: "Estado", value: item.status.label },
        ],
      },
    ],
    audits,
    items: (item.items || []).map((row: DispatchDetailItem) => ({
      title: row.product,
      subtitle: row.color,
      quantity: row.quantity,
      total: row.quantity,
    })),
  };
}

type DispatchAuditTrailEntry = Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"][number]["auditTrail"][number];
type DispatchDetailItem = Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"][number]["items"][number];
