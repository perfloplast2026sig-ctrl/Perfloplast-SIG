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

export function DispatchApprovalPrintButton({ dispatch }: { dispatch: DispatchApprovalRow }) {
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
          <DispatchApprovalDocument dispatch={dispatch} />
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

function DispatchApprovalDocument({ dispatch }: { dispatch: DispatchApprovalRow }) {
  const hasRejections = dispatch.rejectedLoad !== "Sin rechazos";

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
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Comprobante de despacho</p>
          <p className="mt-1 text-2xl font-black text-orange-600">{dispatch.code}</p>
          <div className="mt-3 inline-flex min-w-48 items-center justify-center rounded-md border-2 border-emerald-700 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            Carga aprobada
          </div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-5">
        <DispatchPanel title="Datos del despacho" rows={[
          ["Despacho", dispatch.code],
          ["Preventa", dispatch.preorder],
          ["Factura", dispatch.invoice],
          ["Estado", dispatch.status.label],
          ["Fecha", dispatch.scheduledAt],
        ]} />
        <DispatchPanel title="Cliente y entrega" rows={[
          ["Cliente", dispatch.client],
          ["NIT", dispatch.taxId],
          ["Telefono", dispatch.phone],
          ["Piloto", dispatch.driver],
          ["Destino", dispatch.destination],
        ]} />
      </section>

      <section className="my-6 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-center">
        <SummaryItem label="Ruta" value={dispatch.routeName || "Ruta directa"} />
        <SummaryItem label="Carga aprobada" value={dispatch.load} />
        <SummaryItem label="Valor" value={dispatch.value} />
      </section>

      <section className="flex-1">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-[#0f4c81] text-left text-[11px] font-black uppercase tracking-[0.12em] text-white">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3 text-right">Cantidad aprobada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispatch.items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3 font-bold">{item.product}</td>
                  <td className="px-4 py-3 text-slate-600">{item.color}</td>
                  <td className="px-4 py-3 text-right font-black">{item.quantity} un</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={hasRejections ? "mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" : "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"}>
          <p className="font-black uppercase tracking-[0.12em]">{hasRejections ? "Productos no aprobados" : "Carga sin rechazos"}</p>
          <p className="mt-2">{hasRejections ? dispatch.rejectedLoad : "Todos los productos fueron aprobados para salir a ruta."}</p>
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

      <p className="mt-8 text-center text-[11px] text-slate-400">Documento generado por Perflo-SIG. Sello digital: {dispatch.code}</p>
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
