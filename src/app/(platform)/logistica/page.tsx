import { DispatchCreateModal } from "@/components/logistics/dispatch-create-modal";
import { DispatchApprovalPrintButton } from "@/components/logistics/dispatch-approval-print-button";
import { DispatchStatusActions } from "@/components/logistics/dispatch-status-actions";
import { LogisticsLiveMaps } from "@/components/logistics/logistics-live-maps";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { OperationalReportExport } from "@/components/reports/operational-report-export";
import { Badge } from "@/components/ui/badge";
import { AutoFilterForm } from "@/components/ui/auto-filter-form";
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
  const dispatchGroups = groupDispatchesForApproval(visibleDispatches);
  const visibleDispatchGroups = buildVisibleDispatchGroups(visibleDispatches, dispatchGroups);
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
          data={visibleDispatchGroups}
          columns={[
            { header: "Despacho", cell: (group) => <span className="font-mono text-xs font-semibold">{group.code}</span> },
            { header: "Preventa", cell: (group) => <div><p className="font-medium">{group.preorder}</p><p className="text-xs text-muted">{group.invoice}</p></div> },
            { header: "Cliente", cell: (group) => group.client },
            { header: "Piloto", cell: (group) => <span className="font-medium">{group.driver}</span> },
            { header: "Destino", cell: (group) => <span className="text-muted">{group.destination}</span> },
            { header: "Carga", align: "right", cell: (group) => <span className="font-semibold">{group.load}</span> },
            { header: "Rechazos", cell: (group) => group.rejectedLoad === "Sin rechazos" ? <span className="text-xs text-muted">Sin rechazos</span> : <span className="block max-w-52 whitespace-normal text-xs font-semibold text-red-600 dark:text-red-300">{group.rejectedLoad}</span> },
            { header: "Valor", align: "right", cell: (group) => <span className="font-semibold">{group.value}</span> },
            { header: "Estado", cell: (group) => <div><Badge label={group.status.label} tone={group.status.tone} />{group.latestReturnReason ? <p className="mt-1 max-w-44 truncate text-xs text-muted">{group.latestReturnReason}</p> : null}</div> },
            { header: "Accion", align: "right", cell: (group) => {
              const dispatch = group.dispatches[0];
              return <TableActions>{group.canPrint ? <DispatchApprovalPrintButton dispatch={dispatch} dispatches={group.dispatches} /> : null}<RecordDetailButton detail={buildDispatchGroupDetail(group)} />{group.dispatches.length === 1 ? <DispatchStatusActions dispatch={dispatch} roleName={user.role.name} /> : null}</TableActions>;
            } },
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

function groupDispatchesForApproval(rows: Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"]) {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = dispatchApprovalGroupKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

function buildVisibleDispatchGroups(rows: Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"], groups: Map<string, typeof rows>) {
  const seen = new Set<string>();
  const visible = [];
  for (const row of rows) {
    const key = dispatchApprovalGroupKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const groupRows = groups.get(key) || [row];
    visible.push(buildDispatchGroupRow(groupRows));
  }
  return visible;
}

function buildDispatchGroupRow(rows: Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"]) {
  const sorted = [...rows].sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
  const first = sorted[0];
  const totalLoad = sorted.reduce((sum, row) => sum + numericValue(row.load), 0);
  const totalValue = sorted.reduce((sum, row) => sum + numericValue(row.value), 0);
  const clients = uniqueOptions(sorted.map((row) => row.client));
  const statuses = uniqueOptions(sorted.map((row) => row.status.label));
  const rejected = sorted.filter((row) => row.rejectedLoad !== "Sin rechazos").map((row) => `${row.preorder}: ${row.rejectedLoad}`);
  const printable = sorted.some((row) => isApprovalPdfAvailable(row.statusKey));
  return {
    key: dispatchApprovalGroupKey(first),
    code: formatDispatchRange(sorted),
    preorder: formatListRange(sorted.map((row) => row.preorder)),
    invoice: formatListRange(sorted.map((row) => row.invoice)),
    client: clients.join(", "),
    driver: first.driver,
    destination: first.destination,
    load: `${formatNumber(totalLoad)} un`,
    rejectedLoad: rejected.length ? rejected.join(" | ") : "Sin rechazos",
    value: formatMoney(totalValue),
    status: statuses.length === 1 ? first.status : { label: "Agrupado", tone: "info" as const },
    latestReturnReason: sorted.find((row) => row.latestReturnReason)?.latestReturnReason || null,
    canPrint: printable,
    dispatches: sorted,
  };
}

function dispatchApprovalGroupKey(row: Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"][number]) {
  return [row.driverId, row.routeName || "Ruta directa", row.destination, row.scheduledAt].join("|");
}

function isApprovalPdfAvailable(statusKey: string) {
  return ["LOADED", "IN_ROUTE", "DELIVERED"].includes(statusKey);
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function numericValue(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function formatNumber(value: number) {
  return value.toLocaleString("es-GT", { maximumFractionDigits: 3 });
}

function formatMoney(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDispatchRange(rows: Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"]) {
  if (rows.length === 1) return rows[0].code;
  return `${rows[0].code} a ${rows.at(-1)?.code || rows[0].code}`;
}

function formatListRange(values: string[]) {
  const uniqueValues = uniqueOptions(values);
  if (uniqueValues.length <= 2) return uniqueValues.join(", ");
  return `${uniqueValues[0]} + ${uniqueValues.length - 1} mas`;
}

function LogisticsFilters({ params, driverOptions }: { params: LogisticsSearchParams; driverOptions: string[] }) {
  return (
    <AutoFilterForm className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 shadow-sm sm:gap-3 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.85fr_0.85fr_auto] lg:items-end">
      <FilterInput label="Buscar" name="search" placeholder="Despacho, cliente, destino..." defaultValue={params.search || ""} />
      <FilterSelect label="Piloto" name="driver" defaultValue={params.driver || "Todos"} options={["Todos", ...driverOptions]} />
      <FilterSelect label="Periodo" name="period" defaultValue={params.period || "Todos"} options={["Todos", "Hoy", "Mes", "Personalizado"]} />
      <FilterInput label="Desde" name="from" type="date" defaultValue={params.from || ""} />
      <FilterInput label="Hasta" name="to" type="date" defaultValue={params.to || ""} />
      <div className="col-span-2 flex gap-2 lg:col-span-1">
        <a className="inline-flex h-10 items-center justify-center rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" href="/logistica">Todos</a>
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

function buildDispatchGroupDetail(group: ReturnType<typeof buildDispatchGroupRow>) {
  const audits = group.dispatches.flatMap((dispatch) =>
    (dispatch.auditTrail || []).map((log: DispatchAuditTrailEntry) => ({
      title: `${dispatch.code} - ${log.action}`,
      subtitle: `${log.user} - ${log.date}`,
      rows: [
        { label: "Preventa", value: dispatch.preorder },
        { label: "Motivo", value: log.reason },
        { label: "Usuario", value: log.user },
        { label: "Fecha", value: log.date },
        { label: "Estado previo", value: log.previousStatus },
        { label: "Inventario", value: log.inventoryEffect },
      ],
    }))
  );
  const items = group.dispatches.flatMap((dispatch) =>
    (dispatch.items || []).map((row: DispatchDetailItem) => ({
      title: row.product,
      subtitle: `${row.color} - ${dispatch.preorder}`,
      quantity: row.quantity,
      total: row.quantity,
    }))
  );

  return {
    title: group.code,
    subtitle: `${group.client} - ${group.destination}`,
    badge: group.status.label,
    sections: [
      {
        title: "Carga agrupada",
        rows: [
          { label: "Despachos", value: group.code },
          { label: "Preventas", value: group.preorder },
          { label: "Facturas", value: group.invoice },
          { label: "Pedidos", value: String(group.dispatches.length) },
          { label: "Programado", value: group.dispatches[0].scheduledAt },
        ],
      },
      {
        title: "Entrega",
        rows: [
          { label: "Cliente(s)", value: group.client },
          { label: "Piloto", value: group.driver },
          { label: "Destino", value: group.destination },
          { label: "Carga", value: group.load },
          { label: "Valor", value: group.value },
          { label: "Rechazos", value: group.rejectedLoad },
          { label: "Estado", value: group.status.label },
        ],
      },
    ],
    audits,
    items,
  };
}

type DispatchAuditTrailEntry = Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"][number]["auditTrail"][number];
type DispatchDetailItem = Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"][number]["items"][number];
