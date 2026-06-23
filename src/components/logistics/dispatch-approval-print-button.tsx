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
  const rows = approvedDispatches.length ? approvedDispatches : [current];
  const totalLoad = rows.reduce((sum, dispatch) => sum + parseQuantity(dispatch.load), 0);
  const totalValue = rows.reduce((sum, dispatch) => sum + parseMoney(dispatch.value), 0);
  const totalProducts = rows.reduce((sum, dispatch) => sum + dispatch.items.length, 0);
  const codes = rows.map((dispatch) => dispatch.code).join(", ");
  const preorders = rows.map((dispatch) => dispatch.preorder).join(", ");
  const invoices = rows.map((dispatch) => dispatch.invoice).join(", ");
  const clients = unique(rows.map((dispatch) => dispatch.client));
  const hasRejections = rows.some((dispatch) => dispatch.rejectedLoad !== "Sin rechazos");
  const titleCode = rows.length > 1 ? `${current.code} + ${rows.length - 1}` : current.code;

  return (
    <article className="dispatch-print-target mx-auto flex min-h-[11in] w-[8.5in] flex-col bg-white p-[0.48in] text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-200">
      <header className="dispatch-print-header grid grid-cols-[1fr_auto] items-start gap-8 border-b-4 border-[#0f4c81] pb-5">
        <div className="flex items-start gap-4">
          <Image alt="Perfloplast" className="h-20 w-24 object-contain" height={80} src="/company-logo.svg.png" width={96} />
          <div>
            <p className="text-3xl font-black tracking-tight text-[#0f4c81]">PERFLOPLAST</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Aldea Chijou, Santa Cruz Verapaz</p>
            <p className="text-sm text-slate-500">Tel: 44235941 / 53146115</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Comprobante de carga</p>
          <p className="mt-1 text-2xl font-black text-orange-600">{titleCode}</p>
          <div className="mt-3 inline-flex min-w-48 items-center justify-center rounded-md border-2 border-emerald-700 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            Carga aprobada
          </div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-5">
        <DispatchPanel title="Datos de la carga" rows={[
          ["Despachos", codes],
          ["Preventas", preorders],
          ["Facturas", invoices],
          ["Estado", current.status.label],
          ["Fecha", current.scheduledAt],
        ]} />
        <DispatchPanel title="Ruta y responsable" rows={[
          ["Piloto", current.driver],
          ["Ruta", current.routeName || "Ruta directa"],
          ["Destino", current.destination],
          ["Clientes", clients.join(", ")],
          ["Pedidos", `${rows.length}`],
        ]} />
      </section>

      <section className="my-6 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-center">
        <SummaryItem label="Pedidos" value={String(rows.length)} />
        <SummaryItem label="Productos" value={String(totalProducts)} />
        <SummaryItem label="Carga aprobada" value={`${formatQuantity(totalLoad)} un`} />
        <SummaryItem label="Valor total" value={formatMoney(totalValue)} />
      </section>

      <section className="flex-1">
        <div className="space-y-4">
          {rows.map((dispatch) => (
            <section key={dispatch.id} className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[1fr_auto] gap-4 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0f4c81]">{dispatch.code} / {dispatch.preorder}</p>
                  <p className="mt-1 text-sm font-bold">{dispatch.client}</p>
                  <p className="text-xs text-slate-500">{dispatch.invoice} - {dispatch.destination}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-black">{dispatch.load}</p>
                  <p className="font-bold text-orange-600">{dispatch.value}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#0f4c81] text-left text-[11px] font-black uppercase tracking-[0.12em] text-white">
                  <tr>
                    <th className="px-4 py-2.5">Producto</th>
                    <th className="px-4 py-2.5">Color</th>
                    <th className="px-4 py-2.5 text-right">Cantidad aprobada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatch.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-2.5 font-bold">{item.product}</td>
                      <td className="px-4 py-2.5 text-slate-600">{item.color}</td>
                      <td className="px-4 py-2.5 text-right font-black">{item.quantity} un</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
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

      <p className="mt-8 text-center text-[11px] text-slate-400">Documento generado por Perflo-SIG. Sello digital: {codes}</p>
    </article>
  );
}

function DispatchPanel({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="border-b border-slate-200 pb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#0f4c81]">{title}</h3>
      <dl className="mt-3 space-y-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[92px_1fr] gap-4">
            <dt className="font-bold text-slate-950">{label}:</dt>
            <dd className="text-right text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>
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
