"use client";

import { CheckCircle2, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createDispatchAction } from "@/actions/logistics";
import { Button } from "@/components/ui/button";

type PreorderItem = {
  id: string;
  productId: string;
  product: string;
  color: string;
  quantity: string;
  reservedQuantity: string;
  unitPrice: string;
  stockSources: Array<{ warehouseId: string; warehouse: string; available: string }>;
};

type Preorder = {
  id: string;
  code: string;
  client: string;
  taxId: string;
  phone: string;
  deliveryAddress: string;
  originWarehouse: string;
  originWarehouseId: string;
  total: string;
  invoice: string;
  items: PreorderItem[];
};

type Driver = { id: string; name: string; email: string };
type Warehouse = { id: string; name: string };

export function DispatchCreateModal({ preorders, drivers, warehouses }: { preorders: Preorder[]; drivers: Driver[]; warehouses: Warehouse[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);
  const [loadedQuantities, setLoadedQuantities] = useState<Record<string, string>>({});
  const [transferSources, setTransferSources] = useState<Record<string, string>>({});
  const selected = useMemo(() => preorders.filter((preorder) => selectedIds.includes(preorder.id)), [selectedIds, preorders]);
  const selectedItemCount = selected.reduce((sum, preorder) => sum + preorder.items.length, 0);
  const suggestedDestination = selected.length === 1 ? selected[0].deliveryAddress : selected.length > 1 ? "Ruta multiple" : "";

  function togglePreorder(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((row) => row !== id) : [...current, id]);
  }

  function toggleRejected(id: string) {
    setRejectedIds((current) => current.includes(id) ? current.filter((row) => row !== id) : [...current, id]);
  }

  function updateLoadedQuantity(id: string, quantity: string) {
    setLoadedQuantities((current) => ({ ...current, [id]: quantity }));
  }

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" onClick={() => setIsOpen(true)} type="button">
        <Plus size={16} /> Crear despacho
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4">
          <div className="max-h-[96dvh] w-full max-w-6xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Revision de bodega</p>
                <h3 className="mt-1 break-words text-lg font-semibold leading-tight sm:text-xl">Aprobar carga antes del despacho</h3>
              </div>
              <button aria-label="Cerrar" className="modal-close-button inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>
            <form action={createDispatchAction} className="grid max-h-[calc(96dvh-67px)] gap-4 overflow-y-auto p-4 sm:max-h-[calc(92vh-73px)] sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                <section className="rounded-2xl border bg-card-muted/30 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Paso 1</p>
                      <h4 className="mt-1 text-base font-semibold">Seleccionar pedidos</h4>
                    </div>
                    <span className="rounded-full border bg-card px-3 py-1 text-xs font-semibold">{selected.length} seleccionado(s)</span>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {preorders.length ? preorders.map((preorder) => {
                      const checked = selectedIds.includes(preorder.id);
                      return (
                        <label key={preorder.id} className={`grid cursor-pointer gap-3 rounded-2xl border p-3 transition sm:grid-cols-[auto_1fr_auto] sm:items-center ${checked ? "border-accent bg-accent/10" : "bg-card hover:bg-card-muted"}`}>
                          <input checked={checked} className="mt-1 h-5 w-5 accent-[hsl(var(--accent))]" name="preorderId" onChange={() => togglePreorder(preorder.id)} type="checkbox" value={preorder.id} />
                          <span className="min-w-0">
                            <span className="block font-semibold">{preorder.code} - {preorder.client}</span>
                            <span className="block text-xs text-muted">{preorder.originWarehouse} - {preorder.items.length} producto(s)</span>
                          </span>
                          <span className="font-semibold">{preorder.total}</span>
                        </label>
                      );
                    }) : <p className="rounded-2xl border bg-card p-4 text-sm text-muted">No hay preventas pendientes para despacho.</p>}
                  </div>
                </section>

                <div className="grid gap-4">
                  <label>
                    <span className="mb-2 block text-sm font-medium">Piloto</span>
                    <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="driverId" required>
                      <option value="">Seleccionar piloto</option>
                      {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                    </select>
                  </label>
                  <div className="rounded-2xl border bg-card-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Resumen</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <Info label="Pedidos" value={String(selected.length)} />
                      <Info label="Productos" value={String(selectedItemCount)} />
                      <Info label="Bodegas" value={String(warehouses.length)} />
                      <Info label="Estado final" value="Cargado" />
                    </div>
                  </div>
                </div>
              </div>

              {selected.length ? (
                <section className="rounded-2xl border bg-card-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Paso 2</p>
                  <h4 className="mt-1 text-base font-semibold">Verificar productos y cantidades</h4>
                  <div className="mt-3 space-y-3">
                    {selected.map((preorder) => (
                      <div key={preorder.id} className="rounded-2xl border bg-card p-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">{preorder.code} - {preorder.client}</p>
                            <p className="text-xs text-muted">Bodega origen: {preorder.originWarehouse}</p>
                          </div>
                          <span className="rounded-full border bg-card-muted px-3 py-1 text-xs font-semibold">{preorder.invoice}</span>
                        </div>
                        <div className="space-y-2">
                          {preorder.items.map((item) => {
                            const rejected = rejectedIds.includes(item.id);
                            const transferSource = transferSources[item.id] || "";
                            const loadedQuantity = rejected ? "0" : loadedQuantities[item.id] ?? item.quantity;
                            const rejectedQuantity = Math.max(0, Number(item.quantity) - Number(loadedQuantity || 0));
                            return (
                              <div key={item.id} className={`rounded-2xl border p-3 ${rejected ? "border-red-500/30 bg-red-500/10" : "bg-card-muted/30"}`}>
                                <input name="loadedPreorderItemId" type="hidden" value={item.id} />
                                {transferSource ? <input name="transferPreorderItemId" type="hidden" value={item.id} /> : null}
                                <div className="grid gap-3 lg:grid-cols-[1fr_8rem_12rem_auto] lg:items-end">
                                  <div className="min-w-0">
                                    <p className="break-words font-semibold">{item.product}</p>
                                    <p className="text-sm text-muted">{item.color} - pedido: {item.quantity} un</p>
                                  </div>
                                  <label>
                                    <span className="mb-1 block text-xs font-semibold text-muted">Cargado bueno</span>
                                    <input className="h-11 w-full rounded-xl border bg-card px-3 text-sm font-semibold outline-none focus:border-accent" inputMode="decimal" name={`loadedQuantity-${item.id}`} onChange={(event) => updateLoadedQuantity(item.id, event.target.value)} type="number" min="0" max={item.quantity} step="0.001" value={loadedQuantity} />
                                    {rejectedQuantity > 0 ? <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-300">Rechazo {rejectedQuantity.toLocaleString("es-GT")} un</span> : null}
                                  </label>
                                  <label>
                                    <span className="mb-1 block text-xs font-semibold text-muted">Traer de otra bodega</span>
                                    <select className="h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-accent disabled:opacity-45" disabled={rejected || item.stockSources.length === 0} name={`sourceLocationId-${item.id}`} onChange={(event) => setTransferSources((current) => ({ ...current, [item.id]: event.target.value }))} value={transferSource}>
                                      <option value="">{item.stockSources.length ? "No aplica" : "Sin existencia alterna"}</option>
                                      {item.stockSources.map((source) => <option key={source.warehouseId} value={source.warehouseId}>{source.warehouse} - {source.available}</option>)}
                                    </select>
                                  </label>
                                  <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 text-sm font-semibold text-red-700 dark:text-red-300">
                                    <input checked={rejected} className="h-4 w-4 accent-red-600" name="rejectedPreorderItemId" onChange={() => toggleRejected(item.id)} type="checkbox" value={item.id} />
                                    Rechazo
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ruta" name="routeName" placeholder="Ruta Coban / Santa Cruz" />
                <Field key={suggestedDestination} label="Lugar de entrega" name="destination" defaultValue={suggestedDestination} placeholder="Direccion de entrega" required />
              </div>

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto" disabled={selected.length === 0} type="submit">
                  <CheckCircle2 size={16} /> Aprobar carga y enviar al piloto
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function Field({ label, name, placeholder, required = false, defaultValue = "" }: { label: string; name: string; placeholder: string; required?: boolean; defaultValue?: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" defaultValue={defaultValue} name={name} placeholder={placeholder} required={required} />
    </label>
  );
}
