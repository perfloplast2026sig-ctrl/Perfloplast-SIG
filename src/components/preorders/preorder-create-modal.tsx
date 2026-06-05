"use client";

import { Plus, Receipt, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPreorderAction } from "@/actions/preorders";
import { Button } from "@/components/ui/button";

type ProductOption = {
  productId: string;
  warehouseId: string;
  warehouse: string;
  name: string;
  color: string;
  price: number;
  priceLabel: string;
  available: number;
};

type Warehouse = { id: string; name: string };
type Row = { key: string; productId: string; quantity: string };

export function PreorderCreateModal({ products, warehouses, nextCode, currentDateTime, buttonLabel = "Nueva preventa", defaultWarehouseId = "" }: { products: ProductOption[]; warehouses: Warehouse[]; nextCode: string; currentDateTime: string; buttonLabel?: string; defaultWarehouseId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [originLocationId, setOriginLocationId] = useState(defaultWarehouseId || warehouses[0]?.id || "");
  const [mode, setMode] = useState<"preorder" | "quote">("preorder");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [discount, setDiscount] = useState("0");
  const [amountReceived, setAmountReceived] = useState("0");
  const [gps, setGps] = useState<{ latitude: string; longitude: string; accuracy: string }>({ latitude: "", longitude: "", accuracy: "" });

  const availableProducts = useMemo(() => products.filter((product) => product.warehouseId === originLocationId), [originLocationId, products]);
  const subtotal = rows.reduce((sum, row) => {
    const product = availableProducts.find((item) => item.productId === row.productId);
    return sum + Number(row.quantity || 0) * (product?.price || 0);
  }, 0);
  const total = Math.max(subtotal - Number(discount || 0), 0);
  const change = Math.max(Number(amountReceived || 0) - total, 0);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  useEffect(() => {
    if (!isOpen || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setGps({
        latitude: String(position.coords.latitude),
        longitude: String(position.coords.longitude),
        accuracy: String(position.coords.accuracy || ""),
      }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 },
    );
  }, [isOpen]);

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" onClick={() => setIsOpen(true)} type="button">
        <Plus size={16} /> {buttonLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 sm:items-center sm:p-4">
          <div className="max-h-[96dvh] w-full max-w-6xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Registro real</p>
                <h3 className="mt-1 text-lg font-semibold sm:text-xl">Nueva preventa</h3>
              </div>
              <button aria-label="Cerrar" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border bg-card-muted" onClick={() => setIsOpen(false)} type="button"><X size={16} /></button>
            </div>

            <form action={createPreorderAction} className="grid max-h-[calc(96dvh-67px)] gap-4 overflow-y-auto p-4 sm:max-h-[calc(92vh-73px)] sm:p-5">
              <input name="saleLatitude" type="hidden" value={gps.latitude} />
              <input name="saleLongitude" type="hidden" value={gps.longitude} />
              <input name="saleAccuracy" type="hidden" value={gps.accuracy} />
              <input name="mode" type="hidden" value={mode} />
              <div className="grid gap-3 rounded-2xl border bg-card-muted/55 p-4 md:grid-cols-2">
                <Info label="Numero automatico" value={nextCode} />
                <Info label="Fecha y hora" value={currentDateTime} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button className={`rounded-2xl border p-4 text-left text-sm font-semibold ${mode === "preorder" ? "border-accent bg-accent text-accent-foreground" : "bg-card"}`} onClick={() => setMode("preorder")} type="button">Venta / preventa</button>
                <button className={`rounded-2xl border p-4 text-left text-sm font-semibold ${mode === "quote" ? "border-accent bg-accent text-accent-foreground" : "bg-card"}`} onClick={() => setMode("quote")} type="button">Cotizacion sin descontar stock</button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Cliente" name="clientName" placeholder="Nombre del cliente" required />
                <Field label="NIT" name="taxId" placeholder="CF o NIT" required />
                <Field inputMode="numeric" label="Telefono" maxLength={8} name="phone" pattern="[0-9]{8}" placeholder="8 digitos" required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Direccion" name="address" placeholder="Direccion fiscal" required />
                <Field label="Direccion de entrega" name="deliveryAddress" placeholder="Lugar de entrega" required />
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Bodega de origen</span>
                <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="originLocationId" onChange={(event) => { setOriginLocationId(event.target.value); setRows([newRow()]); }} required value={originLocationId}>
                  <option value="">Seleccionar bodega</option>
                  {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                </select>
              </label>

              <div className="space-y-3">
                {rows.map((row, index) => {
                  const product = availableProducts.find((item) => item.productId === row.productId);

                  return (
                    <div key={row.key} className="grid gap-3 rounded-2xl border bg-card p-3 xl:grid-cols-[1.5fr_0.7fr_0.55fr_0.7fr_auto]">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Producto {index + 1}</span>
                        <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="productId" onChange={(event) => updateRow(row.key, { productId: event.target.value })} required value={row.productId}>
                          <option value="">Seleccionar producto</option>
                          {availableProducts.map((item) => <option key={item.productId} value={item.productId}>{item.name} · {item.color} · {item.priceLabel} · disp. {item.available}</option>)}
                        </select>
                      </label>
                      <Field label="Cantidad" name="quantity" onChange={(value) => updateRow(row.key, { quantity: value })} placeholder="0" required type="number" value={row.quantity} />
                      <ReadOnly label="Precio unitario" value={product?.priceLabel || "Q 0.00"} />
                      <ReadOnly label="Total" value={formatGTQ((product?.price || 0) * Number(row.quantity || 0))} />
                      <input name="unitPrice" type="hidden" value={String(product?.price || 0)} />
                      <div className="flex items-end justify-end">
                        <button className="inline-flex size-10 items-center justify-center rounded-full border bg-card transition hover:bg-card-muted disabled:opacity-40" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} type="button"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition hover:bg-card-muted" onClick={() => setRows((current) => [...current, newRow()])} type="button"><Plus size={16} /> Agregar producto</button>

              <div className="grid gap-4 md:grid-cols-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Metodo de pago</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="paymentMethod">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Credito">Credito</option>
                  </select>
                </label>
                <Field label="Descuento" name="discount" onChange={setDiscount} placeholder="0.00" type="number" value={discount} />
                <Field label="Monto recibido" name="amountReceived" onChange={setAmountReceived} placeholder="0.00" type="number" value={amountReceived} />
                <ReadOnly label="Total" value={formatGTQ(total)} />
                <ReadOnly label="Cambio" value={formatGTQ(change)} />
              </div>

              <div className="flex justify-end">
                <Button className="w-full sm:w-auto" type="submit"><Receipt size={16} /> {mode === "quote" ? "Generar cotizacion PDF" : "Crear preventa"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border bg-card p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p><p className="mt-2 font-semibold">{value}</p></div>;
}

function Field({ inputMode, label, maxLength, name, pattern, placeholder, type = "text", required = false, value, onChange }: { inputMode?: "numeric"; label: string; maxLength?: number; name: string; pattern?: string; placeholder: string; type?: string; required?: boolean; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" inputMode={inputMode} maxLength={maxLength} min={type === "number" ? 0 : undefined} name={name} onChange={onChange ? (event) => onChange(event.target.value) : undefined} pattern={pattern} placeholder={placeholder} required={required} step={type === "number" ? "0.001" : undefined} title={pattern === "[0-9]{8}" ? "Ingresa exactamente 8 digitos." : undefined} type={type} value={value} />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div><p className="mb-2 text-sm font-medium">{label}</p><div className="flex h-12 items-center rounded-2xl border bg-card-muted/60 px-4 text-sm font-semibold">{value}</div></div>;
}

function newRow(): Row {
  return { key: crypto.randomUUID(), productId: "", quantity: "" };
}

function formatGTQ(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
