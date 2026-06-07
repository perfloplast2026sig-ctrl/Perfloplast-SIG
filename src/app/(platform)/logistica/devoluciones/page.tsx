import Link from "next/link";
import { redirect } from "next/navigation";
import { DispatchReturnsRegistry } from "@/components/logistics/dispatch-returns-registry";
import { PageHeading } from "@/components/layout/page-heading";
import { SectionCard } from "@/components/ui/section-card";
import { requireCurrentUser } from "@/services/auth";
import { getDispatchReturnRegistryData } from "@/services/logistics";

export default async function DispatchReturnsPage() {
  const user = await requireCurrentUser();
  if (user.role.name === "Vendedor") redirect("/preventas");
  if (!["Super admin", "Administrador", "Piloto", "Bodeguero"].includes(user.role.name)) redirect("/");

  const returns = await getDispatchReturnRegistryData(user);
  const grouped = groupByPreorder(returns);
  const pending = returns.filter((item) => item.status.label === "Pendiente").length;
  const partial = returns.filter((item) => item.scope === "Devolucion parcial").length;
  const resolved = returns.length - pending;

  return (
    <>
      <PageHeading
        title="Devoluciones de despacho"
        description="Registro separado y agrupado por pedido para revisar devoluciones totales o parciales sin saturar la vista de logistica."
        actions={<Link className="inline-flex h-11 items-center justify-center rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" href="/logistica">Volver a despachos</Link>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReturnMetric detail="Pedidos agrupados" label="Pedidos con devolucion" tone="emerald" value={String(grouped.length)} />
        <ReturnMetric detail="Historial reciente" label="Registros" tone="sky" value={String(returns.length)} />
        <ReturnMetric detail="No fue retorno total" label="Parciales" tone="amber" value={String(partial)} />
        <ReturnMetric detail={`${resolved} resuelta(s)`} label="Pendientes" tone={pending > 0 ? "rose" : "emerald"} value={String(pending)} />
      </div>

      {grouped.length === 0 ? (
        <SectionCard title="Sin devoluciones" eyebrow="Registro limpio">
          <p className="rounded-2xl border bg-card-muted/50 p-4 text-sm text-muted">Aun no hay devoluciones registradas.</p>
        </SectionCard>
      ) : null}

      <DispatchReturnsRegistry groups={grouped} />
    </>
  );
}

type ReturnRow = Awaited<ReturnType<typeof getDispatchReturnRegistryData>>[number];

function groupByPreorder(rows: ReturnRow[]) {
  const map = new Map<string, { preorder: string; client: string; returns: ReturnRow[] }>();
  for (const row of rows) {
    const current = map.get(row.preorder) || { preorder: row.preorder, client: row.client, returns: [] };
    current.returns.push(row);
    map.set(row.preorder, current);
  }
  return Array.from(map.values());
}

type MetricTone = "emerald" | "sky" | "amber" | "rose";

const metricToneClass: Record<MetricTone, string> = {
  emerald: "from-emerald-500/18 via-card to-card text-emerald-700 ring-emerald-500/20 shadow-emerald-900/10 dark:text-emerald-300",
  sky: "from-sky-500/18 via-card to-card text-sky-700 ring-sky-500/20 shadow-sky-900/10 dark:text-sky-300",
  amber: "from-amber-500/20 via-card to-card text-amber-700 ring-amber-500/20 shadow-amber-900/10 dark:text-amber-300",
  rose: "from-rose-500/18 via-card to-card text-rose-700 ring-rose-500/20 shadow-rose-900/10 dark:text-rose-300",
};

function ReturnMetric({ detail, label, tone, value }: { detail: string; label: string; tone: MetricTone; value: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br p-4 shadow-xl ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-2xl animate-[dashboard-progress_0.55s_ease-out_both] ${metricToneClass[tone]}`}>
      <div className="absolute -right-8 -top-8 size-24 rounded-full bg-current opacity-10 blur-2xl" />
      <div className="relative">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-3 text-3xl font-black text-foreground">{value}</p>
        <p className="mt-1 text-xs font-semibold">{detail}</p>
      </div>
    </div>
  );
}
