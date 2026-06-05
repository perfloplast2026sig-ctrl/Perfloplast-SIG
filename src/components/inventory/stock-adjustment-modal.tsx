"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { adjustFinishedStockAction } from "@/actions/inventory";
import { Button } from "@/components/ui/button";

type AdjustmentOption = {
  key: string;
  productId: string;
  warehouseId: string;
  productName: string;
  color: string;
  label: string;
  sku: string;
  code: string;
  warehouse: string;
  currentQuantity: number;
  currentQuantityLabel: string;
};

export function StockAdjustmentModal({ options }: { options: AdjustmentOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const warehouses = useMemo(() => uniqueWarehouses(options), [options]);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [showZeroStock, setShowZeroStock] = useState(false);
  const warehouseOptions = useMemo(() => options.filter((option) => option.warehouseId === warehouseId), [options, warehouseId]);
  const productOptions = useMemo(() => {
    const filtered = showZeroStock ? warehouseOptions : warehouseOptions.filter((option) => option.currentQuantity > 0);
    return filtered.length > 0 ? filtered : warehouseOptions;
  }, [showZeroStock, warehouseOptions]);
  const [selectedKey, setSelectedKey] = useState(productOptions[0]?.key || "");
  const [physicalQuantity, setPhysicalQuantity] = useState("");
  const selected = useMemo(() => productOptions.find((option) => option.key === selectedKey) || productOptions[0], [productOptions, selectedKey]);
  const parsedPhysical = Number(physicalQuantity || 0);
  const delta = selected ? parsedPhysical - selected.currentQuantity : 0;

  function changeWarehouse(nextWarehouseId: string) {
    const nextWarehouseOptions = options.filter((option) => option.warehouseId === nextWarehouseId);
    const preferred = showZeroStock ? nextWarehouseOptions[0] : nextWarehouseOptions.find((option) => option.currentQuantity > 0) || nextWarehouseOptions[0];
    setWarehouseId(nextWarehouseId);
    setSelectedKey(preferred?.key || "");
    setPhysicalQuantity("");
  }

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition hover:bg-card-muted" onClick={() => setIsOpen(true)} type="button">
        <SlidersHorizontal size={16} /> Ajustar stock
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
          <div className="max-h-[96dvh] w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Conteo fisico</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Ajustar stock</h3>
                <p className="mt-1 text-sm text-muted">Corrige diferencias por error de produccion, conteo o merma. El sistema crea un movimiento Kardex auditado.</p>
              </div>
              <button aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-full border bg-card-muted transition hover:bg-card" onClick={() => setIsOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <form action={adjustFinishedStockAction} className="grid max-h-[calc(96dvh-108px)] gap-4 overflow-y-auto p-4 sm:max-h-[calc(92vh-126px)] sm:p-5">
              {selected ? (
                <>
                  <input name="productId" type="hidden" value={selected.productId} />
                  <input name="warehouseId" type="hidden" value={selected.warehouseId} />
                </>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-[0.75fr_1.25fr]">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Bodega</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" onChange={(event) => changeWarehouse(event.target.value)} value={warehouseId}>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Producto</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" onChange={(event) => { setSelectedKey(event.target.value); setPhysicalQuantity(""); }} value={selected?.key || ""}>
                    {productOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.productName} - actual {option.currentQuantityLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 rounded-2xl border bg-card-muted/45 px-4 py-3 text-sm text-muted">
                <input checked={showZeroStock} className="size-4 accent-[var(--accent)]" onChange={(event) => {
                  const next = event.target.checked;
                  const nextOptions = next ? warehouseOptions : warehouseOptions.filter((option) => option.currentQuantity > 0);
                  setShowZeroStock(next);
                  setSelectedKey((nextOptions[0] || warehouseOptions[0])?.key || "");
                  setPhysicalQuantity("");
                }} type="checkbox" />
                Mostrar productos sin existencia en esta bodega
              </label>

              <div className="grid gap-3 sm:grid-cols-4">
                <InfoBox label="Codigo" value={selected?.code || "-"} />
                <InfoBox label="Color" value={selected?.color || "-"} />
                <InfoBox label="Existencia sistema" value={selected?.currentQuantityLabel || "0"} />
                <InfoBox label="Diferencia" value={`${delta > 0 ? "+" : ""}${Number.isFinite(delta) ? delta.toLocaleString("es-GT", { maximumFractionDigits: 3 }) : "0"}`} />
              </div>

              <div className="grid gap-4 sm:grid-cols-[0.65fr_1fr]">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Existencia fisica real</span>
                  <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" min={0} name="physicalQuantity" onChange={(event) => setPhysicalQuantity(event.target.value)} placeholder="Ej. 548" required step="0.001" type="number" value={physicalQuantity} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Motivo</span>
                  <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="reason" placeholder="Ej. Correccion por conteo fisico de produccion" required />
                </label>
              </div>

              <div className="rounded-2xl border bg-card-muted/55 p-4 text-sm leading-6 text-muted">
                Si el conteo fisico es mayor, se genera una entrada por ajuste. Si es menor, se genera una salida por ajuste. El valor de inventario se recalcula con la nueva existencia por precio del producto.
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button className="w-full sm:w-auto" onClick={() => setIsOpen(false)} type="button" variant="secondary">Cancelar</Button>
                <Button className="w-full sm:w-auto" disabled={!selected || options.length === 0} type="submit">Guardar ajuste</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card-muted/45 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </div>
  );
}

function uniqueWarehouses(options: AdjustmentOption[]) {
  const map = new Map<string, { id: string; name: string }>();

  for (const option of options) {
    if (!map.has(option.warehouseId)) {
      map.set(option.warehouseId, { id: option.warehouseId, name: option.warehouse });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
}
