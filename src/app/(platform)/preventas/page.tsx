import { PreorderCreateModal } from "@/components/preorders/preorder-create-modal";
import { PreorderCancelButton } from "@/components/preorders/preorder-cancel-button";
import { PreorderReportExport } from "@/components/preorders/preorder-report-export";
import { QuotePrintLauncher } from "@/components/preorders/quote-print-launcher";
import { SellerPreorderBoard } from "@/components/preorders/seller-preorder-board";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { RecordDetailButton } from "@/components/ui/record-detail-button";
import { SectionCard } from "@/components/ui/section-card";
import { TableActions } from "@/components/ui/table-actions";
import { PageHeading } from "@/components/layout/page-heading";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/services/auth";
import { getPreorderModuleData } from "@/services/preorders";
import { CheckCircle2, FileText, ReceiptText, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function PreordersPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; cancelled?: string; quote?: string; search?: string }> }) {
  const params = await searchParams;
  const user = await requireCurrentUser();
  if (!["Super admin", "Administrador", "Vendedor"].includes(user.role.name)) redirect("/");
  const isSuperAdmin = user.role.name === "Super admin";
  const { products, warehouses, preorders, nextCode, currentDateTime, salesSummary } = await getPreorderModuleData(user);
  const quoteRows = preorders.filter((preorder) => preorder.status.label === "Cotizacion");
  const salesRows = preorders.filter((preorder) => preorder.status.label !== "Cotizacion");
  const filteredPreorders = filterRows(preorders, params.search, (preorder) => [preorder.code, preorder.client, preorder.taxId, preorder.phone, preorder.products, preorder.warehouse, preorder.status.label]);
  const confirmed = salesRows.filter((preorder) => preorder.status.label === "Confirmada").length;
  const printedQuote = params.quote ? preorders.find((preorder) => preorder.id === params.quote && preorder.status.label === "Cotizacion") : undefined;

  return (
    <>
      <PageHeading
        title="Preventas con disponibilidad"
        actions={<PreorderCreateModal products={products} warehouses={warehouses} nextCode={nextCode} currentDateTime={currentDateTime} />}
      />

      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created === "quote" ? <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm font-medium text-sky-700 dark:text-sky-300">Cotizacion creada. Usa el boton PDF para revisar o imprimir.</div> : null}
      {params.created && params.created !== "quote" ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Preventa creada y stock reservado.</div> : null}
      {params.cancelled ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Venta anulada correctamente.</div> : null}
      {params.search ? <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm font-medium text-sky-700 dark:text-sky-300">Busqueda aplicada: {params.search}. Mostrando {filteredPreorders.length} resultado(s).</div> : null}

      <QuotePrintLauncher quote={printedQuote} />

      <div className="mb-6">
        <PreorderReportExport preorders={salesRows} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MiniKpi label="Ventas hoy" value={salesSummary.todayTotalLabel} detail={`${salesSummary.todayCount} ventas del dia`} icon={ReceiptText} tone="emerald" />
        <MiniKpi label="Ventas del mes" value={salesSummary.monthTotalLabel} detail={`${salesSummary.monthCount} ventas del mes`} icon={TrendingUp} tone="sky" />
        <MiniKpi label="Confirmadas" value={String(confirmed)} detail="Listas para despacho" icon={CheckCircle2} tone="violet" />
        <MiniKpi label="Cotizaciones" value={String(quoteRows.length)} detail="No descuentan stock" icon={FileText} tone="amber" />
      </div>

      <SectionCard title="Preventas recientes" eyebrow="Registros" className="mt-6">
        <DataTable
          data={filteredPreorders}
          columns={[
            { header: "Codigo", cell: (item) => <span className="font-mono text-xs font-semibold">{item.code}</span> },
            { header: "Cliente", cell: (item) => <span className="font-medium">{item.client}</span> },
            { header: "Productos", cell: (item) => item.products },
            { header: "Bodega", cell: (item) => <span className="text-muted">{item.warehouse}</span> },
            { header: "Pago", cell: (item) => <span className="text-muted">{item.payment}</span> },
            { header: "Fecha", cell: (item) => <span className="text-muted">{item.date}</span> },
            { header: "Total", align: "right", cell: (item) => <span className="font-semibold">{item.total}</span> },
            { header: "Estado", cell: (item) => <Badge label={item.status.label} tone={item.status.tone} /> },
            { header: "Ver", align: "right", cell: (item) => <TableActions>{item.status.label === "Cotizacion" ? <Link aria-label={`Generar PDF de ${item.code}`} className="grid size-10 shrink-0 place-items-center rounded-full border bg-card-muted text-sky-600 transition hover:border-sky-400 hover:bg-sky-500/10" href={`/preventas?quote=${item.id}`} title="Generar PDF de cotizacion"><FileText size={17} /></Link> : null}<RecordDetailButton detail={buildPreorderDetail(item)} />{isSuperAdmin && item.status.label !== "Cancelada" ? <PreorderCancelButton code={item.code} kind={item.status.label === "Cotizacion" ? "quote" : "sale"} preorderId={item.id} /> : null}</TableActions> },
          ]}
        />
      </SectionCard>

      <SectionCard title="Preventas por vendedor" eyebrow="Flujo comercial" className="mt-6">
        <SellerPreorderBoard preorders={salesRows} />
      </SectionCard>
    </>
  );
}

function MiniKpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof ReceiptText; tone: "emerald" | "sky" | "violet" | "amber" }) {
  const tones = {
    emerald: "from-emerald-500/18 to-emerald-500/5 text-emerald-300 shadow-emerald-950/20",
    sky: "from-sky-500/18 to-sky-500/5 text-sky-300 shadow-sky-950/20",
    violet: "from-violet-500/18 to-violet-500/5 text-violet-300 shadow-violet-950/20",
    amber: "from-amber-500/18 to-amber-500/5 text-amber-300 shadow-amber-950/20",
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

function filterRows<T>(rows: T[], query: string | undefined, fields: (row: T) => Array<string | number | null | undefined>) {
  const term = normalizeSearch(query || "");
  if (!term) return rows;
  return rows.filter((row) => normalizeSearch(fields(row).join(" ")).includes(term));
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildPreorderDetail(item: Awaited<ReturnType<typeof getPreorderModuleData>>["preorders"][number]) {
  const audits = (item.auditTrail || []).map((log: PreorderAuditTrailEntry) => ({
    title: log.action,
    subtitle: `${log.user} - ${log.date}`,
    rows: [
      { label: "Motivo", value: log.reason },
      { label: "Usuario", value: log.user },
      { label: "Fecha", value: log.date },
      { label: "Estado previo", value: log.previousStatus },
      { label: "Inventario", value: log.inventoryEffect },
      { label: "Venta", value: log.salesEffect },
    ],
  }));

  return {
    title: item.code,
    subtitle: `${item.client} - ${item.date}`,
    badge: item.status.label,
    sections: [
      {
        title: "Cliente",
        rows: [
          { label: "Nombre", value: item.client },
          { label: "NIT", value: item.taxId },
          { label: "Telefono", value: item.phone },
          { label: "Direccion", value: item.address },
          { label: "Entrega", value: item.deliveryAddress },
        ],
      },
      {
        title: "Venta",
        rows: [
          { label: "Vendedor", value: item.seller },
          { label: "Bodega", value: item.warehouse },
          { label: "Pago", value: item.payment },
          { label: "Descuento", value: item.discount },
          { label: "Recibido", value: item.amountReceived },
          { label: "Cambio", value: item.change },
          { label: "Total", value: item.total },
        ],
      },
    ],
    audits,
    items: (item.items || []).map((row: PreorderDetailItem) => ({
      title: row.product,
      subtitle: `${row.color} - ${row.unitPrice}`,
      quantity: row.quantity,
      total: row.subtotal,
    })),
  };
}

type PreorderAuditTrailEntry = Awaited<ReturnType<typeof getPreorderModuleData>>["preorders"][number]["auditTrail"][number];
type PreorderDetailItem = Awaited<ReturnType<typeof getPreorderModuleData>>["preorders"][number]["items"][number];
