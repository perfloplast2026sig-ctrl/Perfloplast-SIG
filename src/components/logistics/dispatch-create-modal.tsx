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
  const [preorderId, setPreorderId] = useState("");
  const selected = useMemo(() => preorders.find((preorder) => preorder.id === preorderId), [preorderId, preorders]);

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
                <h3 className="mt-1 break-words text-lg font-semibold leading-tight sm:text-xl">Crear despacho desde preventa</h3>
              </div>
              <button aria-label="Cerrar" className="modal-close-button inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>
            <form action={createDispatchAction} className="grid max-h-[calc(96dvh-67px)] gap-4 overflow-y-auto p-4 sm:max-h-[calc(92vh-73px)] sm:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium">Orden de preventa</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="preorderId" onChange={(event) => setPreorderId(event.target.value)} required value={preorderId}>
                    <option value="">Seleccionar preventa</option>
                    {preorders.map((preorder) => <option key={preorder.id} value={preorder.id}>{preorder.code} · {preorder.client} · {preorder.total}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-medium">Piloto</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="driverId" required>
                    <option value="">Seleccionar piloto</option>
                    {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                  </select>
                </label>
              </div>

              {selected ? (
                <div className="rounded-2xl border bg-card-muted/50 p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Info label="Cliente" value={selected.client} />
                    <Info label="NIT" value={selected.taxId} />
                    <Info label="Telefono" value={selected.phone} />
                    <Info label="Factura" value={selected.invoice} />
                  </div>
                  <p className="mt-4 text-sm font-medium">Carga y valoracion</p>
                  <div className="mt-2 space-y-2">
                    {selected.items.map((item, index) => (
                      <div key={`${item.product}-${item.color}-${index}`} className="grid gap-2 rounded-xl border bg-card p-3 text-sm md:grid-cols-[1fr_0.6fr_0.4fr_0.5fr]">
                        <span>{item.product}</span>
                        <span className="text-muted">{item.color}</span>
                        <span>{item.quantity}</span>
                        <span className="font-semibold">{item.unitPrice}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-semibold">Total: {selected.total}</p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ruta" name="routeName" placeholder="Ruta Coban / Santa Cruz" />
                <Field label="Lugar de entrega" name="destination" defaultValue={selected?.deliveryAddress || ""} placeholder="Direccion de entrega" required />
              </div>

              <div className="flex justify-end"><Button className="w-full sm:w-auto" type="submit">Crear despacho</Button></div>
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
