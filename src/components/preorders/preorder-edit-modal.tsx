"use client";

import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { updatePreorderAction } from "@/actions/preorders";
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
type EditItem = { productId: string; quantity: string };
type Row = { key: string; productId: string; quantity: string };
type PreorderEdit = {
  id: string;
  code: string;
  client: string;
  taxId: string;
  phone: string;
  address: string;
  deliveryAddress: string;
  warehouseId: string;
  payment: string;
  discount: string;
  amountReceived: string;
  status: { label: string };
  items: EditItem[];
};

export function PreorderEditModal({ preorder, products, warehouses }: { preorder: PreorderEdit; products: ProductOption[]; warehouses: Warehouse[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [originLocationId, setOriginLocationId] = useState(preorder.warehouseId || warehouses[0]?.id || "");
  const [rows, setRows] = useState<Row[]>(preorder.items.length ? preorder.items.map((item) => ({ ...item, key: crypto.randomUUID() })) : [newRow()]);
  const [discount, setDiscount] = useState(cleanMoney(preorder.discount));
  const [amountReceived, setAmountReceived] = useState(cleanMoney(preorder.amountReceived));

  const availableProducts = useMemo(() => products.filter((product) => product.warehouseId === originLocationId), [originLocationId, products]);
  const subtotal = rows.reduce((sum, row) => {
    const product = availableProducts.find((item) => item.productId === row.productId) || products.find((item) => item.productId === row.productId);
    return sum + Number(row.quantity || 0) * (product?.price || 0);
  }, 0);
  const total = Math.max(subtotal - Number(discount || 0), 0);
  const change = Math.max(Number(amountReceived || 0) - total, 0);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  return (
    <>
      <button aria-label={`Editar ${preorder.code}`} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border bg-card px-3 text-sm font-semibold transition hover:bg-card-muted" onClick={() => setIsOpen(true)} type="button">
        <Pencil size={15} /> Editar
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden border bg-card shadow-2xl sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-5xl sm:rounded-3xl">
            <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b bg-card px-4 py-3 pr-16 sm:px-5 sm:py-4 sm:pr-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Editar preventa</p>
                <h3 className="mt-1 text-lg font-black sm:text-xl">{preorder.code}</h3>
                <p className="mt-1 text-sm text-muted">Conserva el correlativo. Solo aplica antes de despacho.</p>
              </div>
              <button aria-label="Cerrar" className="modal-close-button absolute right-4 top-3 inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card sm:static" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>

            <form action={updatePreorderAction} className="grid flex-1 content-start gap-4 overflow-y-auto overscroll-contain p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:max-h-[calc(92vh-73px)] sm:p-5">
              <input name="preorderId" type="hidden" value={preorder.id} />
              <div className="grid gap-4 md:grid-cols-3">
                <Field defaultValue={preorder.client} label="Cliente" name="clientName" required />
                <Field defaultValue={preorder.taxId} label="NIT" name="taxId" required />
                <Field defaultValue={digits(preorder.phone)} inputMode="numeric" label="Telefono" maxLength={8} name="phone" pattern="[0-9]{8}" required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field defaultValue={preorder.address} label="Direccion fiscal" name="address" required />
                <Field defaultValue={preorder.deliveryAddress} label="Direccion de entrega" name="deliveryAddress" required />
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
                  const product = availableProducts.find((item) => item.productId === row.productId) || products.find((item) => item.productId === row.productId);

                  return (
                    <div key={row.key} className="grid gap-3 rounded-2xl border bg-card p-3 xl:grid-cols-[1.5fr_0.65fr_0.65fr_0.75fr_auto]">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">Producto {index + 1}</span>
                        <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" name="productId" onChange={(event) => updateRow(row.key, { productId: event.target.value })} required value={row.productId}>
                          <option value="">Seleccionar producto</option>
                          {availableProducts.map((item) => <option key={item.productId} value={item.productId}>{item.name} - {item.color} - {item.priceLabel} - disp. {item.available}</option>)}
                        </select>
                      </label>
                      <NumberField label="Cantidad" name="quantity" onChange={(value) => updateRow(row.key, { quantity: value })} value={row.quantity} />
                      <ReadOnly label="Precio" value={product?.priceLabel || "Q 0.00"} />
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

              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Metodo de pago</span>
                  <select className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" defaultValue={preorder.payment} name="paymentMethod">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Credito">Credito</option>
                  </select>
                </label>
                <NumberField label="Descuento" name="discount" onChange={setDiscount} value={discount} />
                <NumberField label="Monto recibido" name="amountReceived" onChange={setAmountReceived} value={amountReceived} />
                <ReadOnly label="Total" value={formatGTQ(total)} />
                <ReadOnly label="Cambio" value={formatGTQ(change)} />
              </div>

              <div className="sticky bottom-0 z-20 -mx-4 -mb-[calc(6.5rem+env(safe-area-inset-bottom))] flex justify-end border-t bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                <Button className="w-full sm:w-auto" type="submit"><Save size={16} /> Guardar cambios</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ defaultValue, inputMode, label, maxLength, name, pattern, required = false }: { defaultValue: string; inputMode?: "numeric"; label: string; maxLength?: number; name: string; pattern?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" defaultValue={defaultValue} inputMode={inputMode} maxLength={maxLength} name={name} pattern={pattern} required={required} title={pattern === "[0-9]{8}" ? "Ingresa exactamente 8 digitos." : undefined} />
    </label>
  );
}

function NumberField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" min={0} name={name} onChange={(event) => onChange(event.target.value)} step="0.001" type="number" value={value} />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div><p className="mb-2 text-sm font-medium">{label}</p><div className="flex h-12 items-center rounded-2xl border bg-card-muted/60 px-4 text-sm font-semibold">{value}</div></div>;
}

function newRow(): Row {
  return { key: crypto.randomUUID(), productId: "", quantity: "" };
}

function cleanMoney(value: string) {
  return String(Number(value.replace(/[^\d.-]/g, "") || 0));
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatGTQ(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
