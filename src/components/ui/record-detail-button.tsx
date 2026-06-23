"use client";

import { Eye, History, X } from "lucide-react";
import { useState } from "react";

type DetailSection = {
  title: string;
  rows: Array<{ label: string; value: string; href?: string }>;
};

type DetailItem = {
  title: string;
  subtitle?: string;
  quantity?: string;
  total?: string;
};

type DetailAudit = {
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: string; href?: string }>;
};

export type RecordDetail = {
  title: string;
  subtitle: string;
  badge?: string;
  sections: DetailSection[];
  items?: DetailItem[];
  audits?: DetailAudit[];
};

export function RecordDetailButton({ detail }: { detail: RecordDetail }) {
  const [open, setOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const hasAudits = Boolean(detail.audits?.length);

  return (
    <>
      <button
        aria-label={`Ver detalle de ${detail.title}`}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-card transition hover:bg-card-muted"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Eye size={16} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 text-left sm:items-center sm:p-4">
          <div className="max-h-[96dvh] w-full max-w-5xl overflow-hidden rounded-2xl border bg-card text-left shadow-2xl sm:max-h-[94vh] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Detalle del registro</p>
                <h3 className="mt-1 break-words text-xl font-black tracking-tight sm:text-2xl">{detail.title}</h3>
                <p className="mt-1 text-sm text-muted">{detail.subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {detail.badge ? <span className="hidden rounded-full bg-card-muted px-3 py-1 text-xs font-bold text-muted min-[420px]:inline-flex">{detail.badge}</span> : null}
                {hasAudits ? (
                  <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card-muted px-3 text-xs font-bold transition hover:bg-card" onClick={() => setAuditOpen(true)} type="button">
                    <History size={15} /> Auditoria
                  </button>
                ) : null}
                <button aria-label="Cerrar" className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setOpen(false)} type="button">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(96dvh-84px)] overflow-y-auto p-4 sm:max-h-[calc(94vh-84px)] sm:p-5">
              <div className="grid items-start gap-3 lg:grid-cols-3">
                {detail.sections.map((section) => (
                  <section key={section.title} className="min-w-0 rounded-2xl border bg-card-muted/20 p-4 shadow-sm">
                    <p className="border-b pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-muted">{section.title}</p>
                    <dl className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-1">
                      {section.rows.map((row) => (
                        <div key={`${section.title}-${row.label}`} className="min-w-0 border-b pb-2 last:border-b-0 last:pb-0">
                          <dt className="text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-muted">{row.label}</dt>
                          <dd className="mt-1 min-w-0 whitespace-normal break-words text-sm font-semibold leading-5">{row.href ? <a className="break-words text-accent underline-offset-4 hover:underline" href={row.href}>{row.value}</a> : row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>

              {detail.items?.length ? (
                <section className="mt-5 rounded-2xl border bg-card-muted/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Productos asociados</p>
                  <div className="mt-4 space-y-2 sm:hidden">
                    {detail.items.map((item, index) => (
                      <article key={`${item.title}-mobile-${index}`} className="rounded-2xl border bg-card p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-black">{item.title}</p>
                            <p className="mt-1 break-words text-xs leading-5 text-muted">{item.subtitle || "-"}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black">{item.quantity || "-"}</p>
                            <p className="mt-1 text-xs font-bold text-muted">{item.total || "-"}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="mt-4 hidden overflow-x-auto rounded-2xl border bg-card sm:block">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="bg-card-muted text-xs uppercase tracking-[0.14em] text-muted">
                        <tr>
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">Detalle</th>
                          <th className="px-4 py-3 text-right">Cantidad</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {detail.items.map((item, index) => (
                          <tr key={`${item.title}-${index}`}>
                            <td className="px-4 py-3 font-bold">{item.title}</td>
                            <td className="px-4 py-3 text-muted">{item.subtitle || "-"}</td>
                            <td className="px-4 py-3 text-right font-semibold">{item.quantity || "-"}</td>
                            <td className="px-4 py-3 text-right font-black">{item.total || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
          {auditOpen ? (
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-2 text-left sm:items-center sm:p-4">
              <div className="max-h-[94dvh] w-full max-w-4xl overflow-hidden rounded-2xl border bg-card text-left shadow-2xl sm:rounded-3xl">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card p-4 sm:p-5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Auditoria del registro</p>
                    <h3 className="mt-1 break-words text-xl font-black tracking-tight">{detail.title}</h3>
                    <p className="mt-1 text-sm text-muted">{detail.subtitle}</p>
                  </div>
                  <button aria-label="Cerrar auditoria" className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setAuditOpen(false)} type="button">
                    <X size={18} />
                  </button>
                </div>
                <div className="max-h-[calc(94dvh-88px)] overflow-y-auto p-4 sm:p-5">
                  <div className="space-y-3">
                    {detail.audits?.map((audit, index) => (
                      <section key={`${audit.title}-${index}`} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className="flex flex-col gap-3 border-b bg-card-muted/35 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-black leading-5 sm:text-base">{audit.title}</p>
                            <p className="mt-1 text-xs font-medium text-muted">{audit.subtitle}</p>
                          </div>
                          <span className="w-fit rounded-full border bg-background px-3 py-1 text-xs font-black text-muted">Evento {index + 1}</span>
                        </div>
                        <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
                          {audit.rows.map((row) => (
                            <div key={`${audit.title}-${row.label}`} className={row.label === "Motivo" ? "border-b pb-3 sm:col-span-2" : "min-w-0 border-b pb-3"}>
                              <dt className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">{row.label}</dt>
                              <dd className="mt-1 min-w-0 whitespace-normal break-words font-semibold leading-5">{row.href ? <a className="break-words text-accent underline-offset-4 hover:underline" href={row.href}>{row.value}</a> : row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
