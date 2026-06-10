"use client";

import { Download } from "lucide-react";
import Image from "next/image";

type Metric = {
  label: string;
  value: string;
  detail: string;
};

type TableRow = Record<string, string>;

type TableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export function OperationalReportExport({
  columns,
  generatedAt,
  generatedBy,
  metrics,
  period = "Inicio / Hoy",
  rows,
  subtitle,
  title,
}: {
  columns: TableColumn[];
  generatedAt: string;
  generatedBy: string;
  metrics: Metric[];
  period?: string;
  rows: TableRow[];
  subtitle: string;
  title: string;
}) {
  const print = () => {
    const cleanup = () => {
      document.body.classList.remove("printing-operational-report");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    document.body.classList.add("printing-operational-report");
    window.setTimeout(() => window.print(), 80);
  };

  return (
    <>
      <button className="operational-report-control inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted sm:h-10" onClick={print} type="button">
        <Download size={16} /> PDF
      </button>

      <div className="operational-report-print-stage">
        <article className="operational-report-print-target">
          <header className="operational-report-header">
            <div className="operational-report-brand-block">
              <Image alt="PERFLOPLAST" height={68} src="/company-logo.svg.png" width={96} />
              <div>
                <p className="operational-report-brand">PERFLOPLAST</p>
                <p>Industria de plastico</p>
                <p>Aldea Chijou, Santa Cruz Verapaz</p>
                <p>Tel: 44235941 / 53146115</p>
              </div>
            </div>
            <div>
              <p>Reporte operativo</p>
              <h1>{title}</h1>
              <strong>{period}</strong>
              <span>Generado: {generatedAt}</span>
            </div>
          </header>

          <section className="operational-report-meta">
            <div><span>Modulo</span><strong>{title}</strong></div>
            <div><span>Periodo</span><strong>{period}</strong></div>
            <div><span>Generado por</span><strong>{generatedBy}</strong></div>
            <div><span>Registros</span><strong>{String(rows.length)}</strong></div>
          </section>

          <section className="operational-report-summary">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </div>
            ))}
          </section>

          <section className="operational-report-table">
            <h2>{subtitle}</h2>
            <table>
              <thead>
                <tr>{columns.map((column) => <th key={column.key} className={column.align === "right" ? "text-right" : ""}>{column.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.codigo || row.code || index}-${index}`}>
                    {columns.map((column) => <td key={column.key} className={column.align === "right" ? "text-right" : ""}>{row[column.key] || ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <footer>
            <span>Generado automaticamente por el sistema de inventario empresarial</span>
            <span>{generatedAt} - {generatedBy}</span>
          </footer>
        </article>
      </div>
    </>
  );
}
