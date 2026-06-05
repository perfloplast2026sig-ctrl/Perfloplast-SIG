import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

type Viewer = { id: string; role: { name: string } };

async function getLogisticsModuleDataRaw(viewer?: Viewer) {
  const isDriver = viewer?.role.name === "Piloto";
  const dispatchWhere: Prisma.DispatchWhereInput = isDriver ? { responsibleId: viewer.id } : {};

  const [preorders, drivers, dispatches, returnRows, latestLocations, latestSellerLocations] = await Promise.all([
    prisma.preorder.findMany({
      where: isDriver ? { id: "__none__" } : { status: { in: ["PENDING", "CONFIRMED"] }, dispatches: { none: {} } },
      include: { client: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: isDriver ? { id: viewer.id, isActive: true, role: { name: "Piloto" } } : { isActive: true, role: { name: "Piloto" } }, orderBy: { name: "asc" } }),
    prisma.dispatch.findMany({
      where: dispatchWhere,
      include: { preorder: { include: { client: true, items: { include: { product: true } } } }, responsible: true, items: { include: { product: true } }, returns: { where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.dispatchReturn.findMany({
      where: isDriver ? { dispatch: { responsibleId: viewer.id } } : {},
      include: {
        driver: true,
        dispatch: {
          include: {
            preorder: { include: { client: true } },
            items: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getLatestUserLocations("Piloto", isDriver ? viewer.id : undefined),
    isDriver ? Promise.resolve([]) : getLatestUserLocations("Vendedor"),
  ]);
  const preorderIds = [
    ...preorders.map((preorder) => preorder.id),
    ...dispatches.map((dispatch) => dispatch.preorderId).filter((id): id is string => Boolean(id)),
  ];
  const invoices = await getInvoiceNumbers(preorderIds);

  return {
    preorders: preorders.map((preorder) => ({
      id: preorder.id,
      code: preorder.code,
      client: preorder.client.name,
      taxId: preorder.client.taxId || "CF",
      phone: preorder.client.phone || "Sin telefono",
      deliveryAddress: preorder.deliveryAddress || preorder.client.address || "Sin direccion",
      latitude: preorder.saleLatitude ? Number(preorder.saleLatitude) : null,
      longitude: preorder.saleLongitude ? Number(preorder.saleLongitude) : null,
      accuracy: preorder.saleAccuracy ? Number(preorder.saleAccuracy) : null,
      total: formatGTQ(preorder.totalGTQ),
      invoice: invoices.get(preorder.id) || "Sin factura",
      items: preorder.items.map((item) => ({
        product: productTitle(item.product),
        color: item.product.color || "Sin color",
        quantity: item.quantity.toString(),
        unitPrice: formatGTQ(item.unitPrice),
      })),
    })),
    drivers: drivers.map((driver) => ({ id: driver.id, name: driver.name, email: driver.email })),
    dispatches: dispatches.map((dispatch) => ({
      id: dispatch.id,
      code: dispatch.code,
      driverId: dispatch.responsibleId,
      preorder: dispatch.preorder?.code || "Sin preventa",
      invoice: dispatch.preorderId ? invoices.get(dispatch.preorderId) || "Sin factura" : "Sin factura",
      client: dispatch.preorder?.client.name || "Sin cliente",
      taxId: dispatch.preorder?.client.taxId || "C/F",
      phone: dispatch.preorder?.client.phone || "Sin telefono",
      driver: dispatch.responsible.name,
      routeName: dispatch.routeName,
      destination: dispatch.destination,
      destinationLatitude: dispatch.destinationLatitude ? Number(dispatch.destinationLatitude) : null,
      destinationLongitude: dispatch.destinationLongitude ? Number(dispatch.destinationLongitude) : null,
      scheduledAt: new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(dispatch.scheduledAt),
      deliveredAt: dispatch.deliveredAt ? new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(dispatch.deliveredAt) : "Sin entrega",
      load: `${dispatch.items.reduce((sum, item) => sum + Number(item.quantity), 0)} un`,
      value: formatGTQ(dispatch.preorder?.totalGTQ || 0),
      items: dispatch.items.map((item) => ({
        product: productTitle(item.product),
        color: item.product.color || "Sin color",
        quantity: item.quantity.toString(),
      })),
      status: statusLabel(dispatch.status),
      statusKey: dispatch.status,
      latestReturnReason: dispatch.returns[0]?.reason || null,
      latestReturnResolution: dispatch.returns[0]?.resolution || null,
    })),
    returnRecords: returnRows.flatMap((row) => row.dispatch.items.map((item) => ({
      id: `${row.id}-${item.id}`,
      dispatch: row.dispatch.code,
      preorder: row.dispatch.preorder?.code || "Sin preventa",
      client: row.dispatch.preorder?.client.name || "Sin cliente",
      driver: row.driver.name,
      product: productTitle(item.product),
      color: item.product.color || "Sin color",
      quantity: `${Number(item.quantity).toLocaleString("es-GT")} un`,
      reason: row.reason,
      status: returnStatusLabel(row.resolution, row.resolvedAt),
      requestedAt: formatDateTime(row.createdAt),
      resolvedAt: row.resolvedAt ? formatDateTime(row.resolvedAt) : "Pendiente",
    }))),
    latestLocations,
    latestSellerLocations,
    deliveryMapOrders: dispatches.map((dispatch) => ({
      code: dispatch.code,
      driverId: dispatch.responsibleId,
      client: dispatch.preorder?.client.name || "Sin cliente",
      destination: dispatch.destination,
      status: statusLabel(dispatch.status),
      latitude: dispatch.destinationLatitude ? Number(dispatch.destinationLatitude) : null,
      longitude: dispatch.destinationLongitude ? Number(dispatch.destinationLongitude) : null,
    })),
  };
}

const getLogisticsModuleDataCached = unstable_cache(
  async (viewerId?: string, viewerRole?: string) => {
    return getLogisticsModuleDataRaw(viewerId ? { id: viewerId, role: { name: viewerRole || "" } } : undefined);
  },
  ["logistics-data"],
  {
    revalidate: 10,
    tags: ["logistics"],
  }
);

export function getLogisticsModuleData(viewer?: Viewer) {
  return getLogisticsModuleDataCached(viewer?.id, viewer?.role.name);
}

async function getInvoiceNumbers(preorderIds: string[]) {
  const uniqueIds = [...new Set(preorderIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, string>();

  const rows = await prisma.$queryRaw<Array<{ preorderId: string; number: string }>>`
    SELECT preorderId, number FROM Invoice WHERE preorderId IN (${Prisma.join(uniqueIds)})
  `;
  return new Map(rows.map((row) => [row.preorderId, row.number]));
}

export async function createDispatch(input: { preorderId: string; driverId: string; routeName: string; destination: string }) {
  if (!input.preorderId || !input.driverId || !input.destination.trim()) {
    throw new Error("Selecciona preventa, piloto y destino.");
  }

  return prisma.$transaction(async (tx) => {
    const [preorder, driver] = await Promise.all([
      tx.preorder.findUnique({ where: { id: input.preorderId }, include: { items: true, dispatches: true } }),
      tx.user.findFirst({ where: { id: input.driverId, isActive: true, role: { name: "Piloto" } } }),
    ]);

    if (!preorder) throw new Error("Preventa no encontrada.");
    if (preorder.dispatches.length > 0) throw new Error("Esta preventa ya tiene despacho asignado.");
    if (!driver) throw new Error("Piloto no encontrado o inactivo.");

    const dispatch = await tx.dispatch.create({
      data: {
        code: await buildDispatchCode(tx),
        preorderId: preorder.id,
        responsibleId: driver.id,
        routeName: input.routeName.trim() || "Ruta directa",
        destination: input.destination.trim(),
        destinationLatitude: preorder.saleLatitude,
        destinationLongitude: preorder.saleLongitude,
        destinationAccuracy: preorder.saleAccuracy,
        scheduledAt: new Date(),
        status: "SCHEDULED",
        items: {
          create: preorder.items.map((item) => ({
            productId: item.productId,
            preorderItemId: item.id,
            quantity: item.quantity,
          })),
        },
      },
    });

    await tx.preorder.update({ where: { id: preorder.id }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
    const existingInvoice = await tx.invoice.findUnique({ where: { preorderId: preorder.id } });
    if (!existingInvoice) {
      await tx.invoice.create({
        data: {
          number: await buildInvoiceNumber(tx),
          preorderId: preorder.id,
          companyAddress: "Aldea Chijou, Santa Cruz Verapaz",
          companyPhone: "Tel: 44235941 / 53146115",
          totalGTQ: preorder.totalGTQ,
        },
      });
    }
    return dispatch;
  });
}

export async function saveDriverLocation(input: { userId: string; latitude: number; longitude: number; accuracy?: number }) {
  if (!isInsideGuatemala(input.latitude, input.longitude)) {
    throw new Error("Ubicacion fuera de Guatemala.");
  }

  return prisma.driverLocation.create({
    data: {
      userId: input.userId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
    },
  });
}

export async function updateDispatchStatus(input: { dispatchId: string; status: string; userId: string; roleName: string }) {
  const allowedStatus = ["LOADED", "IN_ROUTE", "DELIVERED"];
  if (!input.dispatchId || !allowedStatus.includes(input.status)) throw new Error("Estado no valido.");
  const isAdmin = ["Administrador", "Super admin"].includes(input.roleName);
  const isDriver = input.roleName === "Piloto";
  const isWarehouse = input.roleName === "Bodeguero";
  if (!isDriver && !isAdmin && !isWarehouse) throw new Error("No tienes permiso para actualizar este despacho.");

  const dispatch = await prisma.dispatch.findUnique({ where: { id: input.dispatchId } });
  if (!dispatch) throw new Error("Despacho no encontrado.");
  if (isDriver && dispatch.responsibleId !== input.userId) throw new Error("Este despacho no esta asignado a tu usuario.");
  if (isWarehouse && input.status !== "LOADED") throw new Error("Bodega solo puede confirmar carga de camion.");
  if (input.status === "LOADED" && !isAdmin && !isWarehouse) throw new Error("Solo bodega o administracion pueden confirmar la carga.");
  if (["IN_ROUTE", "DELIVERED"].includes(input.status) && !isAdmin && !isDriver) throw new Error("Solo piloto o administracion pueden avanzar la ruta.");
  if (input.status === "LOADED" && !["SCHEDULED", "RESCHEDULED"].includes(dispatch.status)) throw new Error("Este despacho no esta listo para cargar.");
  if (input.status === "IN_ROUTE" && dispatch.status !== "LOADED") throw new Error("Primero bodega o administracion debe confirmar la carga del camion.");
  if (input.status === "DELIVERED" && dispatch.status !== "IN_ROUTE") throw new Error("Primero marca el despacho en ruta antes de entregarlo.");

  if (input.status !== "DELIVERED") {
    return prisma.dispatch.update({
      where: { id: input.dispatchId },
      data: {
        status: input.status as "LOADED" | "IN_ROUTE",
        loadedAt: input.status === "LOADED" ? new Date() : undefined,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.dispatch.findUnique({
      where: { id: input.dispatchId },
      include: {
        preorder: { include: { items: true } },
        items: true,
      },
    });
    if (!current) throw new Error("Despacho no encontrado.");
    if (current.status === "DELIVERED") return current;
    if (!current.preorder || !current.preorder.originLocationId) throw new Error("El despacho no tiene preventa o bodega de origen.");

    for (const item of current.items) {
      const balance = await tx.stockBalance.findUnique({
        where: { productId_locationId: { productId: item.productId, locationId: current.preorder.originLocationId } },
      });
      if (!balance || Number(balance.quantity) < Number(item.quantity)) {
        throw new Error("No hay stock suficiente para cerrar la entrega.");
      }

      await tx.stockBalance.update({
        where: { productId_locationId: { productId: item.productId, locationId: current.preorder.originLocationId } },
        data: {
          quantity: { decrement: item.quantity },
          reserved: { decrement: item.quantity },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          code: buildMovementCode("SALE"),
          type: "SALE_OUT",
          productId: item.productId,
          fromLocationId: current.preorder.originLocationId,
          quantity: item.quantity,
          reason: "Entrega confirmada por despacho",
          reference: current.code,
          preorderItemId: item.preorderItemId,
          dispatchItemId: item.id,
          createdById: input.userId,
        },
      });
    }

    await tx.preorder.update({
      where: { id: current.preorder.id },
      data: { status: "DISPATCHED" },
    });

    return tx.dispatch.update({
      where: { id: input.dispatchId },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
  });
}

export async function requestDispatchReturn(input: { dispatchId: string; reason: string; driverId: string }) {
  if (!input.dispatchId || !input.reason.trim()) throw new Error("Indica el motivo de la devolucion.");

  const dispatch = await prisma.dispatch.findUnique({ where: { id: input.dispatchId } });
  if (!dispatch) throw new Error("Despacho no encontrado.");
  if (dispatch.responsibleId !== input.driverId) throw new Error("Este despacho no esta asignado a tu usuario.");

  return prisma.$transaction(async (tx) => {
    await tx.dispatchReturn.create({
      data: {
        dispatchId: input.dispatchId,
        driverId: input.driverId,
        reason: input.reason.trim(),
      },
    });
    return tx.dispatch.update({ where: { id: input.dispatchId }, data: { status: "RETURN_REQUESTED" } });
  });
}

export async function resolveDispatchReturn(input: { dispatchId: string; resolution: string }) {
  if (!["RETURNED_TO_WAREHOUSE", "RESCHEDULED"].includes(input.resolution)) throw new Error("Resolucion no valida.");

  return prisma.$transaction(async (tx) => {
    const latestReturn = await tx.dispatchReturn.findFirst({ where: { dispatchId: input.dispatchId, resolvedAt: null }, orderBy: { createdAt: "desc" } });
    if (!latestReturn) throw new Error("No hay devolucion pendiente.");

    await tx.dispatchReturn.update({
      where: { id: latestReturn.id },
      data: { resolution: input.resolution, resolvedAt: new Date() },
    });
    return tx.dispatch.update({
      where: { id: input.dispatchId },
      data: { status: input.resolution as "RETURNED_TO_WAREHOUSE" | "RESCHEDULED" },
    });
  });
}

async function getLatestUserLocations(roleName: "Piloto" | "Vendedor", userId?: string) {
  const users = await prisma.user.findMany({ where: { ...(userId ? { id: userId } : {}), isActive: true, role: { name: roleName } }, include: { driverLocations: { orderBy: { recordedAt: "desc" }, take: 1 } }, orderBy: { name: "asc" } });
  return users.map((user) => {
    const point = user.driverLocations[0];
    const isOnline = point ? Date.now() - point.recordedAt.getTime() <= 5 * 60 * 1000 : false;
    return {
      driver: user.name,
      email: user.email,
      latitude: point ? Number(point.latitude) : null,
      longitude: point ? Number(point.longitude) : null,
      accuracy: point?.accuracy ? Number(point.accuracy) : null,
      isOnline,
      recordedAt: point ? new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(point.recordedAt) : "Sin punto",
    };
  });
}

async function buildDispatchCode(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  const year = new Date().getFullYear();
  const count = await tx.dispatch.count({ where: { code: { startsWith: `DSP-${year}-` } } });
  return `DSP-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function buildInvoiceNumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  const year = new Date().getFullYear();
  const count = await tx.invoice.count({ where: { number: { startsWith: `FAC-${year}-` } } });
  return `FAC-${year}-${String(count + 1).padStart(6, "0")}`;
}

function productTitle(product: { name: string; modelName: string | null }) {
  return product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
}

function formatGTQ(value: unknown) {
  return `Q ${Number(value || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string) {
  const labels = {
    SCHEDULED: { label: "Programado", tone: "warning" as const },
    LOADED: { label: "Cargado", tone: "info" as const },
    IN_ROUTE: { label: "En ruta", tone: "info" as const },
    DELIVERED: { label: "Entregado", tone: "success" as const },
    RETURN_REQUESTED: { label: "Devolucion", tone: "warning" as const },
    RETURNED_TO_WAREHOUSE: { label: "A bodega", tone: "info" as const },
    RESCHEDULED: { label: "Reasignado", tone: "info" as const },
    CANCELLED: { label: "Cancelado", tone: "danger" as const },
  };
  return labels[status as keyof typeof labels] || { label: status, tone: "neutral" as const };
}

function returnStatusLabel(resolution: string | null, resolvedAt: Date | null) {
  if (!resolvedAt) return { label: "Pendiente", tone: "warning" as const };
  if (resolution === "RETURNED_TO_WAREHOUSE") return { label: "A bodega", tone: "info" as const };
  if (resolution === "RESCHEDULED") return { label: "Reasignada", tone: "success" as const };
  return { label: "Resuelta", tone: "success" as const };
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(date);
}

function buildMovementCode(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function isInsideGuatemala(latitude: number, longitude: number) {
  return latitude >= 13.6 && latitude <= 17.9 && longitude >= -92.5 && longitude <= -88.0;
}
