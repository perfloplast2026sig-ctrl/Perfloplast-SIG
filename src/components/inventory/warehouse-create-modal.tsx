"use client";

import { useState } from "react";
import { Building2, Plus, Warehouse, X } from "lucide-react";
import { createWarehouseAction, setFactoryWarehouseAction } from "@/actions/inventory";
import { Badge } from "@/components/ui/badge";

export function WarehouseCreateModal({ warehouses = [] }: { warehouses?: Array<{ id: string; name: string; code: string; isFactoryWarehouse: boolean }> }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" onClick={() => setIsOpen(true)} type="button">
        <Plus size={16} />Ubicaciones y bodegas
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden border bg-card shadow-2xl sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-3xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b bg-card-muted/10 p-4 sm:gap-4 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Ubicaciones internas</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Gestionar bodegas</h2>
              </div>
              <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            <form action={createWarehouseAction} className="grid gap-5 border-b p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-muted-foreground">Crear nueva bodega</p>
                <span className="rounded-full border bg-card-muted/60 px-3 py-1 text-xs font-semibold text-muted">{warehouses.length} registradas</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Codigo" name="code" placeholder="BOD-03" required />
                <Field label="Nombre" name="name" placeholder="Bodega 3" required />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border bg-card-muted/60 p-4 text-sm font-medium">
                <input className="size-4" name="isFactoryWarehouse" type="checkbox" />
                Usar como bodega de fabrica para ventas rapidas
              </label>
              <div className="flex justify-end gap-3">
                <button className="inline-flex h-11 w-full items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90 sm:h-10 sm:w-auto" type="submit">Guardar nueva bodega</button>
              </div>
            </form>

            <div className="bg-card-muted/20 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Bodegas existentes</p>
                  <p className="mt-1 text-xs text-muted">Ordenadas para revisar y asignar fabrica rapidamente.</p>
                </div>
                <Building2 className="text-accent" size={20} />
              </div>
              <div className="grid gap-3 sm:max-h-[34vh] sm:overflow-y-auto sm:pr-2 sm:grid-cols-2">
                {warehouses.length === 0 ? <p className="rounded-2xl border bg-card p-4 text-sm text-muted text-center">Aun no hay bodegas creadas.</p> : null}
                {warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-xl">
                    <div className="absolute -right-8 -top-8 size-20 rounded-full bg-accent/10 blur-2xl transition group-hover:scale-125" />
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="grid size-10 place-items-center rounded-2xl border bg-card-muted text-accent">
                        <Warehouse size={18} />
                      </div>
                      {warehouse.isFactoryWarehouse ? <Badge label="Fabrica" tone="success" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-black">{warehouse.name}</p>
                      <p className="mt-1 font-mono text-xs font-semibold text-muted">{warehouse.code}</p>
                    </div>
                    {!warehouse.isFactoryWarehouse ? (
                      <form action={setFactoryWarehouseAction}>
                        <input name="warehouseId" type="hidden" value={warehouse.id} />
                        <button className="mt-4 w-full rounded-full border bg-card-muted px-3 py-2 text-xs font-semibold transition hover:bg-card" type="submit">Asignar fabrica</button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, name, placeholder, required = false }: { label: string; name: string; placeholder: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name={name} placeholder={placeholder} required={required} />
    </div>
  );
}
