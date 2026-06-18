import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

type Viewer = { id: string; role: { name: string } };

async function getLogisticsModuleDataRaw(viewer?: Viewer) {
  const isDriver = viewer?.role.name === "Piloto";
  const dispatchWhere: Prisma.DispatchWhereInput = isDriver ? { responsibleId: viewer.id } : {};

  const [preorders, drivers, dispatches, latestLocations, latestSellerLocations] = await Promise.all([
    prisma.preorder.findMany({
      where: isDriver ? { id: "__none__" } : { status: { in: ["PENDING", "CONFIRMED"] }, dispatches: { none: {} } },
      include: { client: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: isDriver ? { id: viewer.id, isActive: true, role: { name: "Piloto" } } : { isActive: true, role: { name: "Piloto" } }, orderBy: { name: "asc" } }),
    prisma.dispatch.findMany({
      where: dispatchWhere,
      include: {
        preorder: { include: { client: true, items: { include: { product: true } } } },
        responsible: true,
        items: { include: { product: true } },
        returns: { where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getLatestUserLocations("Piloto", isDriver ? viewer.id : undefined),
    isDriver ? Promise.resolve([]) : getLatestUserLocations("Vendedor"),
  ]);
  const preorderIds = [
    ...preorders.map((preorder) => preorder.id),
    ...dispatches.map((dispatch) => dispatch.preorderId).filter((id): id is string => Boolean(id)),
  ];
  const invoices = await getInvoiceNumbers(preorderIds);
  const auditLogs = dispatches.length
    ? await prisma.auditLog.findMany({
        where: { entity: "Dispatch", entityId: { in: dispatches.map((dispatch) => dispatch.id) } },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const auditLogsByDispatch = groupAuditLogsByEntity(auditLogs);

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
        id: item.id,
        product: productTitle(item.product),
        color: item.product.color || "Sin color",
        quantity: item.quantity.toString(),
      })),
      status: statusLabel(dispatch.status),
      statusKey: dispatch.status,
      latestReturnReason: dispatch.returns[0]?.reason || null,
      latestReturnResolution: dispatch.returns[0]?.resolution || null,
      auditTrail: (auditLogsByDispatch.get(dispatch.id) || []).map((log) => ({
        action: auditActionLabel(log.action),
        user: log.user?.name || "Sistema",
        date: formatDateTime(log.createdAt),
        reason: auditReason(log.metadata),
        previousStatus: auditMetadataValue(log.metadata, "previousStatus") || "Sin estado anterior",
        inventoryEffect: auditMetadataValue(log.metadata, "inventoryRestored") === "true" ? "Inventario devuelto a bodega" : "Reserva liberada o sin movimiento fisico",
        preorder: auditMetadataValue(log.metadata, "preorder") || dispatch.preorder?.code || "Sin preventa",
      })),
    })),
    latestLocations,
    latestSellerLocations,
    deliveryMapOrders: dispatches.filter((dispatch) => !["DELIVERED", "CANCELLED"].includes(dispatch.status)).map((dispatch) => ({
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

export async function getDispatchReturnRegistryData(viewer?: Viewer) {
  const isDriver = viewer?.role.name === "Piloto";
  const rows = await prisma.dispatchReturn.findMany({
    where: isDriver ? { dispatch: { responsibleId: viewer.id } } : {},
    include: {
      driver: true,
      items: { include: { dispatchItem: { include: { product: true } } } },
      dispatch: {
        include: {
          preorder: { include: { client: true } },
          items: { include: { product: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return rows.map((row) => {
    const registeredItems = row.items.length > 0
      ? row.items.map((item) => ({
          id: item.id,
          product: productTitle(item.dispatchItem.product),
          color: item.dispatchItem.product.color || "Sin color",
          quantity: `${Number(item.quantity).toLocaleString("es-GT")} un`,
          returnedQuantity: Number(item.quantity),
          dispatchedQuantity: Number(item.dispatchItem.quantity),
        }))
      : row.dispatch.items.map((item) => ({
          id: item.id,
          product: productTitle(item.product),
          color: item.product.color || "Sin color",
          quantity: `${Number(item.quantity).toLocaleString("es-GT")} un`,
          returnedQuantity: Number(item.quantity),
          dispatchedQuantity: Number(item.quantity),
        }));
    const dispatchedTotal = row.dispatch.items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const returnedTotal = registeredItems.reduce((sum, item) => sum + item.returnedQuantity, 0);
    const isFullReturn = dispatchedTotal > 0 && returnedTotal >= dispatchedTotal;

    return {
      id: row.id,
      dispatch: row.dispatch.code,
      preorder: row.dispatch.preorder?.code || "Sin preventa",
      client: row.dispatch.preorder?.client.name || "Sin cliente",
      driver: row.driver.name,
      reason: row.reason,
      status: returnStatusLabel(row.resolution, row.resolvedAt),
      scope: isFullReturn ? "Devolucion total" : "Devolucion parcial",
      requestedAt: formatDateTime(row.createdAt),
      resolvedAt: row.resolvedAt ? formatDateTime(row.resolvedAt) : "Pendiente",
      products: registeredItems,
    };
  });
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

export async function getLogisticsMapsData(viewer?: Viewer) {
  const isDriver = viewer?.role.name === "Piloto";
  const dispatchWhere: Prisma.DispatchWhereInput = isDriver ? { responsibleId: viewer.id } : {};
  const [dispatches, latestLocations, latestSellerLocations] = await Promise.all([
    prisma.dispatch.findMany({
      where: dispatchWhere,
      include: { preorder: { include: { client: true } }, responsible: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    getLatestUserLocations("Piloto", isDriver ? viewer.id : undefined),
    isDriver ? Promise.resolve([]) : getLatestUserLocations("Vendedor"),
  ]);

  return {
    latestLocations,
    latestSellerLocations,
    deliveryMapOrders: dispatches.filter((dispatch) => !["DELIVERED", "CANCELLED"].includes(dispatch.status)).map((dispatch) => ({
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
    if (preorder.status === "QUOTE") throw new Error("Una cotizacion no puede enviarse a despacho. Primero conviertela en venta/preventa.");
    if (!["PENDING", "CONFIRMED"].includes(preorder.status)) throw new Error("Solo ventas/preventas pendientes o confirmadas pueden enviarse a despacho.");
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

export async function cancelDispatch(input: { dispatchId: string; reason: string; userId: string }) {
  if (!input.dispatchId) throw new Error("Selecciona el despacho que deseas anular.");
  if (!input.reason.trim()) throw new Error("El motivo de anulacion es obligatorio.");

  return prisma.$transaction(async (tx) => {
    const dispatch = await tx.dispatch.findUnique({
      where: { id: input.dispatchId },
      include: {
        preorder: { include: { items: true } },
        items: true,
      },
    });

    if (!dispatch) throw new Error("Despacho no encontrado.");
    if (dispatch.status === "CANCELLED") throw new Error("Este despacho ya esta anulado.");
    if (!dispatch.preorder || !dispatch.preorder.originLocationId) throw new Error("El despacho no tiene venta o bodega de origen.");

    if (dispatch.status === "DELIVERED") {
      for (const item of dispatch.items) {
        await tx.stockBalance.upsert({
          where: { productId_locationId: { productId: item.productId, locationId: dispatch.preorder.originLocationId } },
          update: { quantity: { increment: item.quantity } },
          create: { productId: item.productId, locationId: dispatch.preorder.originLocationId, quantity: item.quantity },
        });
        await tx.inventoryMovement.create({
          data: {
            code: buildMovementCode("RET"),
            type: "RETURN_IN",
            productId: item.productId,
            toLocationId: dispatch.preorder.originLocationId,
            quantity: item.quantity,
            reason: `Anulacion por Super admin: ${input.reason.trim()}`,
            reference: dispatch.code,
            preorderItemId: item.preorderItemId,
            dispatchItemId: item.id,
            createdById: input.userId,
          },
        });
      }
    } else {
      for (const item of dispatch.preorder.items) {
        if (Number(item.reservedQuantity) <= 0) continue;
        await tx.stockBalance.update({
          where: { productId_locationId: { productId: item.productId, locationId: dispatch.preorder.originLocationId } },
          data: { reserved: { decrement: item.reservedQuantity } },
        });
      }
    }

    await tx.preorder.update({
      where: { id: dispatch.preorder.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    const cancelled = await tx.dispatch.update({
      where: { id: dispatch.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: "DISPATCH_CANCELLED",
        entity: "Dispatch",
        entityId: dispatch.id,
        metadata: {
          code: dispatch.code,
          preorder: dispatch.preorder.code,
          reason: input.reason.trim(),
          previousStatus: dispatch.status,
          inventoryRestored: dispatch.status === "DELIVERED",
        },
      },
    });

    return cancelled;
  });
}

export async function requestDispatchReturn(input: { dispatchId: string; reason: string; driverId: string; items: Array<{ dispatchItemId: string; quantity: string }> }) {
  if (!input.dispatchId || !input.reason.trim()) throw new Error("Indica el motivo de la devolucion.");

  const dispatch = await prisma.dispatch.findUnique({ where: { id: input.dispatchId }, include: { items: true } });
  if (!dispatch) throw new Error("Despacho no encontrado.");
  if (dispatch.responsibleId !== input.driverId) throw new Error("Este despacho no esta asignado a tu usuario.");

  const requestedItems = input.items
    .map((item) => ({ dispatchItemId: item.dispatchItemId, quantity: Number(item.quantity || 0) }))
    .filter((item) => item.dispatchItemId && Number.isFinite(item.quantity) && item.quantity > 0);
  const returnItems = requestedItems.length > 0
    ? requestedItems
    : dispatch.items.map((item) => ({ dispatchItemId: item.id, quantity: Number(item.quantity) }));

  if (returnItems.length === 0) throw new Error("Indica al menos un producto devuelto.");
  for (const item of returnItems) {
    const dispatchItem = dispatch.items.find((row) => row.id === item.dispatchItemId);
    if (!dispatchItem) throw new Error("Producto devuelto no pertenece al despacho.");
    if (item.quantity > Number(dispatchItem.quantity)) throw new Error("La cantidad devuelta no puede superar la cantidad despachada.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.dispatchReturn.create({
      data: {
        dispatchId: input.dispatchId,
        driverId: input.driverId,
        reason: input.reason.trim(),
        items: {
          create: returnItems.map((item) => ({
            dispatchItemId: item.dispatchItemId,
            quantity: item.quantity,
          })),
        },
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
  const users = await prisma.user.findMany({
    where: { ...(userId ? { id: userId } : {}), isActive: true, role: { name: roleName } },
    include: {
      driverLocations: { orderBy: { recordedAt: "desc" }, take: 1 },
      auditLogs: { where: { action: { in: ["AUTH_LOGIN", "AUTH_LOGOUT"] } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  return users.map((user) => {
    const point = user.driverLocations[0];
    const latestAuth = user.auditLogs[0];
    const loggedOut = latestAuth?.action === "AUTH_LOGOUT";
    const ageMs = point ? Date.now() - point.recordedAt.getTime() : null;
    const isOnline = !loggedOut && ageMs !== null && ageMs <= 5 * 60 * 1000;
    const freshness = loggedOut ? { key: "loggedOut" as const, label: "Sesion cerrada" } : gpsFreshness(ageMs);
    return {
      driver: user.name,
      email: user.email,
      latitude: point ? Number(point.latitude) : null,
      longitude: point ? Number(point.longitude) : null,
      accuracy: point?.accuracy ? Number(point.accuracy) : null,
      isOnline,
      freshness: freshness.key,
      freshnessLabel: freshness.label,
      ageLabel: ageMs === null ? "Sin punto" : formatRelativeAge(ageMs),
      recordedAt: point ? new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(point.recordedAt) : "Sin punto",
    };
  });
}

function gpsFreshness(ageMs: number | null) {
  if (ageMs === null) return { key: "missing" as const, label: "Sin GPS" };
  if (ageMs <= 5 * 60 * 1000) return { key: "online" as const, label: "En linea" };
  if (ageMs <= 30 * 60 * 1000) return { key: "recent" as const, label: "Reciente" };
  return { key: "stale" as const, label: "GPS viejo" };
}

function formatRelativeAge(ageMs: number) {
  const minutes = Math.max(0, Math.floor(ageMs / 60000));
  if (minutes < 1) return "GPS ahora";
  if (minutes < 60) return `GPS hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `GPS hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `GPS hace ${days} d`;
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

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    DISPATCH_CANCELLED: "Despacho anulado",
  };
  return labels[action] || action;
}

function auditReason(metadata: Prisma.JsonValue | null) {
  return auditMetadataValue(metadata, "reason") || "Sin motivo registrado";
}

function auditMetadataValue(metadata: Prisma.JsonValue | null, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, Prisma.JsonValue>)[key];
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : "[]";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function groupAuditLogsByEntity(logs: Array<{ entityId: string | null; action: string; metadata: Prisma.JsonValue | null; createdAt: Date; user: { name: string } | null }>) {
  const grouped = new Map<string, typeof logs>();
  for (const log of logs) {
    if (!log.entityId) continue;
    const rows = grouped.get(log.entityId) || [];
    if (rows.length < 5) rows.push(log);
    grouped.set(log.entityId, rows);
  }
  return grouped;
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
