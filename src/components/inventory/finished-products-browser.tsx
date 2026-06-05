"use client";

import { Edit3, Eye, FilterX, ImageIcon, List, RefreshCw, Search, Trash2 } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { syncCatalogProductsAction } from "@/actions/catalog";
import { deactivateFinishedProductAction, updateFinishedProductAction } from "@/actions/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

type FinishedProduct = {
  id: string;
  sku: string;
  catalogProductId: string;
  name: string;
  modelName: string;
  color: string;
  unit: string;
  minimumStock: string;
  priceValue: string;
  price: string;
  image: string | null;
  description: string;
};

type ProductGroup = {
  id: string;
  code: string;
  sku: string;
  title: string;
  baseName: string;
  modelName: string;
  colors: string[];
  colorText: string;
  price: string;
  priceValue: string;
  image: string | null;
  description: string;
  unit: string;
  minimumStock: string;
  variants: FinishedProduct[];
};

type FilterState = {
  query: string;
  product: string;
  model: string;
  color: string;
};

const emptyFilters: FilterState = {
  query: "",
  product: "Todos",
  model: "Todos",
  color: "Todos",
};

export function FinishedProductsBrowser({ products }: { products: FinishedProduct[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const productGroups = useMemo(() => buildProductGroups(products), [products]);
  const [selectedId, setSelectedId] = useState(productGroups[0]?.id || "");
  const [editingId, setEditingId] = useState("");

  const options = useMemo(() => ({
    products: unique(productGroups.map((product) => product.title)),
    models: unique(productGroups.map((product) => product.modelName)),
    colors: unique(productGroups.flatMap((product) => product.colors)),
  }), [productGroups]);

  const filteredProducts = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return productGroups.filter((product) => {
      const matchesQuery = !query || [product.title, product.baseName, product.modelName, product.colorText, product.code, product.description].some((value) => value.toLowerCase().includes(query));
      const matchesProduct = filters.product === "Todos" || product.title === filters.product;
      const matchesModel = filters.model === "Todos" || product.modelName === filters.model;
      const matchesColor = filters.color === "Todos" || product.colors.includes(filters.color);

      return matchesQuery && matchesProduct && matchesModel && matchesColor;
    });
  }, [filters, productGroups]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedProducts = filteredProducts.slice(start, start + pageSize);

  const selectedProduct = filteredProducts.find((product) => product.id === selectedId) || filteredProducts[0] || productGroups[0];
  const isEditing = selectedProduct?.id === editingId;

  return (
    <SectionCard title="Catalogo de productos terminados" className="mt-6" action={<List className="text-accent" size={20} />}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{productGroups.length} productos agrupados - {products.length} variantes/color sincronizadas</p>
          <p className="mt-1 text-xs text-muted">Administra producto, modelo, color, precio e imagen. Para corregir existencias usa Ajustar stock.</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition hover:bg-card-muted sm:w-auto" onClick={() => setIsOpen((value) => !value)} type="button">
            <List size={16} /> {isOpen ? "Ocultar productos terminados" : "Ver productos terminados"}
          </button>
          <form action={syncCatalogProductsAction}>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90 sm:w-auto" type="submit">
              <RefreshCw size={16} /> Sincronizar
            </button>
          </form>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-5 space-y-4">
          {products.length === 0 ? (
            <div className="rounded-2xl border bg-card-muted/60 p-4 text-sm leading-6 text-muted">
              Aun no hay productos sincronizados. Configura `CATALOG_PRODUCTS_API_URL` en `.env` y presiona sincronizar.
            </div>
          ) : (
            <>
              <div className="grid gap-3 rounded-2xl border bg-card-muted/45 p-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
                  <input className="h-10 w-full rounded-xl border bg-card pl-10 pr-3 text-sm outline-none focus:border-accent" onChange={(event) => updateFilter(setFilters, "query", event.target.value)} placeholder="Buscar por nombre, codigo o modelo..." value={filters.query} />
                </label>
                <FilterSelect label="Producto" onChange={(value) => updateFilter(setFilters, "product", value)} options={options.products} value={filters.product} />
                <FilterSelect label="Modelo" onChange={(value) => updateFilter(setFilters, "model", value)} options={options.models} value={filters.model} />
                <FilterSelect label="Color" onChange={(value) => updateFilter(setFilters, "color", value)} options={options.colors} value={filters.color} />
                <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-card px-3 text-sm font-medium transition hover:bg-card-muted" onClick={() => setFilters(emptyFilters)} type="button">
                  <FilterX size={16} /> Limpiar
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <div className="overflow-hidden rounded-2xl border">
                  <div className="max-h-[70vh] overflow-auto">
                    <table className="min-w-[940px] divide-y divide-border text-sm">
                      <thead className="bg-card-muted/80 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        <tr>
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">Codigo</th>
                          <th className="px-4 py-3">Colores</th>
                          <th className="px-4 py-3">Modelo</th>
                          <th className="px-4 py-3 text-right">Precio</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {pagedProducts.map((product) => (
                          <tr key={product.id} className={`transition hover:bg-card-muted/60 ${selectedProduct?.id === product.id ? "bg-card-muted/70" : ""}`}>
                            <td className="px-4 py-3">
                              <button className="flex min-w-[230px] items-center gap-3 text-left" onClick={() => { setSelectedId(product.id); setEditingId(""); }} type="button">
                                <ProductImage image={product.image} name={product.title} />
                                <span>
                                  <span className="block font-semibold">{product.title}</span>
                                  <span className="line-clamp-1 max-w-[260px] text-xs text-muted">{product.description}</span>
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold">{product.code}</td>
                            <td className="px-4 py-3"><ColorList colors={product.colors} /></td>
                            <td className="px-4 py-3">{product.modelName}</td>
                            <td className="px-4 py-3 text-right font-semibold">{product.price}</td>
                            <td className="px-4 py-3"><Badge label="Activo" tone="success" /></td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <IconButton label="Ver detalle" onClick={() => { setSelectedId(product.id); setEditingId(""); }}><Eye size={16} /></IconButton>
                                <IconButton label="Editar" onClick={() => { setSelectedId(product.id); setEditingId(product.id); }}><Edit3 size={16} /></IconButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-3 border-t bg-card-muted/45 px-4 py-3 text-xs font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
                    <span>Mostrando {filteredProducts.length === 0 ? 0 : start + 1}-{Math.min(start + pageSize, filteredProducts.length)} de {filteredProducts.length} productos filtrados</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="rounded-full border bg-card px-3 py-1.5 transition hover:bg-card-muted disabled:cursor-not-allowed disabled:opacity-45" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Anterior</button>
                      <span>Pagina {currentPage} de {totalPages}</span>
                      <button className="rounded-full border bg-card px-3 py-1.5 transition hover:bg-card-muted disabled:cursor-not-allowed disabled:opacity-45" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button">Siguiente</button>
                    </div>
                  </div>
                </div>

                <ProductDetail product={selectedProduct} isEditing={isEditing} onEdit={() => selectedProduct ? setEditingId(selectedProduct.id) : undefined} />
              </div>
            </>
          )}
        </div>
      ) : null}
    </SectionCard>
  );
}

function ProductDetail({ product, isEditing, onEdit }: { product: ProductGroup | undefined; isEditing: boolean; onEdit: () => void }) {
  if (!product) {
    return (
      <aside className="rounded-2xl border bg-card p-4 text-sm text-muted">
        Selecciona un producto para ver su detalle.
      </aside>
    );
  }

  return (
    <aside className="rounded-2xl border bg-card p-4">
      <div className="aspect-[1.6/1] overflow-hidden rounded-2xl border bg-card-muted">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={product.title} className="h-full w-full object-contain" src={product.image} />
        ) : (
          <div className="flex h-full items-center justify-center"><ImageIcon className="text-muted" size={34} /></div>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{product.title}</h3>
          <p className="mt-1 text-xs text-muted">{product.baseName}</p>
        </div>
        <Badge label="Activo" tone="success" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Codigo" value={product.code} />
        <Detail label="Modelo" value={product.modelName} />
        <Detail label="Precio" value={product.price} />
        <Detail label="Stock minimo" value={product.minimumStock} />
        <Detail label="Unidad" value={product.unit} />
      </dl>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Colores</p>
        <div className="mt-2"><ColorList colors={product.colors} /></div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Descripcion</p>
        <p className="mt-2 text-sm leading-6 text-muted">{product.description}</p>
      </div>

      {isEditing ? <EditProductGroup group={product} /> : (
        <div className="mt-4 grid gap-2 sm:flex">
          <Button className="flex-1" onClick={onEdit} type="button"><Edit3 size={16} /> Editar</Button>
          <form action={deactivateFinishedProductAction}>
            <input name="productId" type="hidden" value={product.variants[0]?.id || ""} />
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 text-sm font-medium text-red-700 transition hover:bg-red-500/15 sm:w-auto dark:text-red-300" type="submit">
              <Trash2 size={16} />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}

function EditProductGroup({ group }: { group: ProductGroup }) {
  const product = group.variants[0];

  if (!product) {
    return null;
  }

  return (
    <form action={updateFinishedProductAction} className="mt-4 grid gap-3">
      <input name="productId" type="hidden" value={product.id} />
      <input name="unit" type="hidden" value={product.unit} />
      <input name="sku" type="hidden" value={product.sku} />
      <CompactField label="Codigo" name="displayCode" value={group.code} required />
      <CompactField label="Nombre base" name="name" value={product.name} required />
      <CompactField label="Modelo" name="modelName" value={product.modelName} />
      <CompactField label="Color principal" name="color" value={product.color} />
      <div className="grid gap-3 sm:grid-cols-2">
        <CompactField label="Precio Q" name="priceGTQ" type="number" value={product.priceValue} />
        <CompactField label="Minimo" name="minimumStock" type="number" value={product.minimumStock} />
      </div>
      <CompactField label="Descripcion" name="description" value={product.description === "Sin descripcion" ? "" : product.description} />
      <Button type="submit"><Edit3 size={16} /> Guardar cambios</Button>
    </form>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select className="h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-accent" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="Todos">{label}: Todos</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ProductImage({ image, name }: { image: string | null; name: string }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card-muted">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="h-full w-full object-cover" src={image} />
      ) : (
        <ImageIcon className="text-muted" size={20} />
      )}
    </span>
  );
}

function ColorList({ colors }: { colors: string[] }) {
  return (
    <div className="flex max-w-[260px] flex-wrap gap-1.5">
      {colors.map((color) => (
        <span key={color} className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
          <span className="size-2 rounded-full border bg-card" />
          {color}
        </span>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function CompactField({ label, name, value, type = "text", required = false }: { label: string; name: string; value: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <input className="h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-accent" defaultValue={value} min={type === "number" ? 0 : undefined} name={name} required={required} step={type === "number" ? "0.001" : undefined} type={type} />
    </label>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button aria-label={label} className="inline-flex size-9 items-center justify-center rounded-full border bg-card transition hover:bg-card-muted" onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

function productTitle(product: FinishedProduct) {
  const model = product.modelName.trim();

  if (model && model.toLowerCase() !== "general" && model.toLowerCase() !== product.name.trim().toLowerCase()) {
    return model;
  }

  return product.name;
}

function buildProductGroups(products: FinishedProduct[]) {
  const grouped = new Map<string, Omit<ProductGroup, "code">>();

  for (const product of products) {
    const title = productTitle(product);
    const key = `${title}::${product.priceValue || product.price}`;
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, {
        id: key,
        sku: product.sku,
        title,
        baseName: product.name,
        modelName: product.modelName,
        colors: [product.color],
        colorText: product.color,
        price: product.price,
        priceValue: product.priceValue,
        image: product.image,
        description: product.description,
        unit: product.unit,
        minimumStock: product.minimumStock,
        variants: [product],
      });
      continue;
    }

    current.variants.push(product);
    current.image ||= product.image;
    if (!current.colors.includes(product.color)) {
      current.colors.push(product.color);
      current.colorText = current.colors.join(" ");
    }
    if (current.description === "Sin descripcion" && product.description !== "Sin descripcion") current.description = product.description;
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.title.localeCompare(b.title, "es"))
    .map((group, index) => ({ ...group, code: displayProductCode(index) }));
}

function displayProductCode(index: number) {
  return `PT-${String(index + 1).padStart(3, "0")}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function updateFilter(setFilters: Dispatch<SetStateAction<FilterState>>, key: keyof FilterState, value: string) {
  setFilters((current) => ({ ...current, [key]: value }));
}
