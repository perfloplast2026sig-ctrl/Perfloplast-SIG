import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

async function getProductionModuleDataRaw() {
  const dayBounds = getGuatemalaPeriodBounds("day");
  const monthBounds = getGuatemalaPeriodBounds("month");
  const [products, warehouses, orders, shiftSchedules, dayProduction, monthProduction] = await Promise.all([
    prisma.product.findMany({ where: { type: "FINISHED_GOOD", isActive: true }, orderBy: [{ name: "asc" }, { modelName: "asc" }, { color: "asc" }] }),
    prisma.location.findMany({ where: { type: "WAREHOUSE", isActive: true }, orderBy: [{ isFactoryWarehouse: "desc" }, { name: "asc" }] }),
    prisma.productionOrder.findMany({
      include: { targetProduct: true, destinationLocation: true, responsible: true, outputs: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getShiftSchedules(),
    prisma.productionOrder.aggregate({
      where: { status: "CLOSED", createdAt: { gte: dayBounds.start, lt: dayBounds.end } },
      _sum: { producedQuantity: true },
    }),
    prisma.productionOrder.aggregate({
      where: { status: "CLOSED", createdAt: { gte: monthBounds.start, lt: monthBounds.end } },
      _sum: { producedQuantity: true },
    }),
  ]);
  const nextCode = await getNextProductionCode();
  const currentShift = getCurrentShift(shiftSchedules);

  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      modelName: product.modelName,
      color: product.color,
    })),
    warehouses: warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      isFactoryWarehouse: warehouse.isFactoryWarehouse,
    })),
    nextCode,
    currentShift: displayShiftName(currentShift.name),
    currentShiftRange: `${currentShift.startTime} - ${currentShift.endTime}`,
    shiftSchedules,
    productionToday: Number(dayProduction._sum.producedQuantity || 0),
    productionMonth: Number(monthProduction._sum.producedQuantity || 0),
    currentDateTime: new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(new Date()),
    orders: orders.map((order) => ({
      id: order.id,
      code: order.code,
      product: formatOrderProducts(order.outputs),
      warehouse: order.destinationLocation?.name || "Sin bodega",
      shift: displayShiftName(order.shift),
      schedule: order.shiftStart && order.shiftEnd ? `${order.shiftStart} - ${order.shiftEnd}` : "Sin horario",
      quantity: order.producedQuantity.toString(),
      rejectedQuantity: order.outputs.reduce((sum, output) => sum + Number(output.rejectedQuantity), 0).toString(),
      responsible: order.responsible.name,
      createdAt: new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(order.createdAt),
      closedAt: order.closedAt ? new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(order.closedAt) : "Sin cierre",
      items: order.outputs.map((output) => ({
        product: output.product.modelName || output.product.name,
        color: output.product.color || "Sin color",
        quantity: output.producedQuantity.toString(),
        rejectedQuantity: output.rejectedQuantity.toString(),
      })),
      status: order.status === "CLOSED" ? { label: "Registrada", tone: "success" as const } : { label: "Planificada", tone: "info" as const },
    })),
  };
}

export const getProductionModuleData = unstable_cache(
  async () => {
    return getProductionModuleDataRaw();
  },
  ["production-data"],
  {
    revalidate: 10,
    tags: ["production"],
  }
);

export async function createProductionEntry(input: {
  items: Array<{ productId: string; warehouseId: string; quantity: string; rejectedQuantity?: string }>;
  responsibleId: string;
}) {
  const items = input.items
    .map((item) => ({ ...item, quantityValue: parseQuantity(item.quantity), rejectedQuantityValue: parseQuantity(item.rejectedQuantity || "0") }))
    .filter((item) => item.productId && item.warehouseId && (item.quantityValue > 0 || item.rejectedQuantityValue > 0));

  if (items.length === 0) {
    throw new Error("Agrega al menos un producto producido o rechazado con color y bodega destino.");
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantityValue, 0);
  const totalRejected = items.reduce((sum, item) => sum + item.rejectedQuantityValue, 0);
  const shiftSchedule = getCurrentShift(await getShiftSchedules());

  return prisma.$transaction(async (tx) => {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const warehouseIds = [...new Set(items.map((item) => item.warehouseId))];
    const [products, warehouses] = await Promise.all([
      tx.product.findMany({ where: { id: { in: productIds }, type: "FINISHED_GOOD", isActive: true } }),
      tx.location.findMany({ where: { id: { in: warehouseIds }, type: "WAREHOUSE", isActive: true } }),
    ]);

    if (products.length !== productIds.length) throw new Error("Uno o mas productos terminados no existen o estan inactivos.");
    if (warehouses.length !== warehouseIds.length) throw new Error("Una o mas bodegas destino no existen o estan inactivas.");

    const code = await buildProductionCode(tx);
    const order = await tx.productionOrder.create({
      data: {
        code,
        status: "CLOSED",
        shift: shiftSchedule.name,
        shiftStart: shiftSchedule.startTime,
        shiftEnd: shiftSchedule.endTime,
        targetProductId: items[0].productId,
        destinationLocationId: items[0].warehouseId,
        plannedQuantity: totalQuantity + totalRejected,
        producedQuantity: totalQuantity,
        wasteNotes: totalRejected > 0 ? "Producto rechazado al registrar produccion" : null,
        responsibleId: input.responsibleId,
        closedAt: new Date(),
        outputs: {
          create: items.map((item) => ({
            productId: item.productId,
            plannedQuantity: item.quantityValue + item.rejectedQuantityValue,
            producedQuantity: item.quantityValue,
            rejectedQuantity: item.rejectedQuantityValue,
          })),
        },
      },
    });

    for (const [index, item] of items.entries()) {
      if (item.quantityValue > 0) {
        await tx.stockBalance.upsert({
          where: { productId_locationId: { productId: item.productId, locationId: item.warehouseId } },
          update: { quantity: { increment: item.quantityValue } },
          create: { productId: item.productId, locationId: item.warehouseId, quantity: item.quantityValue },
        });

        await tx.inventoryMovement.create({
          data: {
            code: `PROD-${Date.now()}-${index + 1}`,
            type: "PRODUCTION_IN",
            productId: item.productId,
            toLocationId: item.warehouseId,
            quantity: item.quantityValue,
            reason: `Produccion registrada en ${shiftSchedule.name}`,
            productionOrderId: order.id,
            createdById: input.responsibleId,
          },
        });
      }

      if (item.rejectedQuantityValue > 0) {
        await tx.inventoryMovement.create({
          data: {
            code: `MER-${Date.now()}-${index + 1}`,
            type: "WASTE_OUT",
            productId: item.productId,
            quantity: item.rejectedQuantityValue,
            reason: "Producto rechazado al fabricar",
            productionOrderId: order.id,
            createdById: input.responsibleId,
          },
        });
      }
    }

    return order;
  });
}

export async function getNextProductionCode() {
  const year = new Date().getFullYear();
  const count = await prisma.productionOrder.count({ where: { code: { startsWith: `OP-${year}-` } } });
  return `OP-${year}-${String(count + 1).padStart(5, "0")}`;
}

export async function getShiftSchedules() {
  const schedules = await prisma.shiftSchedule.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (schedules.length > 0) {
    return schedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      sortOrder: schedule.sortOrder,
    }));
  }

  return prisma.$transaction(async (tx) => {
    await ensureDefaultShiftSchedules(tx);
    const created = await tx.shiftSchedule.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    return created.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      sortOrder: schedule.sortOrder,
    }));
  });
}

export async function updateShiftSchedules(input: Array<{ name: string; startTime: string; endTime: string }>) {
  const allowed = ["Manana", "Tarde", "Noche"];
  const rows = allowed.map((name, index) => {
    const row = input.find((item) => item.name === name);

    if (!row || !isValidTime(row.startTime) || !isValidTime(row.endTime)) {
      throw new Error("Configura hora inicio y hora fin para cada turno.");
    }

    return { name, startTime: row.startTime, endTime: row.endTime, sortOrder: index + 1 };
  });

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.shiftSchedule.upsert({
        where: { name: row.name },
        update: { startTime: row.startTime, endTime: row.endTime, sortOrder: row.sortOrder, isActive: true },
        create: { name: row.name, startTime: row.startTime, endTime: row.endTime, sortOrder: row.sortOrder, isActive: true },
      });
    }
  });
}

async function buildProductionCode(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const count = await tx.productionOrder.count({ where: { code: { startsWith: `OP-${year}-` } } });
  return `OP-${year}-${String(count + 1).padStart(5, "0")}`;
}

function getCurrentShift(schedules: Array<{ name: string; startTime: string; endTime: string }>) {
  const currentMinutes = getGuatemalaMinutes();
  const match = schedules.find((schedule) => isMinuteInsideRange(currentMinutes, schedule.startTime, schedule.endTime));

  return match || schedules[0] || { name: "Sin turno", startTime: "00:00", endTime: "23:59" };
}

function displayShiftName(name: string) {
  const clean = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clean === "manana") return "Mañana";
  return name;
}

function getGuatemalaPeriodBounds(period: "day" | "month") {
  const offsetMs = 6 * 60 * 60 * 1000;
  const guatemalaNow = new Date(Date.now() - offsetMs);
  const year = guatemalaNow.getUTCFullYear();
  const month = guatemalaNow.getUTCMonth();
  const day = guatemalaNow.getUTCDate();
  const start = period === "day"
    ? new Date(Date.UTC(year, month, day, 6, 0, 0, 0))
    : new Date(Date.UTC(year, month, 1, 6, 0, 0, 0));
  const end = period === "day"
    ? new Date(Date.UTC(year, month, day + 1, 6, 0, 0, 0))
    : new Date(Date.UTC(year, month + 1, 1, 6, 0, 0, 0));

  return { start, end };
}

function formatOrderProducts(outputs: Array<{ product: { name: string; modelName: string | null; color: string | null }; producedQuantity: Prisma.Decimal; rejectedQuantity: Prisma.Decimal }>) {
  if (outputs.length === 0) return "Sin producto";

  return outputs.map((output) => {
    const rejected = Number(output.rejectedQuantity) > 0 ? `, rech. ${output.rejectedQuantity.toString()}` : "";
    return `${output.product.modelName || output.product.name} · ${output.product.color || "Sin color"} (${output.producedQuantity.toString()}${rejected})`;
  }).join(", ");
}

function parseQuantity(value: string) {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("La cantidad debe ser un numero valido.");
  }

  return parsed;
}

async function ensureDefaultShiftSchedules(tx: Prisma.TransactionClient) {
  const defaults = [
    { name: "Manana", startTime: "06:00", endTime: "11:59", sortOrder: 1 },
    { name: "Tarde", startTime: "12:00", endTime: "17:59", sortOrder: 2 },
    { name: "Noche", startTime: "18:00", endTime: "05:59", sortOrder: 3 },
  ];

  for (const row of defaults) {
    await tx.shiftSchedule.upsert({
      where: { name: row.name },
      update: {},
      create: row,
    });
  }
}

function getGuatemalaMinutes() {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Guatemala" }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function isMinuteInsideRange(currentMinutes: number, startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start <= end) {
    return currentMinutes >= start && currentMinutes <= end;
  }

  return currentMinutes >= start || currentMinutes <= end;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
