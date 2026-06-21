"use client";

import { ArrowRightLeft, X } from "lucide-react";
import { useMemo, useState } from "react";
import { transferFinishedStockAction } from "@/actions/inventory";
import { Button } from "@/components/ui/button";

type TransferOption = {
  key: string;
  productId: string;
  warehouseId: string;
  productName: string;
  color: string;
  label: string;
  sku: string;
  warehouse: string;
  quantity: number;
  reserved: number;
  available: number;
  availableLabel: string;
};

type Warehouse = { id: string; name: string };

export function StockTransferModal({ options, warehouses }: { options: TransferOption[]; warehouses: Warehouse[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [originId, setOriginId] = useState(warehouses[0]?.id || "");
  const originOptions = useMemo(() => options.filter((option) => option.warehouseId === originId && option.available > 0), [options, originId]);
  const [selectedKey, setSelectedKey] = useState(originOptions[0]?.key || "");
  const selected = originOptions.find((option) => option.key === selectedKey) || originOptions[0] || null;
  const destinationWarehouses = warehouses.filter((warehouse) => warehouse.id !== originId);

  function changeOrigin(nextOriginId: string) {
    const nextOptions = options.filter((option) => option.warehouseId === nextOriginId && option.available > 0);
    setOriginId(nextOriginId);
    setSelectedKey(nextOptions[0]?.key || "");
  }

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" onClick={() => setIsOpen(true)} type="button">
        <ArrowRightLeft size={16} /> Traslado
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Movimiento interno</p>
                <h3 className="mt-1 break-words text-lg font-semibold leading-tight sm:text-xl">Traslado entre bodegas</h3>
              </div>
              <button aria-label="Cerrar" className="modal-close-button inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>
            <form action={transferFinishedStockAction} className="grid max-h-[calc(94dvh-67px)] gap-4 overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium">Bodega origen</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="fromWarehouseId" onChange={(event) => changeOrigin(event.target.value)} required value={originId}>
                    {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium">Bodega destino</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="toWarehouseId" required>
                    <option value="">Seleccionar destino</option>
                    {destinationWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                  </select>
                </label>
              </div>

              <label>
                <span className="mb-2 block text-sm font-medium">Producto disponible</span>
                <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" disabled={originOptions.length === 0} onChange={(event) => setSelectedKey(event.target.value)} required value={selected?.key || ""}>
                  {originOptions.length === 0 ? <option value="">Sin productos disponibles en esta bodega</option> : null}
                  {originOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label} - disponible {option.availableLabel}</option>
                  ))}
                </select>
                <input name="productId" type="hidden" value={selected?.productId || ""} />
              </label>

              {selected ? (
                <div className="rounded-2xl border bg-card-muted/40 p-4 text-sm">
                  <p className="font-semibold">{selected.productName} - {selected.color}</p>
                  <p className="mt-1 text-muted">Existencia: {selected.quantity.toLocaleString("es-GT")} un. Reservado: {selected.reserved.toLocaleString("es-GT")} un. Disponible para traslado: {selected.availableLabel} un.</p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium">Cantidad a trasladar</span>
                  <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" inputMode="decimal" max={selected?.available || undefined} min="0.001" name="quantity" placeholder="0" required step="0.001" type="number" />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium">Motivo</span>
                  <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="reason" placeholder="Reabastecer bodega, preparar despacho..." required />
                </label>
              </div>

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto" disabled={!selected || destinationWarehouses.length === 0} type="submit">
                  <ArrowRightLeft size={16} /> Registrar traslado
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
