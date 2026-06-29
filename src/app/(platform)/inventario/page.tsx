import { AlertTriangle, Boxes, Coins, Factory, Layers3, Warehouse } from "lucide-react";
import { FinishedProductCreateModal } from "@/components/inventory/finished-product-create-modal";
import { FinishedProductsBrowser } from "@/components/inventory/finished-products-browser";
import { InventoryImportPanel } from "@/components/inventory/inventory-import-panel";
import { InventoryMovementsModal } from "@/components/inventory/inventory-movements-modal";
import { RecentMovementsList } from "@/components/inventory/recent-movements-list";
import { StockAdjustmentModal } from "@/components/inventory/stock-adjustment-modal";
import { StockTransferModal } from "@/components/inventory/stock-transfer-modal";
import { WarehouseCreateModal } from "@/components/inventory/warehouse-create-modal";
import { WarehouseStockCards } from "@/components/inventory/warehouse-stock-cards";
import { PageHeading } from "@/components/layout/page-heading";
import { PreorderCreateModal } from "@/components/preorders/preorder-create-modal";
import { SectionCard } from "@/components/ui/section-card";
import { INVENTORY_MANAGER_ROLES } from "@/lib/constants";
import { requireInventoryViewer } from "@/services/auth";
import { getCatalogProductCards, getCatalogProductCardsFresh, syncCatalogProductsIfStale } from "@/services/catalog";
import { getInventoryModuleData, getInventoryModuleDataFresh } from "@/services/inventory";
import { getPreorderModuleData } from "@/services/preorders";
import type { Role } from "@/types";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; updated?: string; synced?: string; search?: string }> }) {
  const params = await searchParams;
  const user = await requireInventoryViewer();
  const canManageInventory = INVENTORY_MANAGER_ROLES.includes(user.role.name as Role);
  const autoSync = canManageInventory ? await syncCatalogProductsIfStale() : { synced: 0, mode: "skipped" as const, reason: "viewer" };
  const inventoryData = autoSync.synced > 0 ? getInventoryModuleDataFresh() : getInventoryModuleData();
  const catalogData = autoSync.synced > 0 ? getCatalogProductCardsFresh() : getCatalogProductCards();
  const [{ warehouses, warehouseStockCards, adjustmentOptions, transferOptions, movements, stats }, catalogProducts, preorderData] = await Promise.all([
    inventoryData,
    catalogData,
    getPreorderModuleData(),
  ]);
  const factoryWarehouseId = warehouses.find((warehouse: { isFactoryWarehouse: boolean; id: string }) => warehouse.isFactoryWarehouse)?.id || "";

  return (
    <>
      <PageHeading
        title="Inventario por bodega"
        actions={
          canManageInventory ? (
            <>
              <WarehouseCreateModal warehouses={warehouses} />
              <InventoryMovementsModal movements={movements} />
              <StockTransferModal options={transferOptions} warehouses={warehouses} />
              <StockAdjustmentModal options={adjustmentOptions} />
              <PreorderCreateModal buttonLabel="Venta rapida" currentDateTime={preorderData.currentDateTime} defaultWarehouseId={factoryWarehouseId} nextCode={preorderData.nextCode} products={preorderData.products} warehouses={preorderData.warehouses} />
              <FinishedProductCreateModal warehouses={warehouses} />
            </>
          ) : <InventoryMovementsModal movements={movements} />
        }
      />

      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Registro creado correctamente.</div> : null}
      {params.updated ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">{params.updated === "transfer" ? "Traslado registrado correctamente." : "Configuracion actualizada."}</div> : null}
      {params.synced ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Catalogo sincronizado: {params.synced} combinaciones de producto/modelo/color.</div> : null}
      {autoSync.synced > 0 ? <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm font-medium text-sky-700 dark:text-sky-300">Catalogo actualizado automaticamente: {autoSync.synced} combinaciones sincronizadas.</div> : null}

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

      <InventoryImportPanel canManage={canManageInventory} />

      <SectionCard title="Existencias por bodega" className="mt-6" action={<Factory className="text-accent" size={20} />}>
        <WarehouseStockCards warehouses={warehouseStockCards} />
      </SectionCard>

      <FinishedProductsBrowser canManage={canManageInventory} initialSearch={params.search || ""} products={catalogProducts} syncStatus={autoSync} />

      <SectionCard title="Movimientos recientes" className="mt-6">
        <RecentMovementsList movements={movements} />
      </SectionCard>
    </>
  );
}

