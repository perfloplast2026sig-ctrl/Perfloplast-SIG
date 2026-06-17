"use client";

import { useMemo, useState } from "react";
import { TrendingUp, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { RecordDetailButton } from "@/components/ui/record-detail-button";
import { TableActions } from "@/components/ui/table-actions";

type PreorderRow = {
  id: string;
  code: string;
  client: string;
  seller: string;
  sellerEmail: string;
  products: string;
  warehouse: string;
  totalNumber: number;
  total: string;
  payment: string;
  taxId: string;
  phone: string;
  address: string;
  deliveryAddress: string;
  discount: string;
  amountReceived: string;
  change: string;
  date: string;
  status: { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" };
  items: Array<{ product: string; color: string; quantity: string; unitPrice: string; subtotal: string }>;
};

export function SellerPreorderBoard({ preorders }: { preorders: PreorderRow[] }) {
  const sellers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; count: number; total: number; rows: PreorderRow[] }>();
    for (const preorder of preorders) {
      const key = preorder.sellerEmail || preorder.seller;
      const current = map.get(key) || { name: preorder.seller, email: preorder.sellerEmail, count: 0, total: 0, rows: [] };
      current.count += 1;
      current.total += preorder.totalNumber;
      current.rows.push(preorder);
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [preorders]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const selected = sellers.find((seller) => seller.email === selectedEmail) || null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sellers.map((seller) => (
          <button key={seller.email || seller.name} className="group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-card-muted/35 p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl" onClick={() => setSelectedEmail(seller.email)} type="button">
            <div className="absolute right-3 top-3 grid size-10 place-items-center rounded-2xl border bg-background/45 text-accent transition group-hover:scale-105">
              <UserRound size={18} />
            </div>
            <p className="truncate pr-12 text-lg font-black">{seller.name}</p>
            <p className="mt-1 truncate text-xs text-muted">{seller.email}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border bg-card/55 p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Ventas</p><p className="mt-1 text-2xl font-black">{seller.count}</p></div>
              <div className="rounded-xl border bg-card/55 p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Total</p><p className="mt-1 text-xl font-black">{formatGTQ(seller.total)}</p></div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-accent">
              <TrendingUp size={14} />
              Ver detalle comercial
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Flujo del vendedor</p>
                <h3 className="mt-1 text-2xl font-semibold">{selected.name}</h3>
                <p className="mt-1 text-sm text-muted">{selected.email}</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border bg-card-muted/40 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Ventas</p>
                  <p className="text-2xl font-black">{selected.count}</p>
                </div>
                <div className="rounded-2xl border bg-card-muted/40 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Acumulado</p>
                  <p className="text-2xl font-black">{formatGTQ(selected.total)}</p>
                </div>
                <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setSelectedEmail("")} type="button">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-5">
              <DataTable
                data={selected.rows}
                columns={[
                  { header: "Codigo", cell: (item) => <span className="font-mono text-xs font-semibold">{item.code}</span> },
                  { header: "Cliente", cell: (item) => <span className="font-medium">{item.client}</span> },
                  { header: "Productos", cell: (item) => item.products },
                  { header: "Bodega", cell: (item) => <span className="text-muted">{item.warehouse}</span> },
                  { header: "Fecha", cell: (item) => <span className="text-muted">{item.date}</span> },
                  { header: "Total", align: "right", cell: (item) => <span className="font-semibold">{item.total}</span> },
                  { header: "Estado", cell: (item) => <Badge label={item.status.label} tone={item.status.tone} /> },
                  { header: "Ver", align: "right", cell: (item) => <TableActions><RecordDetailButton detail={buildPreorderDetail(item)} /></TableActions> },
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildPreorderDetail(item: PreorderRow) {
  return {
    title: item.code,
    subtitle: `${item.client} - ${item.date}`,
    badge: item.status.label,
    sections: [
      {
        title: "Cliente",
        rows: [
          { label: "Nombre", value: item.client },
          { label: "NIT", value: item.taxId },
          { label: "Telefono", value: item.phone },
          { label: "Direccion", value: item.address },
          { label: "Entrega", value: item.deliveryAddress },
        ],
      },
      {
        title: "Venta",
        rows: [
          { label: "Vendedor", value: item.seller },
          { label: "Bodega", value: item.warehouse },
          { label: "Pago", value: item.payment },
          { label: "Descuento", value: item.discount },
          { label: "Recibido", value: item.amountReceived },
          { label: "Cambio", value: item.change },
          { label: "Total", value: item.total },
        ],
      },
    ],
    items: item.items.map((row) => ({
      title: row.product,
      subtitle: `${row.color} - ${row.unitPrice}`,
      quantity: row.quantity,
      total: row.subtotal,
    })),
  };
}

function formatGTQ(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
