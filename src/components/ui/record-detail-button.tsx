"use client";

import { Eye, History, X } from "lucide-react";
import { useState } from "react";

type DetailSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
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
  rows: Array<{ label: string; value: string }>;
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 sm:items-center sm:p-4">
          <div className="max-h-[96dvh] w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:max-h-[94vh] sm:rounded-3xl">
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
              <div className="grid gap-4 md:grid-cols-2">
                {detail.sections.map((section) => (
                  <section key={section.title} className="rounded-2xl border bg-card-muted/30 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{section.title}</p>
                    <dl className="mt-4 space-y-3">
                      {section.rows.map((row) => (
                        <div key={`${section.title}-${row.label}`} className="grid gap-1 text-sm sm:grid-cols-[120px_1fr] sm:gap-3">
                          <dt className="font-bold text-muted">{row.label}</dt>
                          <dd className="break-words font-medium">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>

              {detail.items?.length ? (
                <section className="mt-5 rounded-2xl border bg-card-muted/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Productos asociados</p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
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
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4">
              <div className="max-h-[94dvh] w-full max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:rounded-3xl">
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
                  <div className="space-y-4">
                    {detail.audits?.map((audit, index) => (
                      <section key={`${audit.title}-${index}`} className="rounded-2xl border bg-card-muted/25 p-4">
                        <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black">{audit.title}</p>
                            <p className="mt-1 text-xs text-muted">{audit.subtitle}</p>
                          </div>
                          <span className="w-fit rounded-full bg-card px-3 py-1 text-xs font-bold text-muted">#{index + 1}</span>
                        </div>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          {audit.rows.map((row) => (
                            <div key={`${audit.title}-${row.label}`} className={row.label === "Motivo" ? "sm:col-span-2" : ""}>
                              <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{row.label}</dt>
                              <dd className="mt-1 break-words font-semibold leading-6">{row.value}</dd>
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
