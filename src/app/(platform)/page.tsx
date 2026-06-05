import { KpiCard } from "@/components/dashboard/kpi-card";
import { LocationInventoryChart } from "@/components/dashboard/location-inventory-chart";
import { MiniBarChart } from "@/components/dashboard/mini-bar-chart";
import { SalesProductionLineChart } from "@/components/dashboard/sales-production-line-chart";
import { ShiftProductionChart } from "@/components/dashboard/shift-production-chart";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { getDashboardData, type DashboardData } from "@/services/dashboard";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, PackageCheck } from "lucide-react";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <>
      <PageHeading
        title="Centro de control operativo"
        description="Inventario, ventas, produccion y rutas en tiempo real."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-5">
        {dashboard.kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard title="Ventas vs produccion">
          <SalesProductionLineChart data={dashboard.salesVsProduction} />
        </SectionCard>
        <ShiftProductionChart data={dashboard.shiftProduction} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Inventario disponible">
          <MiniBarChart data={dashboard.inventoryMix} />
        </SectionCard>

        <SectionCard title="Inventario por bodega">
          <LocationInventoryChart data={dashboard.inventoryByLocation} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Alertas operativas">
          <div className="space-y-3">
            {dashboard.alerts.map((alert) => (
              <div key={alert.title} className="rounded-2xl border bg-card-muted/50 p-4 transition hover:bg-card-muted/70">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{alert.title}</p>
                  <Badge label={alert.tone === "danger" ? "Critico" : alert.tone === "success" ? "Normal" : "Atencion"} tone={alert.tone} />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{alert.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Movimientos recientes">
          <div className="max-h-[560px] space-y-3 overflow-y-auto overscroll-contain pr-1">
            {dashboard.movements.map((movement) => (
              <DashboardMovementCard key={movement.code} movement={movement} />
            ))}
            {dashboard.movements.length === 0 ? <p className="rounded-2xl border bg-card-muted/60 p-4 text-sm text-muted">Aun no hay actividad registrada.</p> : null}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function DashboardMovementCard({ movement }: { movement: DashboardMovement }) {
  const tone = movementTone(movement.tone);
  const Icon = movement.tone === "in" ? ArrowDownLeft : movement.tone === "transfer" ? ArrowRightLeft : movement.tone === "out" ? ArrowUpRight : PackageCheck;

  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl ${tone.card}`}>
      <div className="absolute -right-8 -top-8 size-20 rounded-full bg-current opacity-10 blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-20" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${tone.badge}`}>
              <Icon size={13} /> {movement.event}
            </span>
            <span className="rounded-full border bg-card/70 px-3 py-1 text-xs font-semibold text-muted">{movement.category}</span>
          </div>
          <p className="break-words font-black">{movement.product}</p>
          <p className="mt-1 text-sm text-muted">{movement.route}</p>
          <p className="mt-2 text-xs text-muted">{movement.reason}</p>
          <p className="mt-3 break-words text-xs text-muted"><span className="font-mono font-semibold">{movement.code}</span> · {movement.user} · {movement.time}</p>
        </div>
        <div className={`w-full rounded-2xl border bg-card/75 px-4 py-3 text-right shadow-sm sm:w-auto sm:shrink-0 ${tone.value}`}>
          <p className="text-lg font-black">{movement.amount}</p>
        </div>
      </div>
    </article>
  );
}

type DashboardMovement = DashboardData["movements"][number];

function movementTone(tone: DashboardMovement["tone"]) {
  const tones = {
    in: {
      card: "from-emerald-500/12 to-card text-emerald-300",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
      value: "text-emerald-700 dark:text-emerald-200",
    },
    out: {
      card: "from-rose-500/12 to-card text-rose-300",
      badge: "bg-rose-500/15 text-rose-700 dark:text-rose-200",
      value: "text-rose-700 dark:text-rose-200",
    },
    transfer: {
      card: "from-sky-500/12 to-card text-sky-300",
      badge: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
      value: "text-sky-700 dark:text-sky-200",
    },
    neutral: {
      card: "from-violet-500/12 to-card text-violet-300",
      badge: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
      value: "text-violet-700 dark:text-violet-200",
    },
  };
  return tones[tone];
}
