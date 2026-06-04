import type { PreorderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

const GT_TIME_ZONE = "America/Guatemala";
const OPEN_DISPATCH_STATUSES = ["SCHEDULED", "LOADED", "IN_ROUTE", "RETURN_REQUESTED", "RESCHEDULED"];
const REAL_SALE_STATUSES: PreorderStatus[] = ["PENDING", "CONFIRMED", "DISPATCHED"];

export type DashboardData = Awaited<ReturnType<typeof getDashboardRawData>>;

async function getDashboardRawData() {
  const today = startOfDay(new Date());
  const weekStart = addDays(today, -6);
  const openPreorderWhere: Prisma.PreorderWhereInput = {
    status: { in: ["PENDING", "CONFIRMED"] },
    dispatches: { none: { status: "DELIVERED" } },
  };
  const activeProductionWhere: Prisma.ProductionOrderWhereInput = {
    status: { in: ["PLANNED", "IN_PROGRESS", "PAUSED", "QUALITY_REVIEW"] },
  };
  const openDispatchWhere: Prisma.DispatchWhereInput = {
    status: { in: ["SCHEDULED", "LOADED", "IN_ROUTE", "RETURN_REQUESTED", "RESCHEDULED"] },
  };

  const [
    productCount,
    balances,
    preorderStats,
    pendingPreorders,
    activeProductionCount,
    activeProductionOrders,
    dispatchStats,
    recentMovements,
    salesRows,
    productionRows,
    productionOutputs,
    shiftRows,
    topFinishedStockRows,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.stockBalance.findMany({ include: { product: true, location: true } }),
    prisma.preorder.aggregate({ _count: true, _sum: { totalGTQ: true }, where: openPreorderWhere }),
    prisma.preorder.findMany({
      where: openPreorderWhere,
      include: { client: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.productionOrder.count({ where: activeProductionWhere }),
    prisma.productionOrder.findMany({
      where: activeProductionWhere,
      include: { targetProduct: true, outputs: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.dispatch.groupBy({ by: ["status"], _count: true }),
    prisma.inventoryMovement.findMany({
      include: { product: true, fromLocation: true, toLocation: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.preorder.findMany({
      where: { createdAt: { gte: weekStart }, status: { in: REAL_SALE_STATUSES } },
      select: { createdAt: true, totalGTQ: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.productionOrder.findMany({
      where: { createdAt: { gte: weekStart }, status: { not: "CANCELLED" } },
      select: { createdAt: true, producedQuantity: true, outputs: { select: { producedQuantity: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.productionOrder.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { producedQuantity: true, outputs: { select: { producedQuantity: true } } },
    }),
    prisma.productionOrder.findMany({
      where: { createdAt: { gte: weekStart }, status: { not: "CANCELLED" } },
      select: { shift: true, producedQuantity: true, outputs: { select: { producedQuantity: true } } },
    }),
    prisma.stockBalance.findMany({
      where: { product: { type: "FINISHED_GOOD" }, quantity: { gt: 0 } },
      include: { product: true, location: true },
      orderBy: { quantity: "desc" },
      take: 6,
    }),
  ]);

  const lowStock = balances.filter((balance) => Number(balance.product.minimumStock) > 0 && Number(balance.quantity) <= Number(balance.product.minimumStock));
  const finishedStock = sumBalances(balances, (balance) => balance.product.type === "FINISHED_GOOD");
  const reservedStock = balances.reduce((sum, balance) => sum + Number(balance.reserved), 0);
  const availableFinishedStock = Math.max(0, finishedStock - reservedStock);
  const rawStock = sumBalances(balances, (balance) => balance.product.type === "RAW_MATERIAL");
  const otherStock = sumBalances(balances, (balance) => ["SUPPLY", "PACKAGING"].includes(balance.product.type));
  const realTotalStock = availableFinishedStock + reservedStock + rawStock + otherStock;
  const totalForPercentage = Math.max(realTotalStock, 1);
  const scheduledDispatches = dispatchStats.filter((row) => OPEN_DISPATCH_STATUSES.includes(row.status)).reduce((sum, row) => sum + row._count, 0);
  const todayDispatches = await prisma.dispatch.count({ where: { ...openDispatchWhere, scheduledAt: { gte: today } } });
  const producedUnits = productionOutputs.reduce((sum, order) => sum + productionQuantity(order), 0);

  return {
    kpis: [
      { label: "Produccion total", value: formatInteger(producedUnits), change: "Unidades terminadas", tone: "success" as const },
      { label: "Stock bajo", value: formatInteger(lowStock.length), change: lowStock.length > 0 ? "Revisar minimo" : "Sin alertas", tone: lowStock.length > 0 ? ("warning" as const) : ("success" as const) },
      { label: "Preventas pendientes", value: formatInteger(preorderStats._count), change: preorderStats._count > 0 ? `${formatGTQ(preorderStats._sum.totalGTQ)} por atender` : "Sin pendientes", tone: preorderStats._count > 0 ? ("info" as const) : ("neutral" as const) },
      { label: "Ordenes activas", value: formatInteger(activeProductionCount), change: activeProductionCount > 0 ? "Produccion abierta" : "Sin ordenes", tone: activeProductionCount > 0 ? ("warning" as const) : ("neutral" as const) },
      { label: "Despachos abiertos", value: formatInteger(scheduledDispatches), change: todayDispatches > 0 ? `${formatInteger(todayDispatches)} para hoy` : "Sin ruta abierta", tone: scheduledDispatches > 0 ? ("info" as const) : ("neutral" as const) },
    ],
    inventoryMix: [
      { label: "Materia prima", value: percentage(rawStock, totalForPercentage), amount: formatUnit(rawStock) },
      { label: "Terminado disponible", value: percentage(availableFinishedStock, totalForPercentage), amount: formatUnit(availableFinishedStock) },
      { label: "Reservado", value: percentage(reservedStock, totalForPercentage), amount: formatUnit(reservedStock) },
      { label: "Insumos y empaque", value: percentage(otherStock, totalForPercentage), amount: formatUnit(otherStock) },
    ],
    stockTotals: { rawStock, availableFinishedStock, reservedStock, otherStock, totalStock: realTotalStock },
    alerts: buildAlerts(lowStock, pendingPreorders, activeProductionOrders, scheduledDispatches),
    dispatchStatus: buildDispatchStatus(dispatchStats),
    inventoryByLocation: buildInventoryByLocation(balances),
    topFinishedStock: topFinishedStockRows.map((balance) => ({
      product: productTitle(balance.product),
      location: balance.location.name,
      quantity: Number(balance.quantity),
      unit: balance.product.unit,
    })),
    movements: recentMovements.map((movement) => ({
      event: movementLabel(movement.type),
      detail: `${productTitle(movement.product)} - ${movement.toLocation?.name || movement.fromLocation?.name || "Sin ubicacion"}`,
      time: formatDateTime(movement.createdAt),
      amount: `${movementSign(movement.type)}${Number(movement.quantity).toLocaleString("es-GT")} ${movement.product.unit}`,
      category: movementCategory(movement.type),
      tone: movementTone(movement.type),
      product: productTitle(movement.product),
      route: `${movement.fromLocation?.name || "Origen externo"} hacia ${movement.toLocation?.name || "Salida"}`,
      code: movement.code,
      user: movement.createdBy.name,
      reason: movement.reason,
    })),
    salesVsProduction: buildSalesProductionSeries(weekStart, salesRows, productionRows),
    shiftProduction: buildShiftProduction(shiftRows),
    catalogCount: productCount,
  };
}

export const getDashboardData = unstable_cache(
  async () => {
    return getDashboardRawData();
  },
  ["dashboard-data"],
  {
    revalidate: 15, // revalidate every 15 seconds
    tags: ["dashboard"],
  }
);

function buildShiftProduction(rows: Array<{ shift: string; producedQuantity: unknown; outputs: Array<{ producedQuantity: unknown }> }>) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const shift = normalizeShift(row.shift);
    totals.set(shift, (totals.get(shift) || 0) + productionQuantity(row));
  }

  const preferred = ["Mañana", "Tarde", "Noche"];
  const labels = [...preferred, ...Array.from(totals.keys()).filter((label) => !preferred.includes(label))];
  return labels.map((label) => ({ label, value: totals.get(label) || 0 }));
}

function normalizeShift(shift: string) {
  const clean = shift.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clean.includes("manana")) return "Mañana";
  if (clean.includes("tarde")) return "Tarde";
  if (clean.includes("noche")) return "Noche";
  return shift.trim() || "Sin turno";
}

function buildAlerts(
  lowStock: Array<{ product: { name: string; minimumStock: unknown }; quantity: unknown; location: { name: string } }>,
  pendingPreorders: Array<{ code: string; client: { name: string }; items: unknown[] }>,
  activeProductionOrders: Array<{ code: string; targetProduct: { name: string } | null }>,
  scheduledDispatches: number,
) {
  const alerts = [];
  const firstLowStock = lowStock[0];
  const firstPreorder = pendingPreorders[0];
  const firstProduction = activeProductionOrders[0];

  if (firstLowStock) {
    alerts.push({
      title: "Stock bajo",
      detail: `${firstLowStock.product.name} en ${firstLowStock.location.name}: ${Number(firstLowStock.quantity).toLocaleString("es-GT")} disponible, minimo ${Number(firstLowStock.product.minimumStock).toLocaleString("es-GT")}.`,
      tone: "danger" as const,
    });
  }

  if (firstPreorder) {
    alerts.push({
      title: "Preventa por atender",
      detail: `${firstPreorder.code} - ${firstPreorder.client.name}, ${firstPreorder.items.length} productos sin entrega finalizada.`,
      tone: "warning" as const,
    });
  }

  if (firstProduction) {
    alerts.push({
      title: "Produccion abierta",
      detail: `${firstProduction.code}${firstProduction.targetProduct ? ` - ${firstProduction.targetProduct.name}` : ""}.`,
      tone: "warning" as const,
    });
  }

  if (scheduledDispatches > 0) {
    alerts.push({
      title: "Despachos abiertos",
      detail: `${formatInteger(scheduledDispatches)} rutas requieren seguimiento.`,
      tone: "info" as const,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Operacion estable",
      detail: "Sin stock bajo, preventas pendientes, produccion abierta ni despachos activos.",
      tone: "success" as const,
    });
  }

  return alerts.slice(0, 4);
}

function buildDispatchStatus(rows: Array<{ status: string; _count: number }>) {
  const labels: Record<string, string> = {
    SCHEDULED: "Programado",
    LOADED: "Cargado",
    IN_ROUTE: "En ruta",
    DELIVERED: "Entregado",
    RETURN_REQUESTED: "Devolucion",
    RETURNED_TO_WAREHOUSE: "Devuelto",
    RESCHEDULED: "Reprogramado",
    CANCELLED: "Cancelado",
  };

  return rows.filter((row) => row._count > 0).map((row) => ({ label: labels[row.status] || row.status, value: row._count }));
}

function buildInventoryByLocation(
  balances: Array<{ quantity: unknown; reserved: unknown; product: { type: string }; location: { id: string; name: string; type: string } }>,
) {
  const grouped = new Map<string, { location: string; finished: number; reserved: number; raw: number; total: number }>();
  for (const balance of balances.filter((item) => item.location.type === "WAREHOUSE")) {
    const current = grouped.get(balance.location.id) || { location: balance.location.name, finished: 0, reserved: 0, raw: 0, total: 0 };
    const quantity = Number(balance.quantity);
    current.total += quantity;
    if (balance.product.type === "FINISHED_GOOD") current.finished += quantity;
    if (balance.product.type === "RAW_MATERIAL") current.raw += quantity;
    current.reserved += Number(balance.reserved);
    grouped.set(balance.location.id, current);
  }
  return Array.from(grouped.values()).sort((a, b) => b.total - a.total).slice(0, 6);
}

function buildSalesProductionSeries(
  weekStart: Date,
  salesRows: Array<{ createdAt: Date; totalGTQ: unknown }>,
  productionRows: Array<{ createdAt: Date; producedQuantity: unknown; outputs: Array<{ producedQuantity: unknown }> }>,
) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const key = dayKey(day);
    const sales = salesRows.filter((row) => dayKey(row.createdAt) === key).reduce((sum, row) => sum + Number(row.totalGTQ), 0);
    const production = productionRows.filter((row) => dayKey(row.createdAt) === key).reduce((sum, row) => sum + productionQuantity(row), 0);
    return { label: new Intl.DateTimeFormat("es-GT", { weekday: "short", timeZone: GT_TIME_ZONE }).format(day), sales, production };
  });
}

function productionQuantity(row: { producedQuantity: unknown; outputs: Array<{ producedQuantity: unknown }> }) {
  const outputsTotal = row.outputs.reduce((sum, output) => sum + Number(output.producedQuantity), 0);
  return Math.max(Number(row.producedQuantity), outputsTotal);
}

function sumBalances<T extends { quantity: unknown }>(balances: T[], predicate: (balance: T) => boolean) {
  return balances.filter(predicate).reduce((sum, balance) => sum + Number(balance.quantity), 0);
}

function percentage(value: number, total: number) {
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function movementLabel(type: string) {
  const labels: Record<string, string> = {
    PURCHASE_IN: "Entrada de compra",
    PRODUCTION_IN: "Entrada de produccion",
    SALE_OUT: "Salida por venta",
    CONSUMPTION_OUT: "Consumo de produccion",
    TRANSFER_OUT: "Salida por traslado",
    TRANSFER_IN: "Entrada por traslado",
    ADJUSTMENT_IN: "Ajuste de entrada",
    ADJUSTMENT_OUT: "Ajuste de salida",
    WASTE_OUT: "Merma registrada",
    RETURN_IN: "Devolucion",
  };
  return labels[type] || type;
}

function movementSign(type: string) {
  return type.endsWith("_IN") ? "+" : "-";
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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone: GT_TIME_ZONE }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: GT_TIME_ZONE }).format(date);
}

function formatInteger(value: number) {
  return value.toLocaleString("es-GT");
}

function formatGTQ(value: unknown) {
  return `Q ${Number(value || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUnit(value: number) {
  return `${value.toLocaleString("es-GT", { maximumFractionDigits: 2 })} un`;
}

function productTitle(product: { name: string; modelName: string | null; color: string | null }) {
  const model = product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
  return product.color ? `${model} · ${product.color}` : model;
}
