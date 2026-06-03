"use client";

import { useState } from "react";

type Point = {
  label: string;
  sales: number;
  production: number;
};

const CHART = { width: 900, height: 320, top: 32, right: 58, bottom: 42, left: 70 };

export function SalesProductionLineChart({ data }: { data: Point[] }) {
  const [activeIndex, setActiveIndex] = useState(data.length - 1);
  const needsScroll = data.length > 12;
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const maxSales = niceMax(Math.max(...data.map((point) => point.sales), 1));
  const maxProduction = niceMax(Math.max(...data.map((point) => point.production), 1));
  const productionPath = buildPath(data, maxProduction, plotWidth, plotHeight);
  const totalSales = data.reduce((sum, point) => sum + point.sales, 0);
  const totalProduction = data.reduce((sum, point) => sum + point.production, 0);
  const active = data[activeIndex] || data[data.length - 1];

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-[0_18px_48px_rgba(20,36,31,0.08)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <Metric label="Ingresos" value={formatCompactGTQ(totalSales)} color="bg-indigo-500" />
          <Metric label="Produccion" value={`${Math.round(totalProduction).toLocaleString("es-GT")} un`} color="bg-emerald-500" />
        </div>
        <div className="flex gap-3 text-xs font-semibold text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-indigo-500" />Ventas</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" />Produccion</span>
        </div>
      </div>
      {active ? (
        <div className="mb-3 rounded-2xl border bg-card px-4 py-3 text-sm shadow-lg shadow-slate-900/5 transition duration-300 dark:shadow-black/20">
          <span className="font-semibold capitalize">{active.label}</span>
          <span className="ml-4 text-indigo-700 dark:text-indigo-300">Ventas: {formatCompactGTQ(active.sales)}</span>
          <span className="ml-4 text-emerald-700 dark:text-emerald-300">Produccion: {Math.round(active.production).toLocaleString("es-GT")} un</span>
        </div>
      ) : null}

      <div className={needsScroll ? "overflow-x-auto pb-2" : "overflow-hidden"}>
        <svg className={needsScroll ? "min-w-[920px]" : "w-full"} viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label="Ventas contra produccion de los ultimos siete dias">
          <defs>
            <linearGradient id="salesBar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.38" />
            </linearGradient>
            <linearGradient id="productionLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = CHART.top + plotHeight * tick;
            const salesValue = maxSales * (1 - tick);
            const productionValue = maxProduction * (1 - tick);
            return (
              <g key={tick}>
                <line x1={CHART.left} x2={CHART.width - CHART.right} y1={y} y2={y} className="stroke-border opacity-70" strokeDasharray="4 8" />
                <text x={CHART.left - 14} y={y + 4} textAnchor="end" className="fill-muted text-[11px] font-semibold">{formatCompactGTQ(salesValue)}</text>
                <text x={CHART.width - CHART.right + 13} y={y + 4} textAnchor="start" className="fill-emerald-700 text-[11px] font-semibold dark:fill-emerald-300">{Math.round(productionValue)}</text>
              </g>
            );
          })}

          {data.map((point, index) => {
            const x = xFor(index, data.length, plotWidth);
            const barWidth = Math.max(22, plotWidth / Math.max(data.length, 1) * 0.26);
            const barHeight = Math.max(point.sales > 0 ? 5 : 0, (point.sales / maxSales) * plotHeight);
            const y = CHART.top + plotHeight - barHeight;
            return (
              <g key={`${point.label}-${index}`} className="cursor-pointer" onMouseEnter={() => setActiveIndex(index)}>
                {activeIndex === index ? <rect x={x - barWidth / 2 - 7} y={CHART.top - 10} width={barWidth + 14} height={plotHeight + 20} rx="12" className="fill-indigo-500" opacity="0.08" /> : null}
                <rect className="dashboard-chart-bar origin-bottom transition duration-500 hover:opacity-90" x={x - barWidth / 2} y={y} width={barWidth} height={barHeight} rx="8" fill="url(#salesBar)" />
                <text x={x} y={CHART.height - 15} textAnchor="middle" className="fill-muted text-[12px] font-semibold">{point.label}</text>
              </g>
            );
          })}

          <path className="dashboard-chart-line" d={productionPath} fill="none" stroke="url(#productionLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {data.map((point, index) => {
            const x = xFor(index, data.length, plotWidth);
            const y = yFor(point.production, maxProduction, plotHeight);
            return (
              <g key={`production-${point.label}-${index}`} className="cursor-pointer" onMouseEnter={() => setActiveIndex(index)}>
                <circle cx={x} cy={y} r="5" fill="#10b981" className="stroke-card transition duration-300" strokeWidth="3" />
                {activeIndex === index ? <circle className="dashboard-chart-pulse" cx={x} cy={y} r="10" fill="#10b981" opacity="0.18" /> : null}
                {point.production > 0 ? <text x={x} y={y - 12} textAnchor="middle" className="fill-emerald-700 text-[12px] font-black dark:fill-emerald-300">{Math.round(point.production)}</text> : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 dark:shadow-black/20">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"><span className={`size-2.5 rounded-full ${color}`} />{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">{value}</p>
    </div>
  );
}

function buildPath(data: Point[], max: number, plotWidth: number, plotHeight: number) {
  return data.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index, data.length, plotWidth)} ${yFor(point.production, max, plotHeight)}`).join(" ");
}

function xFor(index: number, length: number, plotWidth: number) {
  const slot = plotWidth / Math.max(length, 1);
  return CHART.left + slot * index + slot / 2;
}

function yFor(value: number, max: number, plotHeight: number) {
  return CHART.top + plotHeight - (value / max) * plotHeight;
}

function niceMax(value: number) {
  const exponent = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / exponent) * exponent;
}

function formatCompactGTQ(value: number) {
  if (value >= 1000) return `Q ${(value / 1000).toLocaleString("es-GT", { maximumFractionDigits: 1 })}k`;
  return `Q ${value.toLocaleString("es-GT", { maximumFractionDigits: 0 })}`;
}
