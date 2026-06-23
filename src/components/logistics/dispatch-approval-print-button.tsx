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
  const clients = unique(rows.map((dispatch) => dispatch.client));
  const hasRejections = rows.some((dispatch) => dispatch.rejectedLoad !== "Sin rechazos");
  const manifestCode = buildManifestCode(rows);

  return (
    <article className="dispatch-print-target mx-auto flex min-h-[11in] w-[8.5in] flex-col bg-white p-[0.46in] text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-200">
      <header className="dispatch-print-header grid grid-cols-[1fr_260px] items-start gap-6 border-b-2 border-slate-900 pb-4">
        <div className="grid grid-cols-[82px_1fr] gap-3 pr-4">
          <Image alt="Perfloplast" className="h-16 w-20 object-contain" height={64} src="/company-logo.svg.png" width={80} />
          <div className="text-center leading-tight">
            <p className="text-2xl font-black tracking-tight text-[#0f4c81]">PERFLO PLAST</p>
            <p className="text-[11px] font-semibold uppercase text-slate-700">Industria de plastico, S.A.</p>
            <p className="mt-1 text-[11px] text-slate-600">Aldea Chijou, Santa Cruz Verapaz, Alta Verapaz</p>
            <p className="text-[11px] text-slate-600">Tel: 44235941 / 53146115</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-950">Boleta de despacho</p>
          <p className="mt-1 text-[11px] font-bold uppercase text-slate-500">No.</p>
          <p className="font-mono text-[21px] font-black leading-tight text-red-600">{manifestCode}</p>
          <p className="mt-2 inline-block border-2 border-slate-900 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">Despacho aprobado</p>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-[12px]">
        <LineField label="Fecha" value={current.scheduledAt} />
        <LineField label="Ruta" value={current.routeName || "Ruta directa"} />
        <LineField label="Piloto" value={current.driver} />
        <LineField label="Destino" value={current.destination} />
        <LineField label="Cliente(s)" value={clients.join(", ")} />
        <LineField label="Pedidos" value={`${rows.length} pedido(s) - ${formatQuantity(totalLoad)} un - ${formatMoney(totalValue)}`} />
      </section>

      <section className="mt-4 flex-1">
        <div className="border-2 border-slate-900">
          <table className="w-full border-collapse text-[12px]">
            <thead className="bg-slate-100 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-900">
              <tr>
                <th className="border-b-2 border-r border-slate-900 px-2 py-2 text-center">Cant.</th>
                <th className="border-b-2 border-r border-slate-900 px-2 py-2">Descripcion</th>
                <th className="border-b-2 border-r border-slate-900 px-2 py-2">Color</th>
                <th className="border-b-2 border-r border-slate-900 px-2 py-2">Pedido</th>
                <th className="border-b-2 border-slate-900 px-2 py-2">Cliente</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map(({ dispatch, first, item }) => (
                <tr key={`${dispatch.id}-${item.id}`} className="align-top">
                  <td className="border-r border-t border-slate-300 px-2 py-2 text-center font-black">{formatQuantity(parseQuantity(item.quantity))}</td>
                  <td className="border-r border-t border-slate-300 px-2 py-2 font-bold">{item.product}</td>
                  <td className="border-r border-t border-slate-300 px-2 py-2 text-slate-700">{item.color}</td>
                  <td className="border-r border-t border-slate-300 px-2 py-2 font-mono text-[11px] font-bold">{first ? dispatch.preorder : ""}</td>
                  <td className="border-t border-slate-300 px-2 py-2 font-semibold">{first ? dispatch.client : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_180px] items-start gap-4 text-[12px]">
          <div className="min-h-16 border-2 border-slate-900 p-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Observaciones</p>
            <p className="mt-1 font-semibold">{hasRejections ? rows.filter((dispatch) => dispatch.rejectedLoad !== "Sin rechazos").map((dispatch) => `${dispatch.preorder}: ${dispatch.rejectedLoad}`).join(" | ") : "Carga sin rechazos."}</p>
          </div>
          <div className="border-2 border-slate-900 p-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Total carga</p>
            <p className="text-lg font-black">{formatQuantity(totalLoad)} un</p>
            <p className="mt-1 font-mono text-sm font-black">{formatMoney(totalValue)}</p>
          </div>
        </div>
      </section>

      <footer className="mt-8 grid grid-cols-3 gap-7 text-[11px] text-slate-600">
        <div className="pt-8 text-center">
          <div className="border-t-2 border-slate-900 pt-1 font-bold text-slate-900">Encargado de bodega</div>
        </div>
        <div className="grid place-items-center">
          <div className="relative rotate-[-8deg] rounded-sm border-[3px] border-[#0f4c81] px-5 py-2 text-center text-[13px] font-black uppercase leading-tight tracking-[0.08em] text-[#0f4c81] opacity-95 shadow-[inset_0_0_0_2px_rgba(15,76,129,0.18)]">
            <span className="absolute -left-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[3px] border-[#0f4c81] bg-white" />
            <span className="absolute -right-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[3px] border-[#0f4c81] bg-white" />
            <span className="block text-[10px] tracking-[0.18em]">Aprobado</span>
            <span className="block text-base">Despacho</span>
            <span className="block text-[10px] tracking-[0.14em]">Perflo Plast</span>
          </div>
        </div>
        <div className="pt-8 text-center">
          <div className="border-t-2 border-slate-900 pt-1 font-bold text-slate-900">Recibido por piloto</div>
        </div>
      </footer>

      <p className="mt-4 text-center text-[10px] text-slate-400">Documento generado por Perflo-SIG. Codigo: {manifestCode}</p>
    </article>
  );
}

function LineField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[82px_1fr] items-end gap-2">
      <span className="font-black">{label}:</span>
      <span className="min-h-6 border-b border-slate-900 px-1 pb-0.5 font-bold">{value}</span>
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
  if (rows.length === 1) return compactDispatchCode(rows[0]?.code || "");
  const first = compactDispatchCode(rows[0]?.code || "");
  const last = compactDispatchCode(rows.at(-1)?.code || "");
  return `${first} a ${last}`;
}

function compactDispatchCode(code: string) {
  const match = /^DSP-\d{4}-(\d+)$/.exec(code);
  return match ? `DP-${match[1]}` : code.replace(/^DSP-\d{4}-/, "DP-");
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
