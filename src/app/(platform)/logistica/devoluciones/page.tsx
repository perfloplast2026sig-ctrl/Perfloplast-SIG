import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
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

  return (
    <>
      <PageHeading
        title="Devoluciones de despacho"
        description="Registro separado y agrupado por pedido para revisar devoluciones totales o parciales sin saturar la vista de logistica."
        actions={<Link className="inline-flex h-11 items-center justify-center rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" href="/logistica">Volver a despachos</Link>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReturnMetric label="Pedidos con devolucion" value={String(grouped.length)} />
        <ReturnMetric label="Registros" value={String(returns.length)} />
        <ReturnMetric label="Parciales" value={String(partial)} />
        <ReturnMetric label="Pendientes" value={String(pending)} />
      </div>

      {grouped.length === 0 ? (
        <SectionCard title="Sin devoluciones" eyebrow="Registro limpio">
          <p className="rounded-2xl border bg-card-muted/50 p-4 text-sm text-muted">Aun no hay devoluciones registradas.</p>
        </SectionCard>
      ) : null}

      <div className="space-y-5">
        {grouped.map((group) => (
          <SectionCard key={group.preorder} title={`${group.preorder} - ${group.client}`} eyebrow={`${group.returns.length} devolucion(es)`}>
            <div className="space-y-4">
              {group.returns.map((item) => (
                <article key={item.id} className="rounded-2xl border bg-card-muted/30 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold">{item.dispatch}</span>
                        <Badge label={item.scope} tone={item.scope === "Devolucion total" ? "warning" : "info"} />
                        <Badge label={item.status.label} tone={item.status.tone} />
                      </div>
                      <p className="mt-2 text-sm text-muted">{item.reason}</p>
                      <p className="mt-2 text-xs text-muted">Piloto: {item.driver} - Registrada: {item.requestedAt} - Resolucion: {item.resolvedAt}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {item.products.map((product) => (
                      <div key={product.id} className="rounded-xl border bg-card p-3">
                        <p className="font-semibold">{product.product}</p>
                        <p className="mt-1 text-xs text-muted">{product.color}</p>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted">Devuelto</span>
                          <span className="font-black">{product.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
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

function ReturnMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </div>
  );
}
