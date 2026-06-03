import { AlertTriangle, ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Boxes, Coins, Factory, Layers3, PackageCheck, Warehouse } from "lucide-react";
import { FinishedProductCreateModal } from "@/components/inventory/finished-product-create-modal";
import { FinishedProductsBrowser } from "@/components/inventory/finished-products-browser";
import { InventoryMovementsModal } from "@/components/inventory/inventory-movements-modal";
import { StockAdjustmentModal } from "@/components/inventory/stock-adjustment-modal";
import { WarehouseCreateModal } from "@/components/inventory/warehouse-create-modal";
import { WarehouseStockCards } from "@/components/inventory/warehouse-stock-cards";
import { PageHeading } from "@/components/layout/page-heading";
import { PreorderCreateModal } from "@/components/preorders/preorder-create-modal";
import { SectionCard } from "@/components/ui/section-card";
import { requireInventoryManager } from "@/services/auth";
import { getCatalogProductCards } from "@/services/catalog";
import { getInventoryModuleData } from "@/services/inventory";
import { getPreorderModuleData } from "@/services/preorders";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; updated?: string; synced?: string }> }) {
  const params = await searchParams;
  await requireInventoryManager();
  const [{ warehouses, warehouseStockCards, adjustmentOptions, movements, stats }, catalogProducts, preorderData] = await Promise.all([
    getInventoryModuleData(),
    getCatalogProductCards(),
    getPreorderModuleData(),
  ]);
  const factoryWarehouseId = warehouses.find((warehouse) => warehouse.isFactoryWarehouse)?.id || "";

  return (
    <>
      <PageHeading
        title="Inventario real por bodega"
        description="Bodegas, existencias, productos terminados y movimientos."
        actions={
          <>
            <WarehouseCreateModal warehouses={warehouses} />
            <InventoryMovementsModal movements={movements} />
            <StockAdjustmentModal options={adjustmentOptions} />
            <PreorderCreateModal buttonLabel="Venta rapida" currentDateTime={preorderData.currentDateTime} defaultWarehouseId={factoryWarehouseId} nextCode={preorderData.nextCode} products={preorderData.products} warehouses={preorderData.warehouses} />
            <FinishedProductCreateModal warehouses={warehouses} />
          </>
        }
      />

      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Registro creado correctamente.</div> : null}
      {params.updated ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Configuracion actualizada.</div> : null}
      {params.synced ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Catalogo sincronizado: {params.synced} combinaciones de producto/modelo/color.</div> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Valor inventario", value: stats.inventoryValue, detail: "Producto terminado", icon: Coins, className: "from-emerald-50 to-white text-emerald-700 dark:from-emerald-950/45 dark:to-card dark:text-emerald-200" },
          { label: "Unidades finales", value: stats.finishedUnits, detail: "En bodegas", icon: Boxes, className: "from-sky-50 to-white text-sky-700 dark:from-sky-950/45 dark:to-card dark:text-sky-200" },
          { label: "Variantes con stock", value: String(stats.finishedVariants), detail: "Modelo/color", icon: Layers3, className: "from-violet-50 to-white text-violet-700 dark:from-violet-950/45 dark:to-card dark:text-violet-200" },
          { label: "Bodegas", value: String(stats.warehouses), detail: "Ubicaciones internas", icon: Warehouse, className: "from-cyan-50 to-white text-cyan-700 dark:from-cyan-950/45 dark:to-card dark:text-cyan-200" },
          { label: "Bodega fabrica", value: stats.factoryWarehouse, detail: "Ventas rapidas", icon: Factory, className: "from-orange-50 to-white text-orange-700 dark:from-orange-950/45 dark:to-card dark:text-orange-200" },
          { label: "Stock bajo", value: String(stats.lowStock), detail: "Alertas de minimo", icon: AlertTriangle, className: "from-rose-50 to-white text-rose-700 dark:from-rose-950/45 dark:to-card dark:text-rose-200" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3 shadow-[0_18px_48px_rgba(20,36,31,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(20,36,31,0.13)] sm:p-4 ${item.className}`}>
              <div className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-2xl bg-white/75 shadow-sm transition group-hover:scale-105 sm:right-3 sm:top-3 sm:size-10 dark:bg-white/10">
                <Icon size={16} />
              </div>
              <p className="max-w-24 pr-7 text-xs font-bold leading-4 text-muted sm:max-w-28 sm:text-sm">{item.label}</p>
              <p className="mt-4 break-words text-xl font-black text-foreground sm:mt-5 sm:text-2xl">{item.value}</p>
              <p className="mt-2 text-xs font-medium text-muted">{item.detail}</p>
              <div className="pointer-events-none mt-4 h-1.5 overflow-hidden rounded-full bg-white/70 dark:bg-white/10">
                <div className="h-full w-3/4 rounded-full bg-current opacity-55 transition-all duration-500 group-hover:w-full" />
              </div>
            </div>
          );
        })}
      </div>

      <SectionCard title="Existencias por bodega" className="mt-6" action={<Factory className="text-accent" size={20} />}>
        <WarehouseStockCards warehouses={warehouseStockCards} />
      </SectionCard>

      <FinishedProductsBrowser products={catalogProducts} />

      <SectionCard title="Movimientos recientes" className="mt-6">
        <div className="space-y-3">
          {movements.length === 0 ? <p className="rounded-2xl border bg-card-muted/60 p-4 text-sm text-muted">Aun no hay movimientos registrados.</p> : null}
          {movements.map((movement) => (
            <RecentMovementCard key={movement.id} movement={movement} />
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function RecentMovementCard({ movement }: { movement: Awaited<ReturnType<typeof getInventoryModuleData>>["movements"][number] }) {
  const tone = movementTone(movement.tone);
  const Icon = movement.tone === "in" ? ArrowDownLeft : movement.tone === "transfer" ? ArrowRightLeft : movement.tone === "out" ? ArrowUpRight : PackageCheck;

  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl ${tone.card}`}>
      <div className="absolute -right-8 -top-8 size-20 rounded-full bg-current opacity-10 blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-20" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${tone.badge}`}>
              <Icon size={13} /> {movement.type}
            </span>
            <span className="rounded-full border bg-card/70 px-3 py-1 text-xs font-semibold text-muted">{movement.category}</span>
            {movement.reference ? <span className="rounded-full border bg-card/70 px-3 py-1 font-mono text-xs font-semibold text-muted">{movement.reference}</span> : null}
          </div>
          <p className="font-black">{movement.product} · {movement.color}</p>
          <p className="mt-1 text-sm text-muted">{movement.from} hacia {movement.to}</p>
          <p className="mt-2 text-xs text-muted">{movement.reason}</p>
          <p className="mt-3 text-xs text-muted"><span className="font-mono font-semibold">{movement.code}</span> · {movement.user} · {movement.date}</p>
        </div>
        <div className={`shrink-0 rounded-2xl border bg-card/75 px-4 py-3 text-right shadow-sm ${tone.value}`}>
          <p className="text-xl font-black">{movement.sign}{Number(movement.quantity).toLocaleString("es-GT")}</p>
          <p className="text-xs font-semibold text-muted">{movement.unit}</p>
        </div>
      </div>
    </article>
  );
}

function movementTone(tone: Awaited<ReturnType<typeof getInventoryModuleData>>["movements"][number]["tone"]) {
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
