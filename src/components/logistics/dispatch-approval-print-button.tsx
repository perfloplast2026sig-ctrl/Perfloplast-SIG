"use client";

import Image from "next/image";
import { FileText } from "lucide-react";
import { useState } from "react";
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

  if (!APPROVED_STATUS.has(dispatch.statusKey)) return null;

  function openPreview() {
    setActive(true);
    window.setTimeout(() => {
      printWithBodyClass("printing-dispatch", { delay: 0 });
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
    <article className="dispatch-print-target mx-auto max-w-[920px] bg-white px-9 py-8 text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-200 print:shadow-none print:ring-0">
      <header className="dispatch-print-header flex items-start justify-between gap-8 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-4">
          <Image alt="Perfloplast" className="h-16 w-20 object-contain" height={64} src="/company-logo.svg.png" width={80} />
          <div>
            <p className="text-2xl font-black tracking-tight text-[#0f4c81]">PERFLOPLAST</p>
            <p className="mt-1 text-xs font-medium text-slate-600">Aldea Chijou, Santa Cruz Verapaz</p>
            <p className="text-xs text-slate-500">Tel: 44235941 / 53146115</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black uppercase tracking-wide">Comprobante de despacho</p>
          <p className="mt-1 text-2xl font-black text-orange-600">{dispatch.code}</p>
          <div className="mt-3 inline-block rounded-lg border-2 border-emerald-700 px-4 py-2 text-center text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            Carga aprobada
          </div>
        </div>
      </header>

      <section className="dispatch-print-info grid gap-10 py-8 md:grid-cols-2">
        <DispatchInfo title="Datos del despacho" rows={[
          ["Despacho", dispatch.code],
          ["Preventa", dispatch.preorder],
          ["Factura", dispatch.invoice],
          ["Estado", dispatch.status.label],
          ["Fecha", dispatch.scheduledAt],
        ]} />
        <DispatchInfo title="Cliente y ruta" rows={[
          ["Cliente", dispatch.client],
          ["NIT", dispatch.taxId],
          ["Telefono", dispatch.phone],
          ["Piloto", dispatch.driver],
          ["Destino", dispatch.destination],
        ]} />
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryItem label="Ruta" value={dispatch.routeName || "Ruta directa"} />
          <SummaryItem label="Carga aprobada" value={dispatch.load} />
          <SummaryItem label="Valor" value={dispatch.value} />
        </div>
      </section>

      <div className="overflow-hidden border-y border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="py-3 pr-4">Producto</th>
              <th className="px-4 py-3">Color</th>
              <th className="py-3 pl-4 text-right">Cantidad aprobada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dispatch.items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="py-3 pr-4 font-bold">{item.product}</td>
                <td className="px-4 py-3 text-slate-600">{item.color}</td>
                <td className="py-3 pl-4 text-right font-black">{item.quantity} un</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className={hasRejections ? "mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" : "mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"}>
        <p className="font-black uppercase tracking-[0.12em]">{hasRejections ? "Productos no aprobados" : "Carga sin rechazos"}</p>
        <p className="mt-2">{hasRejections ? dispatch.rejectedLoad : "Todos los productos fueron aprobados para salir a ruta."}</p>
      </section>

      <footer className="mt-10 grid gap-8 text-xs text-slate-500 md:grid-cols-2">
        <div>
          <p>Documento generado por Perflo-SIG para salida de bodega.</p>
          <p>El piloto recibe solo la carga aprobada en esta revision.</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-700">Aprobacion de bodega</p>
          <p>Sello digital: {dispatch.code}</p>
        </div>
      </footer>
    </article>
  );
}

function DispatchInfo({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="border-b border-slate-200 pb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[118px_1fr] gap-4">
            <dt className="font-bold">{label}:</dt>
            <dd className="text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}
