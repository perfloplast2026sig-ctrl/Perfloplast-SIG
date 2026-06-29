"use client";

import { ArrowRightLeft, Plus, Trash2, X } from "lucide-react";
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
type TransferRow = { key: string; optionKey: string; quantity: string };

export function StockTransferModal({ options, warehouses }: { options: TransferOption[]; warehouses: Warehouse[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [originId, setOriginId] = useState(warehouses[0]?.id || "");
  const originOptions = useMemo(() => options.filter((option) => option.warehouseId === originId && option.available > 0), [options, originId]);
  const [rows, setRows] = useState<TransferRow[]>([newRow(originOptions[0]?.key || "")]);
  const destinationWarehouses = warehouses.filter((warehouse) => warehouse.id !== originId);
  const canSubmit = rows.some((row) => row.optionKey && Number(row.quantity) > 0) && destinationWarehouses.length > 0;

  function changeOrigin(nextOriginId: string) {
    const nextOptions = options.filter((option) => option.warehouseId === nextOriginId && option.available > 0);
    setOriginId(nextOriginId);
    setRows([newRow(nextOptions[0]?.key || "")]);
  }

  function updateRow(key: string, patch: Partial<TransferRow>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  function addRow() {
    setRows((current) => [...current, newRow(originOptions[0]?.key || "")]);
  }

  function removeRow(key: string) {
    setRows((current) => current.length > 1 ? current.filter((row) => row.key !== key) : current);
  }

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" onClick={() => setIsOpen(true)} type="button">
        <ArrowRightLeft size={16} /> Traslado
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4">
          <div className="max-h-[94dvh] w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:rounded-3xl">
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

              <section className="rounded-2xl border bg-card-muted/30 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Productos</p>
                    <h4 className="font-semibold">Agrega todos los productos del traslado</h4>
                  </div>
                  <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" disabled={originOptions.length === 0} onClick={addRow} type="button">
                    <Plus size={16} /> Agregar producto
                  </button>
                </div>

                <div className="space-y-3">
                  {rows.map((row, index) => {
                    const selected = originOptions.find((option) => option.key === row.optionKey) || originOptions[0] || null;
                    const productNames = uniqueProductNames(originOptions);
                    const colorOptions = selected ? originOptions.filter((option) => option.productName === selected.productName) : [];
                    return (
                      <div key={row.key} className="rounded-2xl border bg-card p-3">
                        <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr_9rem_auto] lg:items-end">
                          <label>
                            <span className="mb-2 block text-sm font-medium">Producto {index + 1}</span>
                            <select
                              className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent"
                              disabled={originOptions.length === 0}
                              onChange={(event) => {
                                const next = originOptions.find((option) => option.productName === event.target.value);
                                updateRow(row.key, { optionKey: next?.key || "", quantity: "" });
                              }}
                              required
                              value={selected?.productName || ""}
                            >
                              {originOptions.length === 0 ? <option value="">Sin productos disponibles en esta bodega</option> : null}
                              {productNames.map((name) => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                            <input name="productId" type="hidden" value={selected?.productId || ""} />
                          </label>
                          <label>
                            <span className="mb-2 block text-sm font-medium">Color</span>
                            <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" disabled={colorOptions.length === 0} onChange={(event) => updateRow(row.key, { optionKey: event.target.value, quantity: "" })} required value={selected?.key || ""}>
                              {colorOptions.map((option) => (
                                <option key={option.key} value={option.key}>{option.color} - disponible {option.availableLabel}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="mb-2 block text-sm font-medium">Cantidad</span>
                            <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" inputMode="decimal" max={selected?.available || undefined} min="0.001" name="quantity" onChange={(event) => updateRow(row.key, { quantity: event.target.value })} placeholder="0" required step="0.001" type="number" value={row.quantity} />
                          </label>
                          <button aria-label="Quitar producto" className="inline-flex h-12 items-center justify-center rounded-full border bg-card px-4 text-sm font-semibold text-red-700 transition hover:bg-red-500/10 disabled:opacity-40 dark:text-red-300" disabled={rows.length === 1} onClick={() => removeRow(row.key)} type="button">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {selected ? (
                          <p className="mt-3 rounded-xl border bg-card-muted/40 px-3 py-2 text-sm text-muted">
                            Color: {selected.color}. Existencia: {selected.quantity.toLocaleString("es-GT")} un. Reservado: {selected.reserved.toLocaleString("es-GT")} un. Disponible: {selected.availableLabel} un.
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto" disabled={!canSubmit} type="submit">
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

function newRow(optionKey: string): TransferRow {
  return { key: crypto.randomUUID(), optionKey, quantity: "" };
}

function uniqueProductNames(options: TransferOption[]) {
  return Array.from(new Set(options.map((option) => option.productName))).sort((a, b) => a.localeCompare(b, "es"));
}
