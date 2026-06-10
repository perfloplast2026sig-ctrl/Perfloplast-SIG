"use client";

import { PackagePlus, Plus, X } from "lucide-react";
import { useState } from "react";
import { createFinishedProductAction } from "@/actions/inventory";
import { Button } from "@/components/ui/button";

type Warehouse = {
  id: string;
  name: string;
  isFactoryWarehouse: boolean;
};

export function FinishedProductCreateModal({ warehouses }: { warehouses: Warehouse[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" onClick={() => setIsOpen(true)} type="button">
        <Plus size={16} /> Nuevo producto
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Producto, modelo, color y existencia</p>
                <h3 className="mt-1 text-xl font-semibold">Crear producto terminado</h3>
              </div>
              <button className="modal-close-button inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>

            <form action={createFinishedProductAction} className="grid max-h-[calc(92vh-73px)] gap-4 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="SKU opcional" name="sku" placeholder="PT-001" />
                <Field label="Producto terminado" name="name" placeholder="Banco sin argolla" required />
                <Field label="Modelo" name="modelName" placeholder="Banco con argolla" />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Color" name="color" placeholder="Azul intenso" />
                <Field label="Precio Q" name="priceGTQ" placeholder="0.00" type="number" />
                <Field label="Unidad" name="unit" placeholder="unidad" defaultValue="unidad" required />
                <Field label="Stock minimo" name="minimumStock" placeholder="0" type="number" />
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_0.4fr]">
                <Field label="Descripcion" name="description" placeholder="Descripcion general del producto" />
                <Field label="Existencia inicial" name="initialQuantity" placeholder="0" required type="number" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Bodega donde existe</label>
                <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" disabled={warehouses.length === 0} name="warehouseId" required>
                  <option value="">Seleccionar bodega</option>
                  {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}{warehouse.isFactoryWarehouse ? " · fabrica" : ""}</option>)}
                </select>
              </div>
              <div className="flex justify-end">
                <Button disabled={warehouses.length === 0} type="submit"><PackagePlus size={16} /> Guardar producto</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, name, placeholder, type = "text", required = false, defaultValue }: { label: string; name: string; placeholder: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" defaultValue={defaultValue} min={type === "number" ? 0 : undefined} name={name} placeholder={placeholder} required={required} step={type === "number" ? "0.001" : undefined} type={type} />
    </label>
  );
}
