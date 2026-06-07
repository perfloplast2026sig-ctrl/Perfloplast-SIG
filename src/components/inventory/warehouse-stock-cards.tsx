"use client";

import { useMemo, useState } from "react";
import { Boxes, ChevronRight, PackageOpen, Warehouse, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";

type WarehouseStockCard = {
  id: string;
  code: string;
  name: string;
  isFactoryWarehouse: boolean;
  totalFinished: string;
  products: Array<{
    id: string;
    name: string;
    modelName: string;
    unit: string;
    imageUrl: string | null;
    description: string;
    total: string;
    colors: Array<{ color: string; quantity: string }>;
  }>;
};

export function WarehouseStockCards({ warehouses }: { warehouses: WarehouseStockCard[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === selectedId) || null,
    [selectedId, warehouses],
  );

  if (warehouses.length === 0) {
    return <p className="rounded-2xl border bg-card-muted/60 p-4 text-sm text-muted">Aun no hay bodegas creadas.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {warehouses.map((warehouse) => {
          return (
            <button
              key={warehouse.id}
              className="group rounded-2xl border bg-card p-4 text-left transition hover:border-accent/50 hover:bg-card-muted/50"
              onClick={() => {
                setSelectedId(warehouse.id);
                setPage(1);
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{warehouse.name}</h3>
                    {warehouse.isFactoryWarehouse ? <Badge label="Fabrica" tone="success" /> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">{warehouse.code}</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border bg-card-muted text-muted transition group-hover:text-foreground">
                  <Warehouse size={18} />
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Unidades" value={warehouse.totalFinished} />
                <Metric label="Productos" value={String(warehouse.products.length)} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm font-medium">
                <span>Ver productos</span>
                <ChevronRight className="text-muted transition group-hover:text-accent" size={17} />
              </div>
            </button>
          );
        })}
      </div>

      {selectedWarehouse ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Productos por bodega</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight">{selectedWarehouse.name}</h3>
                <p className="mt-1 text-sm text-muted">{selectedWarehouse.code} · {selectedWarehouse.products.length} productos agrupados por modelo y color</p>
              </div>
              <button className="grid size-10 place-items-center rounded-full border bg-card-muted transition hover:bg-card" onClick={() => setSelectedId(null)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[calc(90vh-92px)] overflow-y-auto">
              <WarehouseDetail page={page} setPage={setPage} warehouse={selectedWarehouse} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WarehouseDetail({ page, setPage, warehouse }: { page: number; setPage: (page: number) => void; warehouse: WarehouseStockCard }) {
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(warehouse.products.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleProducts = warehouse.products.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Detalle por bodega</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold">{warehouse.name}</h3>
            {warehouse.isFactoryWarehouse ? <Badge label="Fabrica" tone="success" /> : null}
          </div>
          <p className="mt-1 text-sm text-muted">{warehouse.code} · {warehouse.products.length} productos agrupados por modelo y color</p>
        </div>
        <div className="rounded-2xl border bg-card-muted/50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Existencia final</p>
          <p className="mt-1 text-2xl font-semibold">{warehouse.totalFinished}</p>
        </div>
      </div>

      <div className="p-5">
        {warehouse.products.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-2xl border bg-card-muted/40 p-6 text-center">
            <div>
              <PackageOpen className="mx-auto text-muted" size={30} />
              <p className="mt-3 font-semibold">Sin producto terminado en esta bodega</p>
              <p className="mt-1 text-sm text-muted">Cuando produccion o inventario registre existencias, apareceran agrupadas aqui.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {visibleProducts.map((product, index) => (
                <ProductRow key={`${warehouse.id}-${product.id}-${product.modelName}`} index={(safePage - 1) * pageSize + index + 1} product={product} />
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card-muted/35 p-3">
                <p className="text-sm font-medium text-muted">
                  Mostrando {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, warehouse.products.length)} de {warehouse.products.length}
                </p>
                <PaginationControls currentPage={safePage} onPageChange={setPage} totalPages={totalPages} />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductRow({ index, product }: { index: number; product: WarehouseStockCard["products"][number] }) {
  return (
    <div className="grid gap-4 rounded-2xl border bg-card-muted/30 p-4 lg:grid-cols-[minmax(260px,1fr)_minmax(280px,1.4fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-card text-xs font-black text-muted">{index}</span>
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-card">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-contain p-1" src={product.imageUrl} />
          ) : (
            <Boxes className="text-muted" size={19} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{product.name}</p>
          <p className="truncate text-sm text-muted">{product.modelName}</p>
          {product.description ? <p className="mt-1 max-w-xl truncate text-xs text-muted">{product.description}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {product.colors.map((color) => (
          <span key={`${product.id}-${color.color}`} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold">
            <span className="size-2 rounded-full bg-accent/70" />
            {color.color}
            <span className="text-muted">{color.quantity}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 lg:block lg:text-right">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Total</p>
        <p className="font-semibold">{product.total} {product.unit}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card-muted/45 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
