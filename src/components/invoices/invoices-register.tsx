"use client";

import Image from "next/image";
import { Eye, FileSpreadsheet, MessageCircle, Printer, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { InvoiceRecord } from "@/services/invoices";

export function InvoicesRegister({ invoices }: { invoices: InvoiceRecord[] }) {
  const [selectedId, setSelectedId] = useState("");
  const selectedInvoice = useMemo(() => selectedId ? invoices.find((invoice) => invoice.id === selectedId) || null : null, [invoices, selectedId]);

  const printInvoice = (invoiceId: string) => {
    setSelectedId(invoiceId);
    window.setTimeout(() => {
      document.body.classList.add("printing-invoice");
      window.print();
      window.setTimeout(() => document.body.classList.remove("printing-invoice"), 250);
    }, 50);
  };

  const exportExcel = () => {
    const rows = invoices.flatMap((invoice) => {
      const discount = moneyValue(invoice.discount);
      return invoice.items.map((item, index) => ({
        invoice: invoice.number.replace(/^FAC-\d{4}-0*/, "F-"),
        type: "Bien",
        quantity: item.quantity,
        description: item.product,
        unitPrice: moneyValue(item.unitPrice),
        discount: index === 0 ? discount : 0,
        total: Math.max(0, moneyValue(item.subtotal) - (index === 0 ? discount : 0)),
      }));
    });
    const html = buildExcelTemplate(rows);
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facturas-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
    {selectedInvoice ? (
      <div className="invoice-print-stage" aria-hidden="true">
        <InvoiceDocument invoice={selectedInvoice} />
      </div>
    ) : null}

    <section className="invoice-screen-section rounded-[28px] border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Documentos de venta</p>
          <h2 className="mt-1 text-xl font-semibold">Facturas registradas</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted sm:w-auto" onClick={exportExcel} type="button">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <p className="rounded-full bg-card-muted px-3 py-1 text-sm font-medium text-muted">{invoices.length} registros</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="m-5 rounded-2xl border bg-card-muted/60 p-4 text-sm text-muted">Aun no hay facturas generadas.</p>
      ) : (
        <>
          <div className="invoice-no-print max-h-[68vh] divide-y divide-border overflow-y-auto overscroll-contain md:hidden">
            {invoices.map((invoice) => (
              <article key={invoice.id} className={selectedInvoice?.id === invoice.id ? "bg-emerald-500/5 p-4" : "bg-card p-4"}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button className="rounded-md border bg-background px-2 py-1 font-mono text-xs font-semibold text-[#0f4c81]" onClick={() => setSelectedId(invoice.id)} type="button">
                      {invoice.number}
                    </button>
                    <p className="mt-3 font-semibold">{invoice.client}</p>
                    <p className="mt-1 text-xs text-muted">NIT: {invoice.taxId}</p>
                    <p className="mt-1 text-xs text-muted">{invoice.issuedAt}</p>
                  </div>
                  <p className="shrink-0 text-right text-base font-black">{invoice.total}</p>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border bg-background px-3 text-xs font-semibold transition hover:bg-card-muted" onClick={() => printInvoice(invoice.id)} type="button">
                    <Printer size={14} />Imprimir
                  </button>
                  <button className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border bg-background px-3 text-xs font-semibold transition hover:bg-card-muted" onClick={() => setSelectedId(invoice.id)} type="button">
                    <Eye size={14} />Ver
                  </button>
                  {invoice.phone ? (
                    <a className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700" href={invoice.whatsappUrl} rel="noreferrer" target="_blank">
                      <MessageCircle size={14} />WhatsApp
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="invoice-no-print hidden max-h-[70vh] overflow-auto md:block">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-card-muted/70 text-left text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="w-12 px-5 py-4"><span className="block size-4 rounded border" /></th>
                  <th className="px-5 py-4">Nro. Factura</th>
                  <th className="px-5 py-4">Cliente</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Tipo venta</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className={selectedInvoice?.id === invoice.id ? "bg-emerald-500/5" : "bg-card"}>
                    <td className="px-5 py-4"><span className="block size-4 rounded border bg-background" /></td>
                    <td className="px-5 py-4">
                      <button className="rounded-md border bg-background px-2 py-1 font-mono text-xs font-semibold text-[#0f4c81]" onClick={() => setSelectedId(invoice.id)} type="button">
                        {invoice.number}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{invoice.client}</p>
                      <p className="mt-1 text-xs text-muted">NIT: {invoice.taxId}</p>
                    </td>
                    <td className="px-5 py-4">{invoice.issuedAt}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Pedido / Despacho</span></td>
                    <td className="px-5 py-4 text-right text-base font-black">{invoice.total}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-background px-3 text-xs font-semibold transition hover:bg-card-muted" onClick={() => printInvoice(invoice.id)} type="button">
                          <Printer size={14} />Imprimir
                        </button>
                        <button className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-background px-3 text-xs font-semibold transition hover:bg-card-muted" onClick={() => setSelectedId(invoice.id)} type="button">
                          <Eye size={14} />Ver
                        </button>
                        {invoice.phone ? (
                          <a className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700" href={invoice.whatsappUrl} rel="noreferrer" target="_blank">
                            <MessageCircle size={14} />WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedInvoice ? (
            <div className="border-t bg-card-muted/30 p-3 sm:p-5">
              <div className="invoice-no-print mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Vista de factura</p>
                  <p className="font-semibold">{selectedInvoice.number} - {selectedInvoice.client}</p>
                </div>
                <button aria-label="Cerrar vista de factura" className="grid size-9 place-items-center rounded-full border bg-card transition hover:bg-card-muted" onClick={() => setSelectedId("")} type="button">
                  <X size={16} />
                </button>
              </div>
              <InvoiceDocument invoice={selectedInvoice} />
            </div>
          ) : null}
        </>
      )}
    </section>
    </>
  );
}

function InvoiceDocument({ invoice }: { invoice: InvoiceRecord }) {
  return (
    <article className="invoice-print-target invoice-print-page mx-auto max-w-[920px] bg-white px-9 py-8 text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-200 print:shadow-none print:ring-0">
      <header className="invoice-print-header flex items-start justify-between gap-8 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-4">
          <Image alt="Perfloplast" className="h-16 w-20 object-contain" height={64} src="/company-logo.svg.png" width={80} />
          <div>
            <p className="text-2xl font-black tracking-tight text-[#0f4c81]">PERFLOPLAST</p>
            <p className="mt-1 text-xs font-medium text-slate-600">Aldea Chijou, Santa Cruz Verapaz</p>
            <p className="text-xs text-slate-500">Tel: 44235941 / 53146115</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black uppercase tracking-wide">Factura / Recibo</p>
          <p className="mt-1 text-2xl font-black text-orange-600">{invoice.number}</p>
        </div>
      </header>

      <section className="invoice-print-info grid gap-10 py-8 md:grid-cols-2">
        <InvoiceInfo title="Informacion de factura" rows={[["Fecha", invoice.issuedAt], ["Metodo Pago", invoice.paymentMethod], ["Tipo Venta", "Pedido / Despacho"], ["Atendido por", invoice.seller]]} />
        <InvoiceInfo title="Datos del cliente" rows={[["Nombre", invoice.client], ["NIT", invoice.taxId], ["Telefono", invoice.phone || "Sin telefono"], ["Direccion", invoice.address]]} />
      </section>

      <div className="overflow-hidden border-y border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="py-3 pr-4">Codigo</th>
              <th className="px-4 py-3">Descripcion</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-right">Precio unit.</th>
              <th className="py-3 pl-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((item, index) => (
              <tr key={`${invoice.id}-${index}`} className="align-top">
                <td className="py-3 pr-4 font-mono text-[11px] font-semibold text-slate-600">{compactSku(item.sku)}</td>
                <td className="px-4 py-3 font-bold">{item.product}</td>
                <td className="px-4 py-3 text-slate-600">{item.color}</td>
                <td className="px-4 py-3 text-right font-semibold">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{item.unitPrice}</td>
                <td className="py-3 pl-4 text-right font-black">{item.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="invoice-print-summary mt-7 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="text-xs leading-6 text-slate-500">
          <p>Documento generado automaticamente el {invoice.generatedAt}.</p>
        </div>
        <div className="space-y-2 text-sm">
          <TotalLine label="Subtotal" value={invoice.subtotal} />
          <TotalLine label="Descuento" value={invoice.discount} />
          <div className="my-3 border-t-2 border-orange-500" />
          <div className="flex items-center justify-between text-xl font-black text-orange-600">
            <span>TOTAL:</span>
            <span>{invoice.total}</span>
          </div>
          <div className="pt-3">
            <TotalLine label="Monto pagado" value={invoice.amountReceived} />
            <TotalLine label="Cambio" value={invoice.change} />
          </div>
        </div>
      </section>

      <footer className="mt-10 text-center text-[11px] text-slate-400">
        <p>Gracias por su compra.</p>
        <p>Sistema de Inventario y Distribucion v1.0</p>
      </footer>
    </article>
  );
}

function InvoiceInfo({ title, rows }: { title: string; rows: Array<[string, string]> }) {
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

function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function compactSku(sku: string) {
  return sku.replace(/^CAT-/, "").replaceAll("-", " ");
}

function moneyValue(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function buildExcelTemplate(rows: Array<{ invoice: string; type: string; quantity: string; description: string; unitPrice: number; discount: number; total: number }>) {
  const body = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.invoice)}</td>
      <td>${escapeHtml(row.type)}</td>
      <td class="number">${escapeHtml(row.quantity)}</td>
      <td>${escapeHtml(row.description)}</td>
      <td class="money">${row.unitPrice.toFixed(2)}</td>
      <td class="money">${row.discount.toFixed(2)}</td>
      <td class="money">${row.total.toFixed(2)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; color: #0f172a; }
        .title { background: #0f4c81; color: #ffffff; font-size: 20px; font-weight: 800; }
        .subtitle { background: #eaf3f8; color: #334155; font-weight: 600; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #24483f; color: #ffffff; font-weight: 800; border: 1px solid #16342d; padding: 8px; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        .number, .money { text-align: right; }
        .money { mso-number-format: "0.00"; }
      </style>
    </head>
    <body>
      <table>
        <tr><td class="title" colspan="7">PERFLOPLAST - REPORTE DE FACTURAS</td></tr>
        <tr><td class="subtitle" colspan="7">Aldea Chijou, Santa Cruz Verapaz - Tel: 44235941 / 53146115</td></tr>
        <tr><td colspan="7"></td></tr>
        <tr>
          <th>Nro Factura</th>
          <th>B/S</th>
          <th>Cantidad</th>
          <th>Descripcion</th>
          <th>Precio Unitario</th>
          <th>Descuentos (Q)</th>
          <th>Total (Q)</th>
        </tr>
        ${body}
      </table>
    </body>
  </html>`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
