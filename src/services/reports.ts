import { prisma } from "@/lib/prisma";

export async function getReportsData() {
  const today = startOfDay(new Date());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekStart = addDays(today, -6);
  const reportDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    return {
      key: toDateInputValue(date),
      label: date.toLocaleDateString("es-GT", { weekday: "short" }).replace(".", ""),
    };
  });

  const [sales, monthSales, invoices, production, dispatches, movements, recentMovements, sellerRows, warehouses, products, clients, drivers, salesRows] = await Promise.all([
    prisma.preorder.aggregate({ _sum: { totalGTQ: true }, _count: true, where: { status: { notIn: ["CANCELLED", "QUOTE"] } } }),
    prisma.preorder.aggregate({ _sum: { totalGTQ: true }, _count: true, where: { createdAt: { gte: monthStart }, status: { notIn: ["CANCELLED", "QUOTE"] } } }),
    prisma.invoice.count(),
    prisma.productionOrder.findMany({ where: { status: { not: "CANCELLED" } }, select: { shift: true, producedQuantity: true, outputs: { select: { producedQuantity: true } } } }),
    prisma.dispatch.groupBy({ by: ["status"], _count: true }),
    prisma.inventoryMovement.count(),
    prisma.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { product: true, fromLocation: true, toLocation: true, createdBy: true },
    }),
    prisma.preorder.findMany({
      where: { createdAt: { gte: weekStart }, status: { notIn: ["CANCELLED", "QUOTE"] } },
      include: { createdBy: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.location.findMany({ where: { type: "WAREHOUSE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 80, select: { id: true, name: true, modelName: true, color: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, take: 80, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: { name: "Piloto" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.preorder.findMany({
      where: { status: { notIn: ["CANCELLED", "QUOTE"] } },
      include: { client: true, createdBy: true, items: { include: { product: { include: { category: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const warehouseById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
  const producedUnits = production.reduce((sum, order) => sum + Math.max(Number(order.producedQuantity), order.outputs.reduce((inner, output) => inner + Number(output.producedQuantity), 0)), 0);
  const productionByShift = buildProductionByShift(production);
  const delivered = dispatches.find((row) => row.status === "DELIVERED")?._count || 0;
  const openDispatches = dispatches.filter((row) => ["SCHEDULED", "LOADED", "IN_ROUTE", "RETURN_REQUESTED", "RESCHEDULED"].includes(row.status)).reduce((sum, row) => sum + row._count, 0);
  const normalizedSales = salesRows.map((row) => {
    const productNames = unique(row.items.map((item) => productTitle(item.product)));
    const itemSummary = row.items.map((item) => ({
      product: productTitle(item.product),
      category: item.product.category?.name || "Sin categoria",
      quantity: Number(item.quantity),
      income: Number(item.quantity) * Number(item.unitPrice),
    }));
    const total = Number(row.totalGTQ);
    return {
      id: row.id,
      code: row.code,
      dateKey: toDateInputValue(row.createdAt),
      dateLabel: formatDateTime(row.createdAt),
      seller: row.createdBy.name,
      client: row.client.name,
      warehouse: row.originLocationId ? warehouseById.get(row.originLocationId) || "Sin bodega" : "Sin bodega",
      status: statusLabel(row.status),
      products: productNames,
      items: itemSummary,
      productText: productNames.join(", ") || "Sin productos",
      itemsCount: row.items.length,
      total,
      totalLabel: formatGTQ(total),
    };
  });
  const outgoingMovementCost = recentMovements
    .filter((row) => movementDirection(row.type) === "Salida")
    .reduce((sum, row) => sum + movementTotalValue(row), 0);
  const totalIncome = Number(sales._sum.totalGTQ || 0);
  const netProfit = totalIncome - outgoingMovementCost;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  return {
    generatedAtLabel: formatDateTime(new Date()),
    reportDays,
    executive: {
      totalIncome,
      totalIncomeLabel: formatGTQ(totalIncome),
      totalExpenses: outgoingMovementCost,
      totalExpensesLabel: formatGTQ(outgoingMovementCost),
      netProfit,
      netProfitLabel: formatGTQ(netProfit),
      profitMargin: margin,
      profitMarginLabel: `${margin.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
      salesCount: sales._count,
      producedUnits,
      delivered,
      movements,
      invoices,
    },
    kpis: [
      { label: "Ingresos totales", value: formatGTQ(sales._sum.totalGTQ), detail: `${sales._count} ventas registradas`, tone: "money" },
      { label: "Ingresos del mes", value: formatGTQ(monthSales._sum.totalGTQ), detail: `${monthSales._count} ventas este mes`, tone: "sales" },
      { label: "Produccion", value: `${producedUnits.toLocaleString("es-GT")} un`, detail: "Unidades terminadas", tone: "production" },
      { label: "Facturas", value: invoices.toLocaleString("es-GT"), detail: "Documentos generados", tone: "invoice" },
      { label: "Entregas", value: delivered.toLocaleString("es-GT"), detail: `${openDispatches} despachos abiertos`, tone: "dispatch" },
      { label: "Movimientos", value: movements.toLocaleString("es-GT"), detail: "Kardex auditado", tone: "movement" },
    ],
    sellerPerformance: buildSellerPerformance(sellerRows),
    salesRows: normalizedSales,
    productionByShift,
    warehouseSummary: buildWarehouseSummary(normalizedSales),
    recentMovements: recentMovements.map((row) => ({
      id: row.id,
      code: row.code,
      type: movementTypeLabel(row.type),
      direction: movementDirection(row.type),
      product: productTitle(row.product),
      location: row.toLocation?.name || row.fromLocation?.name || "Sin ubicacion",
      quantity: Number(row.quantity).toLocaleString("es-GT", { maximumFractionDigits: 3 }),
      value: formatGTQ(movementTotalValue(row)),
      user: row.createdBy.name,
      dateLabel: formatDateTime(row.createdAt),
    })),
    documents: [
      { label: "Facturas", count: invoices },
      { label: "Preventas confirmadas", count: sales._count },
      { label: "Despachos entregados", count: delivered },
      { label: "Movimientos Kardex", count: movements },
    ],
    filters: {
      sellers: unique([...sellerRows.map((row) => row.createdBy.name), ...salesRows.map((row) => row.createdBy.name)]),
      warehouses: warehouses.map((item) => item.name),
      products: unique([...products.map((item) => productTitle(item)), ...normalizedSales.flatMap((row) => row.products)]),
      clients: unique([...clients.map((item) => item.name), ...salesRows.map((row) => row.client.name)]),
      statuses: ["Pendiente", "Confirmada", "Entregada", "Cancelada", "Cotizacion"],
      modes: ["Ejecutivo", "Ventas", "Inventario", "Produccion", "Logistica"],
      shifts: ["Manana", "Tarde", "Noche"],
      drivers: drivers.map((item) => item.name),
    },
  };
}

export type ReportsData = Awaited<ReturnType<typeof getReportsData>>;

function buildSellerPerformance(rows: Array<{ createdAt: Date; totalGTQ: unknown; createdBy: { name: string; email: string } }>) {
  const map = new Map<string, { seller: string; total: number; count: number }>();
  for (const row of rows) {
    const key = row.createdBy.email;
    const current = map.get(key) || { seller: row.createdBy.name, total: 0, count: 0 };
    current.total += Number(row.totalGTQ);
    current.count += 1;
    map.set(key, current);
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ ...row, totalLabel: formatGTQ(row.total) }));
}

function buildProductionByShift(rows: Array<{ shift: string; producedQuantity: unknown; outputs: Array<{ producedQuantity: unknown }> }>) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const produced = Math.max(Number(row.producedQuantity), row.outputs.reduce((sum, output) => sum + Number(output.producedQuantity), 0));
    map.set(row.shift || "Sin turno", (map.get(row.shift || "Sin turno") || 0) + produced);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([shift, total]) => ({ shift, total, totalLabel: `${total.toLocaleString("es-GT")} un` }));
}

function buildWarehouseSummary(rows: Array<{ warehouse: string; total: number; id: string }>) {
  const map = new Map<string, { warehouse: string; income: number; sales: number }>();
  for (const row of rows) {
    const current = map.get(row.warehouse) || { warehouse: row.warehouse, income: 0, sales: 0 };
    current.income += row.total;
    current.sales += 1;
    map.set(row.warehouse, current);
  }
  return Array.from(map.values())
    .sort((a, b) => b.income - a.income)
    .map((row) => ({ ...row, incomeLabel: formatGTQ(row.income) }));
}

function movementTypeLabel(type: string) {
  const labels: Record<string, string> = {
    PURCHASE_IN: "Compra",
    PRODUCTION_IN: "Produccion",
    SALE_OUT: "Venta",
    CONSUMPTION_OUT: "Consumo",
    TRANSFER_OUT: "Traslado salida",
    TRANSFER_IN: "Traslado entrada",
    ADJUSTMENT_IN: "Ajuste entrada",
    ADJUSTMENT_OUT: "Ajuste salida",
    WASTE_OUT: "Merma",
    RETURN_IN: "Devolucion",
  };
  return labels[type] || type;
}

function movementDirection(type: string) {
  if (type.endsWith("_OUT")) return "Salida";
  if (type.endsWith("_IN")) return "Entrada";
  return "Ajuste";
}

function movementTotalValue(row: { quantity: unknown; unitCost: unknown; product: { priceGTQ: unknown } }) {
  return Number(row.quantity) * movementUnitValue(row);
}

function movementUnitValue(row: { unitCost: unknown; product: { priceGTQ: unknown } }) {
  const unitCost = Number(row.unitCost || 0);
  if (unitCost > 0) return unitCost;
  return Number(row.product.priceGTQ || 0);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(date: Date) {
  return date.toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGTQ(value: unknown) {
  return `Q ${Number(value || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function productTitle(product: { name: string; modelName: string | null; color: string | null }) {
  const model = product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
  return product.color ? `${model} - ${product.color}` : model;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmada",
    DISPATCHED: "Entregada",
    CANCELLED: "Cancelada",
    QUOTE: "Cotizacion",
  };
  return labels[status] || status;
}
