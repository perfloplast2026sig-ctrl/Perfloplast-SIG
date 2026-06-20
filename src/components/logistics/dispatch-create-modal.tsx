"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createDispatchAction } from "@/actions/logistics";
import { Button } from "@/components/ui/button";

type Preorder = {
  id: string;
  code: string;
  client: string;
  taxId: string;
  phone: string;
  deliveryAddress: string;
  total: string;
  invoice: string;
  items: Array<{ product: string; color: string; quantity: string; unitPrice: string }>;
};

type Driver = { id: string; name: string; email: string };

export function DispatchCreateModal({ preorders, drivers }: { preorders: Preorder[]; drivers: Driver[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = useMemo(() => preorders.filter((preorder) => selectedIds.includes(preorder.id)), [selectedIds, preorders]);
  const selectedItemCount = selected.reduce((sum, preorder) => sum + preorder.items.length, 0);
  const suggestedDestination = selected.length === 1 ? selected[0].deliveryAddress : selected.length > 1 ? "Ruta multiple" : "";

  function togglePreorder(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((row) => row !== id) : [...current, id]);
  }

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" onClick={() => setIsOpen(true)} type="button">
        <Plus size={16} /> Crear despacho
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4">
          <div className="max-h-[96dvh] w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Asignacion a piloto</p>
                <h3 className="mt-1 break-words text-lg font-semibold leading-tight sm:text-xl">Crear carga desde preventas</h3>
              </div>
              <button aria-label="Cerrar" className="modal-close-button inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>
            <form action={createDispatchAction} className="grid max-h-[calc(96dvh-67px)] gap-4 overflow-y-auto p-4 sm:max-h-[calc(92vh-73px)] sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <section className="rounded-2xl border bg-card-muted/30 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Pedidos disponibles</p>
                      <h4 className="mt-1 text-base font-semibold">Selecciona uno o varios pedidos</h4>
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
                            <span className="block text-xs text-muted">{preorder.invoice} - {preorder.items.length} producto(s)</span>
                          </span>
                          <span className="font-semibold">{preorder.total}</span>
                        </label>
                      );
                    }) : <p className="rounded-2xl border bg-card p-4 text-sm text-muted">No hay preventas pendientes para despacho.</p>}
                  </div>
                </section>

                <label>
                  <span className="mb-2 block text-sm font-medium">Piloto</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="driverId" required>
                    <option value="">Seleccionar piloto</option>
                    {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                  </select>
                </label>
              </div>

              {selected.length ? (
                <div className="rounded-2xl border bg-card-muted/50 p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Info label="Pedidos" value={String(selected.length)} />
                    <Info label="Productos" value={String(selectedItemCount)} />
                    <Info label="Destino base" value={suggestedDestination} />
                    <Info label="Revision" value="Bodega verifica antes del piloto" />
                  </div>
                  <p className="mt-4 text-sm font-medium">Carga y valoracion</p>
                  <div className="mt-2 space-y-2">
                    {selected.map((preorder) => (
                      <div key={preorder.id} className="rounded-xl border bg-card p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">{preorder.code} - {preorder.client}</p>
                          <span className="text-sm font-semibold">{preorder.total}</span>
                        </div>
                        <div className="space-y-2">
                          {preorder.items.map((item, index) => (
                            <div key={`${preorder.id}-${item.product}-${item.color}-${index}`} className="grid gap-2 rounded-xl border bg-card-muted/40 p-3 text-sm md:grid-cols-[1fr_0.6fr_0.4fr_0.5fr]">
                              <span>{item.product}</span>
                              <span className="text-muted">{item.color}</span>
                              <span>{item.quantity}</span>
                              <span className="font-semibold">{item.unitPrice}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ruta" name="routeName" placeholder="Ruta Coban / Santa Cruz" />
                <Field key={suggestedDestination} label="Lugar de entrega" name="destination" defaultValue={suggestedDestination} placeholder="Direccion de entrega" required />
              </div>

              <div className="flex justify-end"><Button className="w-full sm:w-auto" disabled={selected.length === 0} type="submit">Crear carga para verificar</Button></div>
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
