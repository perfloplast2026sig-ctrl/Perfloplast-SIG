"use client";

import Image from "next/image";
import { FileText } from "lucide-react";
import { useRef, useState } from "react";
import { printWithBodyClass } from "@/lib/print";

type DispatchApprovalRow = {
  id: string;
  code: string;
  preorder: string;
  invoice: string;
  client: string;
  taxId: string;
  phone: string;
  driver: string;
  routeName: string;
  destination: string;
  scheduledAt: string;
  deliveredAt: string;
  load: string;
  value: string;
  rejectedLoad: string;
  status: { label: string };
  statusKey: string;
  items: Array<{ id: string; product: string; color: string; quantity: string }>;
};

const APPROVED_STATUS = new Set(["LOADED", "IN_ROUTE", "DELIVERED"]);

export function DispatchApprovalPrintButton({ dispatch, dispatches }: { dispatch: DispatchApprovalRow; dispatches: DispatchApprovalRow[] }) {
  const [active, setActive] = useState(false);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  if (!APPROVED_STATUS.has(dispatch.statusKey)) return null;

  function openPreview() {
    setActive(true);
    window.setTimeout(() => {
      cleanupRef.current = printWithBodyClass("printing-dispatch", {
        delay: 0,
        onClose: () => {
          setActive(false);
          cleanupRef.current = undefined;
        },
      });
    }, 50);
  }

  return (
    <>
      {active ? (
        <div className="dispatch-print-stage" aria-hidden="true">
          <DispatchApprovalDocument current={dispatch} dispatches={dispatches} />
        </div>
      ) : null}
      <button
        aria-label={`PDF de aprobacion ${dispatch.code}`}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 text-xs font-semibold transition hover:bg-card-muted"
        onClick={openPreview}
        title="PDF de despacho aprobado"
        type="button"
      >
        <FileText size={14} />
        PDF
      </button>
    </>
  );
}

function DispatchApprovalDocument({ current, dispatches }: { current: DispatchApprovalRow; dispatches: DispatchApprovalRow[] }) {
  const approvedDispatches = dispatches.filter((dispatch) => APPROVED_STATUS.has(dispatch.statusKey));
  const rows = sortDispatches(approvedDispatches.length ? approvedDispatches : [current]);
  const totalLoad = rows.reduce((sum, dispatch) => sum + parseQuantity(dispatch.load), 0);
  const totalValue = rows.reduce((sum, dispatch) => sum + parseMoney(dispatch.value), 0);
  const detailRows = rows.flatMap((dispatch) => dispatch.items.map((item, index) => ({ dispatch, item, first: index === 0 })));
  const totalProducts = detailRows.length;
  const clients = unique(rows.map((dispatch) => dispatch.client));
  const hasRejections = rows.some((dispatch) => dispatch.rejectedLoad !== "Sin rechazos");
  const manifestCode = buildManifestCode(rows);

  return (
    <article className="dispatch-print-target mx-auto flex min-h-[11in] w-[8.5in] flex-col bg-white p-[0.48in] text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-200">
      <header className="dispatch-print-header grid grid-cols-[1fr_250px] items-start gap-8 border-b-4 border-[#0f4c81] pb-5">
        <div className="flex items-start gap-4">
          <Image alt="Perfloplast" className="h-20 w-24 object-contain" height={80} src="/company-logo.svg.png" width={96} />
          <div>
            <p className="text-3xl font-black tracking-tight text-[#0f4c81]">PERFLOPLAST</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Aldea Chijou, Santa Cruz Verapaz</p>
            <p className="text-sm text-slate-500">Tel: 44235941 / 53146115</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Manifiesto de carga</p>
          <p className="mt-1 break-words text-xl font-black text-orange-600">{manifestCode}</p>
          <div className="mt-3 inline-flex items-center justify-center rounded-md border-2 border-emerald-700 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Carga aprobada
          </div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-[1fr_1fr_1.3fr] gap-3">
        <CompactInfo label="Piloto" value={current.driver} />
        <CompactInfo label="Fecha" value={current.scheduledAt} />
        <CompactInfo label="Ruta / destino" value={`${current.routeName || "Ruta directa"} - ${current.destination}`} />
        <CompactInfo label="Clientes" value={clients.join(", ")} />
        <CompactInfo label="Estado" value={current.status.label} />
        <CompactInfo label="Documento" value={manifestCode} />
      </section>

      <section className="my-5 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-center">
        <SummaryItem label="Pedidos" value={String(rows.length)} />
        <SummaryItem label="Productos" value={String(totalProducts)} />
        <SummaryItem label="Carga aprobada" value={`${formatQuantity(totalLoad)} un`} />
        <SummaryItem label="Valor total" value={formatMoney(totalValue)} />
      </section>

      <section className="flex-1">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-[12px]">
            <thead className="bg-[#0f4c81] text-left text-[10px] font-black uppercase tracking-[0.11em] text-white">
              <tr>
                <th className="px-3 py-3">Pedido</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Factura</th>
                <th className="px-3 py-3">Producto</th>
                <th className="px-3 py-3">Color</th>
                <th className="px-3 py-3 text-right">Cantidad</th>
                <th className="px-3 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailRows.map(({ dispatch, first, item }) => (
                <tr key={`${dispatch.id}-${item.id}`} className="align-top">
                  <td className="px-3 py-2.5 font-mono text-[11px] font-black text-[#0f4c81]">{first ? dispatch.preorder : ""}</td>
                  <td className="px-3 py-2.5 font-semibold">{first ? dispatch.client : ""}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">{first ? dispatch.invoice : ""}</td>
                  <td className="px-3 py-2.5 font-bold">{item.product}</td>
                  <td className="px-3 py-2.5 text-slate-600">{item.color}</td>
                  <td className="px-3 py-2.5 text-right font-black">{item.quantity} un</td>
                  <td className="px-3 py-2.5 text-right font-black text-orange-600">{first ? dispatch.value : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={hasRejections ? "mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" : "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"}>
          <p className="font-black uppercase tracking-[0.12em]">{hasRejections ? "Productos no aprobados" : "Carga sin rechazos"}</p>
          <p className="mt-2">{hasRejections ? rows.filter((dispatch) => dispatch.rejectedLoad !== "Sin rechazos").map((dispatch) => `${dispatch.preorder}: ${dispatch.rejectedLoad}`).join(" | ") : "Todos los productos fueron aprobados para salir a ruta."}</p>
        </div>
      </section>

      <footer className="mt-10 grid grid-cols-2 gap-10 text-xs text-slate-500">
        <div className="border-t border-slate-300 pt-3 text-center">
          <p className="font-bold text-slate-700">Firma de bodega</p>
          <p>Producto verificado antes de salida</p>
        </div>
        <div className="border-t border-slate-300 pt-3 text-center">
          <p className="font-bold text-slate-700">Firma de piloto</p>
          <p>Recibe carga aprobada</p>
        </div>
      </footer>

      <p className="mt-8 text-center text-[11px] text-slate-400">Documento generado por Perflo-SIG. Codigo de carga: {manifestCode}</p>
    </article>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-slate-200 p-4 last:border-r-0">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sortDispatches(rows: DispatchApprovalRow[]) {
  return [...rows].sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
}

function buildManifestCode(rows: DispatchApprovalRow[]) {
  if (rows.length === 1) return rows[0]?.code || "Sin codigo";
  const first = rows[0]?.code || "";
  const last = rows.at(-1)?.code || "";
  return `${first} a ${last}`;
}

function parseQuantity(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function parseMoney(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function formatQuantity(value: number) {
  return value.toLocaleString("es-GT", { maximumFractionDigits: 3 });
}

function formatMoney(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
