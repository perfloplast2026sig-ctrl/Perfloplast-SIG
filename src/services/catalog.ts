import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

const DEFAULT_AUTO_SYNC_INTERVAL_MINUTES = 15;
let autoSyncPromise: Promise<CatalogSyncResult> | null = null;

type CatalogColor = {
  name?: string;
  hex?: string;
  image?: string;
};

type CatalogModel = {
  name?: string;
  description?: string;
  price?: string | number;
  image?: string;
  colors?: CatalogColor[];
};

type CatalogProduct = {
  _id?: string;
  id?: string | number;
  externalId?: string;
  external_id?: string;
  name?: string;
  description?: string;
  price?: string | number;
  image?: string;
  image_url?: string;
  colors?: CatalogColor[];
  types?: CatalogModel[];
  variants?: CatalogModel[];
};

type CatalogSyncResult = {
  synced: number;
  mode: "manual" | "automatic" | "skipped";
  reason?: string;
};

export async function fetchCatalogProducts() {
  const url = process.env.CATALOG_PRODUCTS_API_URL || process.env.NEXT_PUBLIC_CATALOG_PRODUCTS_API_URL;

  if (!url) {
    throw new Error("Configura CATALOG_PRODUCTS_API_URL en .env con la URL del catalogo en Vercel, por ejemplo https://tu-catalogo.vercel.app/api/products.");
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`No se pudo leer el catalogo externo: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data as CatalogProduct[] : [];
}

export async function syncCatalogProducts() {
  const products = await fetchCatalogProducts();
  const rows = products.flatMap(normalizeCatalogProduct).sort(compareCatalogRows);
  const activeExternalIdsByProduct = new Map<string, string[]>();

  for (const row of rows) {
    activeExternalIdsByProduct.set(row.catalogProductId, [...(activeExternalIdsByProduct.get(row.catalogProductId) || []), row.catalogExternalId]);
  }

  return prisma.$transaction(async (tx) => {
    let synced = 0;

    for (const [catalogProductId, activeExternalIds] of activeExternalIdsByProduct) {
      await tx.product.updateMany({
        where: {
          type: "FINISHED_GOOD",
          catalogProductId,
          catalogExternalId: { notIn: Array.from(new Set(activeExternalIds)) },
        },
        data: { isActive: false },
      });
    }

    const externalIds = rows.map((row) => row.catalogExternalId);
    const catalogProductIds = Array.from(activeExternalIdsByProduct.keys());
    const existingProducts = await tx.product.findMany({
      where: {
        type: "FINISHED_GOOD",
        OR: [
          { catalogExternalId: { in: externalIds } },
          { catalogProductId: { in: catalogProductIds } },
        ],
      },
    });
    const matchedIds = new Set<string>();
    const plannedRows = rows.map((row, index) => {
      const existing = existingProducts.find((product) => {
        if (matchedIds.has(product.id)) return false;
        if (product.catalogExternalId === row.catalogExternalId) return true;
        return product.catalogProductId === row.catalogProductId && normalizeKey(product.modelName || "General") === normalizeKey(row.modelName) && normalizeKey(product.color || "Sin color") === normalizeKey(row.color);
      });

      if (existing) matchedIds.add(existing.id);
      return { row, existing, sku: buildSequentialSku(index + 1) };
    });
    const existingIds = plannedRows.flatMap((item) => item.existing ? [item.existing.id] : []);
    const targetSkus = plannedRows.map((item) => item.sku);
    const conflicts = await tx.product.findMany({
      where: {
        type: "FINISHED_GOOD",
        sku: { in: targetSkus },
        ...(existingIds.length > 0 ? { id: { notIn: existingIds } } : {}),
      },
      select: { sku: true, name: true },
      take: 1,
    });

    if (conflicts.length > 0) {
      throw new Error(`No se puede ordenar el catalogo desde PT-001 porque ${conflicts[0].sku} ya existe en ${conflicts[0].name}. Cambia ese SKU y vuelve a sincronizar.`);
    }

    for (const item of plannedRows) {
      if (item.existing && item.existing.sku !== item.sku) {
        await tx.product.update({
          where: { id: item.existing.id },
          data: { sku: `SYNC-${item.existing.id.slice(-12)}` },
        });
      }
    }

    for (const { row, existing, sku } of plannedRows) {
      if (existing) {
        await tx.product.update({
          where: { id: existing.id },
          data: {
            sku,
            name: row.name,
            modelName: row.modelName,
            color: row.color,
            unit: "unidad",
            type: "FINISHED_GOOD",
            catalogExternalId: row.catalogExternalId,
            catalogProductId: row.catalogProductId,
            catalogImageUrl: row.catalogImageUrl,
            description: row.description,
            priceGTQ: row.priceGTQ,
            isActive: true,
          },
        });
      } else {
        await tx.product.create({
          data: {
            sku,
            name: row.name,
            modelName: row.modelName,
            color: row.color,
            unit: "unidad",
            type: "FINISHED_GOOD",
            catalogExternalId: row.catalogExternalId,
            catalogProductId: row.catalogProductId,
            catalogImageUrl: row.catalogImageUrl,
            description: row.description,
            priceGTQ: row.priceGTQ,
          },
        });
      }
      synced += 1;
    }

    return { synced, mode: "manual" as const };
  });
}

export async function syncCatalogProductsIfStale(): Promise<CatalogSyncResult> {
  if (process.env.CATALOG_AUTO_SYNC_ENABLED === "false") {
    return { synced: 0, mode: "skipped", reason: "disabled" };
  }

  if (!process.env.CATALOG_PRODUCTS_API_URL && !process.env.NEXT_PUBLIC_CATALOG_PRODUCTS_API_URL) {
    return { synced: 0, mode: "skipped", reason: "missing_url" };
  }

  if (autoSyncPromise) return autoSyncPromise;

  autoSyncPromise = syncCatalogProductsIfStaleUncached().finally(() => {
    autoSyncPromise = null;
  });

  return autoSyncPromise;
}

async function syncCatalogProductsIfStaleUncached(): Promise<CatalogSyncResult> {
  const intervalMinutes = Number(process.env.CATALOG_AUTO_SYNC_INTERVAL_MINUTES || DEFAULT_AUTO_SYNC_INTERVAL_MINUTES);
  const minimumAgeMs = Math.max(1, Number.isFinite(intervalMinutes) ? intervalMinutes : DEFAULT_AUTO_SYNC_INTERVAL_MINUTES) * 60 * 1000;
  const latestCatalogProduct = await prisma.product.findFirst({
    where: { type: "FINISHED_GOOD", catalogExternalId: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  if (latestCatalogProduct && Date.now() - latestCatalogProduct.updatedAt.getTime() < minimumAgeMs) {
    return { synced: 0, mode: "skipped", reason: "fresh" };
  }

  try {
    const result = await syncCatalogProducts();
    return { ...result, mode: "automatic" };
  } catch (error) {
    return { synced: 0, mode: "skipped", reason: error instanceof Error ? error.message : "sync_failed" };
  }
}

export async function getCatalogProductCardsFresh() {
  const products = await prisma.product.findMany({
    where: { type: "FINISHED_GOOD", catalogExternalId: { not: null }, isActive: true },
    orderBy: [{ name: "asc" }, { modelName: "asc" }, { color: "asc" }],
  });

  return products.map((product) => ({
    id: product.id,
    sku: product.sku,
    catalogProductId: product.catalogProductId || product.id,
    name: product.name,
    modelName: product.modelName || "Modelo general",
    color: product.color || "Sin color",
    unit: product.unit,
    minimumStock: product.minimumStock.toString(),
    priceValue: product.priceGTQ?.toString() || "",
    price: product.priceGTQ ? `Q ${Number(product.priceGTQ).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Sin precio",
    image: product.catalogImageUrl,
    description: product.description || "Sin descripcion",
  }));
}

export const getCatalogProductCards = unstable_cache(
  async () => {
    return getCatalogProductCardsFresh();
  },
  ["catalog-data"],
  {
    revalidate: 10,
    tags: ["catalog"],
  }
);

function normalizeCatalogProduct(product: CatalogProduct) {
  const catalogProductId = String(product.externalId || product.external_id || product.id || product._id || product.name || crypto.randomUUID());
  const productName = cleanText(product.name) || "Producto sin nombre";
  const modelRows = product.types?.length ? product.types : product.variants?.length ? product.variants : [];
  const baseModel: CatalogModel = {
    name: productName,
    price: product.price,
    description: product.description,
    image: product.image || product.image_url,
    colors: product.colors,
  };
  const normalizedModelRows = modelRows.filter((model) => {
    const modelName = cleanText(model.name) || "General";
    return normalizeKey(modelName) !== "general";
  });
  const models = [baseModel, ...normalizedModelRows].filter((model, index, rows) => {
    const modelName = cleanText(model.name) || "General";
    return rows.findIndex((row) => normalizeKey(cleanText(row.name) || "General") === normalizeKey(modelName)) === index;
  });

  const rows = models.flatMap((model) => {
    const modelName = cleanText(model.name) || "General";
    const colors = uniqueColors(model.colors?.length ? model.colors : product.colors?.length ? product.colors : [{ name: "Sin color" }]);
    const price = parsePrice(model.price ?? product.price);
    const image = model.image || product.image || product.image_url || null;
    const description = model.description || product.description || null;

    return colors.map((color) => {
      const colorName = canonicalColorName(color.name);
      const externalKey = `${catalogProductId}::${normalizeKey(modelName)}::${normalizeKey(colorName)}`;
      return {
        catalogExternalId: externalKey,
        catalogProductId,
        sku: "",
        name: productName,
        modelName,
        color: colorName,
        catalogImageUrl: color.image || image,
        description,
        priceGTQ: price,
      };
    });
  });

  const uniqueRows = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    uniqueRows.set(`${normalizeKey(row.catalogProductId)}::${normalizeKey(row.modelName)}::${normalizeKey(row.color)}`, row);
  }

  return Array.from(uniqueRows.values());
}

function parsePrice(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/[Q,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value?: string) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function normalizeKey(value: string) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function canonicalColorName(value?: string) {
  const cleaned = cleanText(value) || "Sin color";
  const aliases: Record<string, string> = {
    "sin color": "Sin color",
    transparente: "Transparente",
    trans: "Transparente",
    cristal: "Cristal",
    blanco: "Blanco",
    blanca: "Blanco",
    negro: "Negro",
    negra: "Negro",
    rojo: "Rojo",
    roja: "Rojo",
    azul: "Azul",
    celeste: "Celeste",
    verde: "Verde",
    amarillo: "Amarillo",
    amarilla: "Amarillo",
    naranja: "Naranja",
    morado: "Morado",
    morada: "Morado",
    rosado: "Rosado",
    rosada: "Rosado",
    cafe: "Cafe",
    marron: "Cafe",
    gris: "Gris",
  };
  const key = normalizeKey(cleaned);
  return aliases[key] || toTitleCase(cleaned);
}

function uniqueColors(colors: CatalogColor[]) {
  const map = new Map<string, CatalogColor>();

  for (const color of colors) {
    const name = canonicalColorName(color.name);
    if (!map.has(normalizeKey(name))) {
      map.set(normalizeKey(name), { ...color, name });
    }
  }

  return Array.from(map.values());
}

function buildSequentialSku(number: number) {
  return `PT-${String(number).padStart(3, "0")}`;
}

function compareCatalogRows(a: ReturnType<typeof normalizeCatalogProduct>[number], b: ReturnType<typeof normalizeCatalogProduct>[number]) {
  return catalogDisplayTitle(a).localeCompare(catalogDisplayTitle(b), "es")
    || a.name.localeCompare(b.name, "es")
    || a.modelName.localeCompare(b.modelName, "es")
    || a.color.localeCompare(b.color, "es")
    || a.catalogExternalId.localeCompare(b.catalogExternalId, "es");
}

function toTitleCase(value: string) {
  return normalizeSpacing(value.toLowerCase()).replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function normalizeSpacing(value: string) {
  return value.replace(/[\s_-]+/g, " ").trim();
}

function catalogDisplayTitle(row: ReturnType<typeof normalizeCatalogProduct>[number]) {
  const model = row.modelName.trim();

  if (model && model.toLowerCase() !== "general" && model.toLowerCase() !== row.name.trim().toLowerCase()) {
    return model;
  }

  return row.name;
}
