import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

async function getInventoryModuleDataRaw() {
  const [warehouses, balances, movements, producedProductRows] = await Promise.all([
    prisma.location.findMany({
      where: { type: "WAREHOUSE" },
      orderBy: [{ isFactoryWarehouse: "desc" }, { name: "asc" }],
    }),
    prisma.stockBalance.findMany({
      include: { product: true, location: true },
      orderBy: [{ location: { name: "asc" } }, { product: { name: "asc" } }],
    }),
    prisma.inventoryMovement.findMany({
      include: { product: true, fromLocation: true, toLocation: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.productionOutput.findMany({
      where: {
        producedQuantity: { gt: 0 },
        productionOrder: { status: "CLOSED" },
        product: { type: "FINISHED_GOOD", isActive: true },
      },
      select: { productId: true },
      distinct: ["productId"],
    }),
  ]);

  const warehouseStockCards = warehouses.map((warehouse) => {
    const warehouseBalances = balances.filter((balance) => balance.locationId === warehouse.id && balance.product.type === "FINISHED_GOOD");
    const totalFinished = warehouseBalances.reduce((sum, balance) => sum + Number(balance.quantity), 0);
    const groupedProducts = groupWarehouseProducts(warehouseBalances);

    return {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      isFactoryWarehouse: warehouse.isFactoryWarehouse,
      totalFinished: formatQuantity(totalFinished),
      products: groupedProducts,
    };
  });
  const finishedBalances = balances.filter((balance) => balance.product.type === "FINISHED_GOOD");
  const totalFinishedUnits = finishedBalances.reduce((sum, balance) => sum + Number(balance.quantity), 0);
  const totalInventoryValue = finishedBalances.reduce((sum, balance) => sum + Number(balance.quantity) * Number(balance.product.priceGTQ || 0), 0);
  const producedProductIds = new Set(producedProductRows.map((row) => row.productId));
  const adjustableBalances = balances.filter((balance) => balance.product.type === "FINISHED_GOOD" && balance.product.isActive && producedProductIds.has(balance.productId));
  const operationalCodes = buildOperationalProductCodeMap(adjustableBalances.map((balance) => balance.productId));
  return {
    warehouses,
    warehouseStockCards,
    adjustmentOptions: adjustableBalances.map((balance) => {
      const model = balance.product.modelName && balance.product.modelName.toLowerCase() !== "general" ? balance.product.modelName : balance.product.name;
      const color = balance.product.color || "Sin color";

      return {
        key: `${balance.productId}:${balance.locationId}`,
        productId: balance.productId,
        warehouseId: balance.locationId,
        productName: model,
        color,
        label: `${model} - ${color}`,
        sku: balance.product.sku,
        code: operationalCodes.get(balance.productId) || balance.product.sku,
        warehouse: balance.location.name,
        currentQuantity: Number(balance.quantity || 0),
        currentQuantityLabel: formatQuantity(Number(balance.quantity || 0)),
      };
    }),
    stockRows: balances.map((balance) => ({
      id: balance.id,
      sku: balance.product.sku,
      product: balance.product.name,
      modelName: balance.product.modelName || "Modelo general",
      color: balance.product.color || "Sin color",
      type: productTypeLabel(balance.product.type),
      warehouse: balance.location.name,
      isFactoryWarehouse: balance.location.isFactoryWarehouse,
      quantity: balance.quantity.toString(),
      minimumStock: balance.product.minimumStock.toString(),
      status: Number(balance.quantity) <= Number(balance.product.minimumStock) ? { label: "Stock bajo", tone: "warning" as const } : { label: "Disponible", tone: "success" as const },
    })),
    movements: movements.map((movement) => ({
      id: movement.id,
      code: movement.code,
      type: movementTypeLabel(movement.type),
      category: movementCategory(movement.type),
      tone: movementTone(movement.type),
      sign: movementSign(movement.type),
      product: movement.product.name,
      color: movement.product.color || "Sin color",
      from: movement.fromLocation?.name || "Origen externo",
      to: movement.toLocation?.name || "Salida",
      quantity: movement.quantity.toString(),
      unit: movement.product.unit,
      reason: movement.reason,
      reference: movement.reference || "",
      user: movement.createdBy.name,
      date: new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(movement.createdAt),
    })),
    stats: {
      warehouses: warehouses.length,
      factoryWarehouse: warehouses.find((warehouse) => warehouse.isFactoryWarehouse)?.name || "Sin asignar",
      productsInStock: balances.filter((balance) => Number(balance.quantity) > 0).length,
      lowStock: balances.filter((balance) => Number(balance.product.minimumStock) > 0 && Number(balance.quantity) <= Number(balance.product.minimumStock)).length,
      finishedUnits: formatQuantity(totalFinishedUnits),
      inventoryValue: formatGTQ(totalInventoryValue),
      finishedVariants: finishedBalances.filter((balance) => Number(balance.quantity) > 0).length,
    },
  };
}

export const getInventoryModuleData = unstable_cache(
  async () => {
    return getInventoryModuleDataRaw();
  },
  ["inventory-data"],
  {
    revalidate: 10,
    tags: ["inventory"],
  }
);

function groupWarehouseProducts(
  balances: Array<{
    product: {
      id: string;
      name: string;
      modelName: string | null;
      color: string | null;
      unit: string;
      catalogImageUrl: string | null;
      description: string | null;
    };
    quantity: unknown;
  }>,
) {
  const groups = new Map<string, {
    id: string;
    name: string;
    modelName: string;
    unit: string;
    imageUrl: string | null;
    description: string;
    total: number;
    colors: Map<string, number>;
  }>();

  for (const balance of balances) {
    const key = `${balance.product.name}|${balance.product.modelName || "General"}`;
    const existing = groups.get(key) || {
      id: balance.product.id,
      name: balance.product.name,
      modelName: balance.product.modelName || "General",
      unit: balance.product.unit,
      imageUrl: balance.product.catalogImageUrl,
      description: balance.product.description || "",
      total: 0,
      colors: new Map<string, number>(),
    };
    const quantity = Number(balance.quantity);
    const colorName = balance.product.color || "Sin color";
    existing.total += quantity;
    existing.colors.set(colorName, (existing.colors.get(colorName) || 0) + quantity);
    groups.set(key, existing);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      total: formatQuantity(group.total),
      colors: Array.from(group.colors.entries())
        .map(([color, quantity]) => ({ color, quantity: formatQuantity(quantity) }))
        .sort((a, b) => a.color.localeCompare(b.color, "es")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function createWarehouse(input: { code: string; name: string; isFactoryWarehouse: boolean }) {
  if (!input.code.trim() || !input.name.trim()) {
    throw new Error("Codigo y nombre de bodega son obligatorios.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.isFactoryWarehouse) {
      await tx.location.updateMany({ where: { type: "WAREHOUSE", isFactoryWarehouse: true }, data: { isFactoryWarehouse: false } });
    }

    return tx.location.create({
      data: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        type: "WAREHOUSE",
        isFactoryWarehouse: input.isFactoryWarehouse,
      },
    });
  });
}

export async function setFactoryWarehouse(locationId: string) {
  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.location.findFirst({ where: { id: locationId, type: "WAREHOUSE" } });

    if (!warehouse) {
      throw new Error("Bodega no encontrada.");
    }

    await tx.location.updateMany({ where: { type: "WAREHOUSE", isFactoryWarehouse: true }, data: { isFactoryWarehouse: false } });
    return tx.location.update({ where: { id: locationId }, data: { isFactoryWarehouse: true } });
  });
}

export async function adjustFinishedStock(input: {
  productId: string;
  warehouseId: string;
  physicalQuantity: string;
  reason: string;
  createdById: string;
}) {
  const physicalQuantity = parseQuantity(input.physicalQuantity);

  if (!input.productId || !input.warehouseId) {
    throw new Error("Selecciona producto y bodega para ajustar.");
  }

  if (!input.reason.trim()) {
    throw new Error("El motivo del ajuste es obligatorio.");
  }

  return prisma.$transaction(async (tx) => {
    const [product, warehouse, currentBalance] = await Promise.all([
      tx.product.findFirst({ where: { id: input.productId, type: "FINISHED_GOOD", isActive: true } }),
      tx.location.findFirst({ where: { id: input.warehouseId, type: "WAREHOUSE", isActive: true } }),
      tx.stockBalance.findUnique({ where: { productId_locationId: { productId: input.productId, locationId: input.warehouseId } } }),
    ]);

    if (!product) {
      throw new Error("Producto terminado no encontrado o inactivo.");
    }

    if (!warehouse) {
      throw new Error("Bodega no encontrada o inactiva.");
    }

    const currentQuantity = Number(currentBalance?.quantity || 0);
    const delta = physicalQuantity - currentQuantity;

    if (delta === 0) {
      throw new Error("La existencia fisica coincide con el sistema; no hay ajuste que registrar.");
    }

    await tx.stockBalance.upsert({
      where: { productId_locationId: { productId: product.id, locationId: warehouse.id } },
      update: { quantity: physicalQuantity },
      create: { productId: product.id, locationId: warehouse.id, quantity: physicalQuantity },
    });

    return tx.inventoryMovement.create({
      data: {
        code: buildMovementCode(delta > 0 ? "AJI" : "AJS"),
        type: delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
        productId: product.id,
        fromLocationId: delta < 0 ? warehouse.id : null,
        toLocationId: delta > 0 ? warehouse.id : null,
        quantity: Math.abs(delta),
        unitCost: product.priceGTQ,
        reason: input.reason.trim(),
        reference: `Conteo fisico: ${formatQuantity(physicalQuantity)}`,
        createdById: input.createdById,
      },
    });
  });
}

export async function updateFinishedProduct(input: {
  productId: string;
  sku: string;
  name: string;
  modelName?: string;
  color?: string;
  description?: string;
  priceGTQ?: string;
  unit: string;
  minimumStock: string;
}) {
  if (!input.productId) {
    throw new Error("Producto no encontrado.");
  }

  if (!input.sku.trim() || !input.name.trim()) {
    throw new Error("SKU y nombre son obligatorios.");
  }

  return prisma.product.update({
    where: { id: input.productId },
    data: {
      sku: input.sku.trim(),
      name: input.name.trim(),
      modelName: input.modelName?.trim() || null,
      color: input.color?.trim() || null,
      description: input.description?.trim() || null,
      priceGTQ: parseOptionalQuantity(input.priceGTQ),
      unit: input.unit.trim() || "unidad",
      minimumStock: parseQuantity(input.minimumStock),
    },
  });
}

export async function deactivateFinishedProduct(productId: string) {
  if (!productId) {
    throw new Error("Producto no encontrado.");
  }

  return prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });
}

export async function createFinishedProduct(input: {
  sku?: string;
  name: string;
  modelName?: string;
  color?: string;
  description?: string;
  priceGTQ?: string;
  unit: string;
  minimumStock: string;
  warehouseId: string;
  initialQuantity: string;
  createdById: string;
}) {
  const quantity = parseQuantity(input.initialQuantity);

  if (!input.name.trim()) {
    throw new Error("El nombre del producto es obligatorio.");
  }

  if (!input.warehouseId) {
    throw new Error("Selecciona una bodega para registrar existencia inicial.");
  }

  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.location.findFirst({ where: { id: input.warehouseId, type: "WAREHOUSE" } });

    if (!warehouse) {
      throw new Error("Bodega no encontrada.");
    }

    const product = await tx.product.create({
      data: {
        sku: input.sku?.trim() || await buildNextManualSku(tx),
        name: input.name.trim(),
        modelName: input.modelName?.trim() || null,
        color: input.color?.trim() || null,
        description: input.description?.trim() || null,
        priceGTQ: parseOptionalQuantity(input.priceGTQ),
        unit: input.unit.trim() || "unidad",
        minimumStock: parseQuantity(input.minimumStock),
        type: "FINISHED_GOOD",
      },
    });

    await tx.stockBalance.create({
      data: {
        productId: product.id,
        locationId: warehouse.id,
        quantity,
      },
    });

    if (quantity > 0) {
      await tx.inventoryMovement.create({
        data: {
          code: buildMovementCode("INI"),
          type: "ADJUSTMENT_IN",
          productId: product.id,
          toLocationId: warehouse.id,
          quantity,
          reason: "Existencia inicial al crear producto terminado",
          createdById: input.createdById,
        },
      });
    }

    return product;
  });
}

function parseQuantity(value: string) {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("La cantidad debe ser un numero mayor o igual a cero.");
  }

  return parsed;
}

function parseOptionalQuantity(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  return parseQuantity(value);
}

function buildMovementCode(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

async function buildNextManualSku(tx: Prisma.TransactionClient) {
  const products = await tx.product.findMany({
    where: { type: "FINISHED_GOOD", sku: { startsWith: "PT-" } },
    select: { sku: true },
  });
  const max = products.reduce((current, product) => {
    const match = product.sku.match(/^PT-(\d+)$/i);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);

  return `PT-${String(max + 1).padStart(3, "0")}`;
}

function formatQuantity(value: number) {
  return value.toLocaleString("es-GT", { maximumFractionDigits: 3 });
}

function buildOperationalProductCodeMap(productIds: string[]) {
  return new Map(productIds.map((id, index) => [id, `PT-${String(index + 1).padStart(3, "0")}`]));
}

function formatGTQ(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function productTypeLabel(type: string) {
  return type === "FINISHED_GOOD" ? "Producto terminado" : type === "RAW_MATERIAL" ? "Materia prima" : "Producto";
}

function movementTypeLabel(type: string) {
  const labels: Record<string, string> = {
    PURCHASE_IN: "Entrada por compra",
    ADJUSTMENT_IN: "Entrada inicial",
    ADJUSTMENT_OUT: "Ajuste de salida",
    PRODUCTION_IN: "Produccion",
    CONSUMPTION_OUT: "Consumo de produccion",
    TRANSFER_IN: "Traslado entrada",
    TRANSFER_OUT: "Traslado salida",
    SALE_OUT: "Salida venta",
    WASTE_OUT: "Merma",
    RETURN_IN: "Devolucion",
  };

  return labels[type] || type;
}

function movementCategory(type: string) {
  if (type === "PRODUCTION_IN" || type === "CONSUMPTION_OUT") return "Produccion";
  if (type === "SALE_OUT") return "Venta / despacho";
  if (type.startsWith("TRANSFER")) return "Traslado";
  if (type.startsWith("ADJUSTMENT")) return "Ajuste";
  if (type === "PURCHASE_IN") return "Entrada";
  if (type === "RETURN_IN") return "Devolucion";
  if (type === "WASTE_OUT") return "Merma";
  return "Movimiento";
}

function movementTone(type: string) {
  if (type.endsWith("_IN")) return "in" as const;
  if (type === "SALE_OUT" || type === "WASTE_OUT" || type === "CONSUMPTION_OUT") return "out" as const;
  if (type === "TRANSFER_OUT") return "transfer" as const;
  return "neutral" as const;
}

function movementSign(type: string) {
  return type.endsWith("_IN") ? "+" : "-";
}
