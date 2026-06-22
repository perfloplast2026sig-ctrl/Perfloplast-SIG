"use client";

import { Ban, Clock, PackagePlus, Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { createProductionEntryAction, updateShiftSchedulesAction } from "@/actions/production";
import { Button } from "@/components/ui/button";

type Product = {
  id: string;
  name: string;
  modelName: string | null;
  color: string | null;
};

type Warehouse = {
  id: string;
  name: string;
  isFactoryWarehouse: boolean;
};

type ShiftSchedule = {
  name: string;
  startTime: string;
  endTime: string;
};

type Row = {
  key: string;
  productTitle: string;
  productId: string;
  quantity: string;
  isRejected: boolean;
  warehouseId: string;
};

export function ProductionEntryForm({ products, warehouses, nextCode, currentShift, currentShiftRange, currentDateTime, shiftSchedules, canManageShiftSchedules }: { products: Product[]; warehouses: Warehouse[]; nextCode: string; currentShift: string; currentShiftRange: string; currentDateTime: string; shiftSchedules: ShiftSchedule[]; canManageShiftSchedules: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const productGroups = useMemo(() => buildProductGroups(products), [products]);
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" onClick={() => setIsOpen(true)} type="button">
        <Plus size={16} /> Registrar produccion
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Numero, fecha y turno automaticos</p>
                <h3 className="mt-1 text-xl font-semibold">Registrar produccion</h3>
              </div>
              <button className="modal-close-button inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>

            <form action={createProductionEntryAction} className="max-h-[calc(92vh-74px)] overflow-y-auto p-5">
              <div className="grid gap-3 rounded-2xl border bg-card-muted/55 p-4 md:grid-cols-3">
                <InfoBox label="Numero automatico" value={nextCode} />
                <InfoBox label="Fecha y hora" value={currentDateTime} />
                <InfoBox label="Turno automatico" value={`${currentShift} · ${currentShiftRange}`} />
              </div>

              <div className="mt-4 space-y-3">
                {rows.map((row, index) => {
                  const selectedGroup = productGroups.find((group) => group.title === row.productTitle);
                  const colorOptions = selectedGroup?.products || [];

                  return (
                    <div key={row.key} className={`grid gap-3 rounded-2xl border p-3 xl:grid-cols-[1.15fr_0.75fr_0.55fr_0.9fr_auto_auto] ${row.isRejected ? "border-red-500/30 bg-red-500/10" : "bg-card"}`}>
                      <SelectField label={`Producto ${index + 1}`} name="" value={row.productTitle} onChange={(value) => updateRow(row.key, { productTitle: value, productId: "" })}>
                        <option value="">Seleccionar producto</option>
                        {productGroups.map((group) => <option key={group.title} value={group.title}>{group.title}</option>)}
                      </SelectField>

                      <SelectField label="Color" name="productId" value={row.productId} onChange={(value) => updateRow(row.key, { productId: value })} required>
                        <option value="">Seleccionar color</option>
                        {colorOptions.map((product) => <option key={product.id} value={product.id}>{product.color || "Sin color"}</option>)}
                      </SelectField>

                      <InputField label="Cantidad" name="" value={row.quantity} onChange={(value) => updateRow(row.key, { quantity: value })} type="number" />
                      <input name="quantity" type="hidden" value={row.isRejected ? "0" : row.quantity} />
                      <input name="rejectedQuantity" type="hidden" value={row.isRejected ? row.quantity : "0"} />

                      <SelectField label="Bodega destino" name="warehouseId" value={row.warehouseId} onChange={(value) => updateRow(row.key, { warehouseId: value })} required>
                        <option value="">Seleccionar bodega</option>
                        {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}{warehouse.isFactoryWarehouse ? " · fabrica" : ""}</option>)}
                      </SelectField>

                      <div className="flex items-end justify-end">
                        <button className={`inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${row.isRejected ? "border-red-500/25 bg-red-500/15 text-red-700 dark:text-red-300" : "bg-card hover:bg-card-muted"}`} onClick={() => updateRow(row.key, { isRejected: !row.isRejected })} type="button">
                          <Ban size={15} /> Rechazo
                        </button>
                      </div>

                      <div className="flex items-end justify-end">
                        <button aria-label="Quitar producto" className="inline-flex size-10 items-center justify-center rounded-full border bg-card transition hover:bg-card-muted disabled:cursor-not-allowed disabled:opacity-45" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} type="button">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition hover:bg-card-muted" onClick={() => setRows((current) => [...current, newRow()])} type="button">
                  <Plus size={16} /> Agregar otro producto
                </button>
                {canManageShiftSchedules ? (
                  <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition hover:bg-card-muted" onClick={() => setScheduleOpen(true)} type="button">
                    <Clock size={16} /> Configurar turnos
                  </button>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border bg-card-muted/60 p-4 text-sm leading-6 text-muted">
                Si marcas Rechazo, esa cantidad queda como merma de fabricacion y no entra al stock disponible.
              </div>

              <div className="mt-4 flex justify-end">
                <Button disabled={products.length === 0 || warehouses.length === 0} type="submit"><PackagePlus size={16} /> Crear produccion</Button>
              </div>
            </form>
          </div>

          {scheduleOpen && canManageShiftSchedules ? (
            <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/35 p-0 sm:items-center sm:p-4">
              <div className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden border bg-card shadow-2xl sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-lg sm:rounded-3xl">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card p-4 pr-16 sm:p-5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Rangos de turno</p>
                    <h3 className="mt-1 text-xl font-semibold">Configurar turnos</h3>
                  </div>
                  <button aria-label="Cerrar" className="modal-close-button absolute right-4 top-4 inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card sm:static" onClick={() => setScheduleOpen(false)} type="button"><X size={18} /></button>
                </div>
                <form action={updateShiftSchedulesAction} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[calc(92vh-96px)] sm:p-5">
                  {["Manana", "Tarde", "Noche"].map((name) => {
                    const schedule = shiftSchedules.find((item) => item.name === name);

                    return (
                      <div key={name} className="grid gap-3 rounded-2xl border bg-card-muted/45 p-3 md:grid-cols-[1fr_1fr_1fr] md:items-end">
                        <p className="font-semibold">{name}</p>
                        <SimpleTimeField label="Hora inicio" name={`${name}.startTime`} defaultValue={schedule?.startTime || ""} />
                        <SimpleTimeField label="Hora fin" name={`${name}.endTime`} defaultValue={schedule?.endTime || ""} />
                      </div>
                    );
                  })}
                  <p className="rounded-2xl border bg-card-muted/60 p-3 text-sm leading-6 text-muted">Ejemplo: si Manana queda 06:00 a 11:59, cualquier produccion registrada dentro de ese rango se guardara como turno Manana.</p>
                  <div className="flex justify-end">
                    <Button type="submit"><Clock size={16} /> Guardar turnos</Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function SelectField({ label, name, value, onChange, children, required = false }: { label: string; name: string; value: string; onChange: (value: string) => void; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name={name || undefined} onChange={(event) => onChange(event.target.value)} required={required} value={value}>
        {children}
      </select>
    </label>
  );
}

function InputField({ label, name, value, onChange, type = "text", required = false }: { label: string; name: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" min={type === "number" ? 0 : undefined} name={name || undefined} onChange={(event) => onChange(event.target.value)} required={required} step={type === "number" ? "0.001" : undefined} type={type} value={value} />
    </label>
  );
}

function SimpleTimeField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" defaultValue={defaultValue} name={name} required type="time" />
    </label>
  );
}

function buildProductGroups(products: Product[]) {
  const groups = new Map<string, { title: string; products: Product[] }>();

  for (const product of products) {
    const title = product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
    const current = groups.get(title);

    if (current) current.products.push(product);
    else groups.set(title, { title, products: [product] });
  }

  return Array.from(groups.values()).sort((a, b) => a.title.localeCompare(b.title, "es"));
}

function newRow(): Row {
  return { key: crypto.randomUUID(), productTitle: "", productId: "", quantity: "", isRejected: false, warehouseId: "" };
}
