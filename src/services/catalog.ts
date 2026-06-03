import { prisma } from "@/lib/prisma";

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
  let synced = 0;
  let nextNumber = await getNextFinishedProductNumber();

  for (const product of products) {
    const rows = normalizeCatalogProduct(product);
    const activeExternalIds = Array.from(new Set(rows.map((row) => row.catalogExternalId)));
    const catalogProductId = rows[0]?.catalogProductId;

    if (catalogProductId) {
      await prisma.product.updateMany({
        where: {
          type: "FINISHED_GOOD",
          catalogProductId,
          catalogExternalId: { notIn: activeExternalIds },
        },
        data: { isActive: false },
      });
    }

    for (const row of rows) {
      const existingByCombination = await prisma.product.findFirst({
        where: {
          type: "FINISHED_GOOD",
          catalogProductId: row.catalogProductId,
          modelName: row.modelName,
          color: row.color,
        },
      });
      const operationalSku = existingByCombination?.sku || row.sku || buildSequentialSku(nextNumber++);
      const existing = await prisma.product.findFirst({
        where: {
          type: "FINISHED_GOOD",
          OR: [
            { catalogExternalId: row.catalogExternalId },
            { sku: operationalSku },
            {
              catalogProductId: row.catalogProductId,
              modelName: row.modelName,
              color: row.color,
            },
          ],
        },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            sku: existing.sku || operationalSku,
            name: row.name,
            modelName: row.modelName,
            color: row.color,
            unit: "unidad",
            type: "FINISHED_GOOD",
            catalogProductId: row.catalogProductId,
            catalogImageUrl: row.catalogImageUrl,
            description: row.description,
            priceGTQ: row.priceGTQ,
            isActive: true,
          },
        });
      } else {
        await prisma.product.create({
          data: {
            sku: operationalSku,
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
  }

  return { synced };
}

export async function getCatalogProductCards() {
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
      const externalKey = `${catalogProductId}::${modelName}::${colorName}`;
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
  return cleaned.toLowerCase();
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

async function getNextFinishedProductNumber() {
  const products = await prisma.product.findMany({
    where: { type: "FINISHED_GOOD", sku: { startsWith: "PT-" } },
    select: { sku: true },
  });

  const max = products.reduce((current, product) => {
    const match = product.sku.match(/^PT-(\d+)$/i);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);

  return max + 1;
}

function buildSequentialSku(number: number) {
  return `PT-${String(number).padStart(3, "0")}`;
}
