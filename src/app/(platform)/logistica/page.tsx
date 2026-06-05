import { DispatchCreateModal } from "@/components/logistics/dispatch-create-modal";
import { DispatchStatusActions } from "@/components/logistics/dispatch-status-actions";
import { DriverMap } from "@/components/logistics/driver-map";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { OperationalReportExport } from "@/components/reports/operational-report-export";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { RecordDetailButton } from "@/components/ui/record-detail-button";
import { SectionCard } from "@/components/ui/section-card";
import { requireCurrentUser } from "@/services/auth";
import { getLogisticsModuleData } from "@/services/logistics";

export default async function LogisticsPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const params = await searchParams;
  const user = await requireCurrentUser();
  if (user.role.name === "Vendedor") redirect("/preventas");
  if (!["Super admin", "Administrador", "Piloto", "Bodeguero"].includes(user.role.name)) redirect("/");
  const { preorders, drivers, dispatches, returnRecords, latestLocations, latestSellerLocations, deliveryMapOrders } = await getLogisticsModuleData(user);
  const canSeeMap = ["Super admin", "Administrador"].includes(user.role.name);
  const isDriver = user.role.name === "Piloto";
  const visibleDispatches = dispatches;
  const driverOrders = deliveryMapOrders;
  const totalLoad = visibleDispatches.reduce((sum, dispatch) => sum + Number(dispatch.load.replace(/[^\d.-]/g, "") || 0), 0);
  const delivered = visibleDispatches.filter((dispatch) => dispatch.status.label === "Entregado").length;
  const active = visibleDispatches.filter((dispatch) => !["Entregado", "Cancelado"].includes(dispatch.status.label)).length;
  const generatedAt = formatOperationalDate(new Date());

  return (
    <>
      <PageHeading
        title="Logistica y despachos"
        description="Crea despachos desde preventas, asigna piloto, controla valor de carga, entrega y rastreo GPS administrativo."
        actions={<div className="flex flex-wrap items-center gap-2"><OperationalReportExport title="Logistica" subtitle="Despachos y rutas registradas" generatedAt={generatedAt} generatedBy={user.name} metrics={[
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
          { key: "valor", label: "Valor", align: "right" },
          { key: "estado", label: "Estado" },
        ]} rows={visibleDispatches.map((dispatch) => ({
          codigo: dispatch.code,
          preventa: dispatch.preorder,
          cliente: dispatch.client,
          piloto: dispatch.driver,
          destino: dispatch.destination,
          carga: dispatch.load,
          valor: dispatch.value,
          estado: dispatch.status.label,
        }))} />{canSeeMap ? <DispatchCreateModal preorders={preorders} drivers={drivers} /> : null}</div>}
      />

      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Despacho creado correctamente.</div> : null}

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
            { header: "Valor", align: "right", cell: (item) => <span className="font-semibold">{item.value}</span> },
            { header: "Estado", cell: (item) => <div><Badge label={item.status.label} tone={item.status.tone} />{item.latestReturnReason ? <p className="mt-1 max-w-44 truncate text-xs text-muted">{item.latestReturnReason}</p> : null}</div> },
            { header: "Accion", cell: (item) => <div className="flex items-center gap-2"><RecordDetailButton detail={buildDispatchDetail(item)} /><DispatchStatusActions dispatch={item} roleName={user.role.name} /></div> },
          ]}
        />
      </SectionCard>

      <SectionCard title="Registro de devoluciones" eyebrow="Productos, motivo y resolucion" className="mt-6">
        <DataTable
          data={returnRecords}
          columns={[
            { header: "Fecha", cell: (item) => <span className="text-muted">{item.requestedAt}</span> },
            { header: "Despacho", cell: (item) => <div><p className="font-mono text-xs font-semibold">{item.dispatch}</p><p className="text-xs text-muted">{item.preorder}</p></div> },
            { header: "Cliente", cell: (item) => item.client },
            { header: "Producto", cell: (item) => <div><p className="font-medium">{item.product}</p><p className="text-xs text-muted">{item.color}</p></div> },
            { header: "Cantidad", align: "right", cell: (item) => <span className="font-semibold">{item.quantity}</span> },
            { header: "Motivo", cell: (item) => <p className="max-w-64 break-words text-sm text-muted">{item.reason}</p> },
            { header: "Resolucion", cell: (item) => <div><Badge label={item.status.label} tone={item.status.tone} /><p className="mt-1 text-xs text-muted">{item.resolvedAt}</p></div> },
          ]}
          pageSize={8}
        />
      </SectionCard>

      {canSeeMap ? (
        <SectionCard title="Mapa de pilotos" eyebrow="Ultimo punto GPS en Guatemala" className="mt-6">
          <DriverMap points={latestLocations} label="pilotos" orders={deliveryMapOrders} />
        </SectionCard>
      ) : null}

      {isDriver ? (
        <SectionCard title="Mapa de mis pedidos" eyebrow="Entregas asignadas" className="mt-6">
          <DriverMap points={[]} label="pedidos" orders={driverOrders} />
        </SectionCard>
      ) : null}

      {canSeeMap ? (
        <SectionCard title="Mapa de vendedores" eyebrow="Ubicacion comercial en Guatemala" className="mt-6">
          <DriverMap points={latestSellerLocations} label="vendedores" />
        </SectionCard>
      ) : null}
    </>
  );
}

function formatOperationalDate(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guatemala" }).format(date);
}

function buildDispatchDetail(item: Awaited<ReturnType<typeof getLogisticsModuleData>>["dispatches"][number]) {
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
          { label: "Valor", value: item.value },
          { label: "Estado", value: item.status.label },
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
