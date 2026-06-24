import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { availableStock, lockStockBalance } from "@/services/stock-locks";
import type { Role } from "@/types";
import { unstable_cache } from "next/cache";

type Viewer = { id: string; role: { name: string } };

async function getPreorderModuleDataRaw(viewer?: Viewer) {
  const roleName = viewer?.role.name as Role | undefined;
  const preorderWhere: Prisma.PreorderWhereInput = roleName === "Vendedor" ? { createdById: viewer?.id } : {};
  const now = new Date();
  const todayStart = startOfDayInTimeZone(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const monthStart = startOfMonthInTimeZone(now);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);
  const salesStatusWhere: Prisma.PreorderWhereInput = { status: { in: ["PENDING", "CONFIRMED", "DISPATCHED"] } };

  const [balances, warehouses, preorders, nextCode, todaySales, monthSales] = await Promise.all([
    prisma.stockBalance.findMany({
      where: { quantity: { gt: 0 }, product: { type: "FINISHED_GOOD", isActive: true }, location: { type: "WAREHOUSE", isActive: true } },
      include: { product: true, location: true },
      orderBy: [{ product: { name: "asc" } }, { product: { modelName: "asc" } }, { product: { color: "asc" } }],
    }),
    prisma.location.findMany({ where: { type: "WAREHOUSE", isActive: true }, orderBy: [{ isFactoryWarehouse: "desc" }, { name: "asc" }] }),
    prisma.preorder.findMany({
      where: preorderWhere,
      include: {
        client: true,
        items: { include: { product: true } },
        createdBy: true,
        dispatches: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    getPreviewPreorderCode(viewer),
    prisma.preorder.aggregate({
      where: { ...preorderWhere, ...salesStatusWhere, createdAt: { gte: todayStart, lt: tomorrowStart } },
      _count: true,
      _sum: { totalGTQ: true },
    }),
    prisma.preorder.aggregate({
      where: { ...preorderWhere, ...salesStatusWhere, createdAt: { gte: monthStart, lt: nextMonthStart } },
      _count: true,
      _sum: { totalGTQ: true },
    }),
  ]);
  const auditLogs = preorders.length
    ? await prisma.auditLog.findMany({
        where: { entity: "Preorder", entityId: { in: preorders.map((preorder) => preorder.id) } },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const auditLogsByPreorder = groupAuditLogsByEntity(auditLogs);

  return {
    nextCode,
    currentDateTime: new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(new Date()),
    salesSummary: {
      todayCount: todaySales._count,
      todayTotal: Number(todaySales._sum.totalGTQ || 0),
      todayTotalLabel: formatGTQ(todaySales._sum.totalGTQ || 0),
      monthCount: monthSales._count,
      monthTotal: Number(monthSales._sum.totalGTQ || 0),
      monthTotalLabel: formatGTQ(monthSales._sum.totalGTQ || 0),
    },
    warehouses: warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name })),
    products: balances.map((balance) => ({
      productId: balance.productId,
      warehouseId: balance.locationId,
      warehouse: balance.location.name,
      name: productTitle(balance.product),
      color: balance.product.color || "Sin color",
      price: Number(balance.product.priceGTQ || 0),
      priceLabel: balance.product.priceGTQ ? formatGTQ(balance.product.priceGTQ) : "Sin precio",
      available: Number(balance.quantity) - Number(balance.reserved),
    })),
    preorders: preorders.map((preorder) => ({
      id: preorder.id,
      code: preorder.code,
      client: preorder.client.name,
      seller: preorder.createdBy.name,
      sellerEmail: preorder.createdBy.email,
      products: `${preorder.items.length} productos`,
      warehouseId: preorder.originLocationId || "",
      warehouse: warehouses.find((warehouse) => warehouse.id === preorder.originLocationId)?.name || "Sin bodega",
      totalNumber: Number(preorder.totalGTQ),
      total: formatGTQ(preorder.totalGTQ),
      payment: preorder.paymentMethod || "Sin pago",
      taxId: preorder.client.taxId || "C/F",
      phone: preorder.client.phone || "Sin telefono",
      address: preorder.client.address || "Sin direccion",
      deliveryAddress: preorder.deliveryAddress || preorder.client.address || "Sin direccion de entrega",
      discount: formatGTQ(preorder.discountGTQ),
      amountReceived: formatGTQ(preorder.amountReceivedGTQ),
      change: formatGTQ(Math.max(0, Number(preorder.amountReceivedGTQ) - Number(preorder.totalGTQ))),
      dateKey: preorder.createdAt.toISOString().slice(0, 10),
      date: new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(preorder.createdAt),
      status: statusLabel(preorder.status),
      statusKey: preorder.status,
      canEdit: ["QUOTE", "PENDING", "CONFIRMED"].includes(preorder.status) && preorder.dispatches.length === 0,
      quoteWhatsappUrl: preorder.status === "QUOTE" ? buildQuoteWhatsappUrl(preorder.client.phone || "", preorder.code, preorder.client.name, preorder.totalGTQ) : "",
      items: preorder.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: productTitle(item.product),
        color: item.product.color || "Sin color",
        quantity: item.quantity.toString(),
        unitPrice: formatGTQ(item.unitPrice),
        subtotal: formatGTQ(Number(item.quantity) * Number(item.unitPrice)),
      })),
      auditTrail: (auditLogsByPreorder.get(preorder.id) || []).map((log) => ({
        action: auditActionLabel(log.action),
        user: log.user?.name || "Sistema",
        date: formatDateTime(log.createdAt),
        reason: auditReason(log.metadata),
        previousStatus: auditMetadataValue(log.metadata, "previousStatus") || "Sin estado anterior",
        inventoryEffect: auditInventoryEffect(log.metadata),
        salesEffect: auditSalesEffect(log.metadata),
      })),
    })),
  };
}

const getPreorderModuleDataCached = unstable_cache(
  async (viewerId?: string, viewerRole?: string) => {
    return getPreorderModuleDataRaw(viewerId ? { id: viewerId, role: { name: viewerRole || "" } } : undefined);
  },
  ["preorders-data"],
  {
    revalidate: 10,
    tags: ["preorders"],
  }
);

export function getPreorderModuleData(viewer?: Viewer) {
  return getPreorderModuleDataCached(viewer?.id, viewer?.role.name);
}

export async function createPreorder(input: {
  clientName: string;
  taxId?: string;
  phone?: string;
  address?: string;
  deliveryAddress?: string;
  originLocationId: string;
  paymentMethod?: string;
  saleLatitude?: string;
  saleLongitude?: string;
  saleAccuracy?: string;
  discount: string;
  amountReceived: string;
  mode?: string;
  items: Array<{ productId: string; quantity: string; unitPrice: string }>;
  createdById: string;
}) {
  const items = input.items
    .map((item) => ({ ...item, quantityValue: parseMoney(item.quantity), unitPriceValue: parseMoney(item.unitPrice) }))
    .filter((item) => item.productId && item.quantityValue > 0);

  if (!input.clientName.trim()) throw new Error("El nombre del cliente es obligatorio.");
  if (!input.taxId?.trim()) throw new Error("Ingresa NIT o CF.");
  if (!isValidGuatemalaPhone(input.phone || "")) throw new Error("El telefono debe tener exactamente 8 digitos.");
  if (!input.address?.trim()) throw new Error("La direccion fiscal es obligatoria.");
  if (!input.deliveryAddress?.trim()) throw new Error("La direccion de entrega es obligatoria.");
  if (!input.originLocationId) throw new Error("Selecciona bodega de origen.");
  if (items.length === 0) throw new Error("Agrega al menos un producto.");

  const deliveryAddress = input.deliveryAddress.trim();
  const subtotal = items.reduce((sum, item) => sum + item.quantityValue * item.unitPriceValue, 0);
  const discount = parseMoney(input.discount);
  const amountReceived = parseMoney(input.amountReceived);
  const total = Math.max(subtotal - discount, 0);
  const isQuote = input.mode === "quote";
  const saleLatitude = parseOptionalCoordinate(input.saleLatitude);
  const saleLongitude = parseOptionalCoordinate(input.saleLongitude);
  const saleAccuracy = parseOptionalCoordinate(input.saleAccuracy);

  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.location.findFirst({ where: { id: input.originLocationId, type: "WAREHOUSE", isActive: true } });
    if (!warehouse) throw new Error("Bodega de origen no encontrada.");

    for (const item of aggregateStockItems(items)) {
      const balance = await lockStockBalance(tx, item.productId, input.originLocationId);
      if (!isQuote && availableStock(balance) < item.quantityValue) {
        throw new Error("No hay existencia disponible suficiente para uno de los productos.");
      }
    }

    const client = await findOrCreateClient(tx, input);
    const preorder = await tx.preorder.create({
      data: {
        code: isQuote ? await buildPreorderCode(tx) : await buildSellerPreorderCode(tx, input.createdById),
        clientId: client.id,
        status: isQuote ? "QUOTE" : "PENDING",
        originLocationId: input.originLocationId,
        deliveryAddress,
        saleLatitude,
        saleLongitude,
        saleAccuracy,
        paymentMethod: input.paymentMethod || null,
        discountGTQ: discount,
        amountReceivedGTQ: amountReceived,
        totalGTQ: total,
        createdById: input.createdById,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantityValue,
            reservedQuantity: isQuote ? 0 : item.quantityValue,
            unitPrice: item.unitPriceValue,
          })),
        },
      },
    });

    if (!isQuote) {
      for (const item of aggregateStockItems(items)) {
        await tx.stockBalance.update({
          where: { productId_locationId: { productId: item.productId, locationId: input.originLocationId } },
          data: { reserved: { increment: item.quantityValue } },
        });
      }

      await tx.invoice.create({
        data: {
          number: buildInvoiceNumberFromPreorder(preorder.code) || await buildInvoiceNumber(tx),
          preorderId: preorder.id,
          companyAddress: "Aldea Chijou, Santa Cruz Verapaz",
          companyPhone: "Tel: 44235941 / 53146115",
          totalGTQ: total,
        },
      });
    }

    return preorder;
  });
}

export async function cancelPreorder(input: { preorderId: string; reason: string; userId: string }) {
  if (!input.preorderId) throw new Error("Selecciona la venta o cotizacion que deseas cancelar.");
  if (!input.reason.trim()) throw new Error("El motivo de anulacion es obligatorio.");

  return prisma.$transaction(async (tx) => {
    const preorder = await tx.preorder.findUnique({
      where: { id: input.preorderId },
      include: {
        items: true,
        dispatches: { include: { items: true } },
      },
    });

    if (!preorder) throw new Error("Preventa no encontrada.");
    if (preorder.status === "CANCELLED") throw new Error("Este registro ya esta cancelado.");

    if (preorder.status === "QUOTE") {
      const cancelled = await tx.preorder.update({
        where: { id: preorder.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: "QUOTE_CANCELLED",
          entity: "Preorder",
          entityId: preorder.id,
          metadata: {
            code: preorder.code,
            reason: input.reason.trim(),
            previousStatus: preorder.status,
            affectsInventory: false,
            affectsSales: false,
          },
        },
      });

      return cancelled;
    }

    if (!preorder.originLocationId) throw new Error("La venta no tiene bodega de origen para reversar inventario.");

    const deliveredDispatches = preorder.dispatches.filter((dispatch) => dispatch.status === "DELIVERED");
    const hasOpenDispatch = preorder.dispatches.some((dispatch) => !["DELIVERED", "CANCELLED"].includes(dispatch.status));

    if (deliveredDispatches.length > 0) {
      for (const dispatch of deliveredDispatches) {
        for (const item of dispatch.items) {
          await tx.stockBalance.upsert({
            where: { productId_locationId: { productId: item.productId, locationId: preorder.originLocationId } },
            update: { quantity: { increment: item.quantity } },
            create: { productId: item.productId, locationId: preorder.originLocationId, quantity: item.quantity },
          });
          await tx.inventoryMovement.create({
            data: {
              code: buildMovementCode("RET"),
              type: "RETURN_IN",
              productId: item.productId,
              toLocationId: preorder.originLocationId,
              quantity: item.quantity,
              reason: `Anulacion por Super admin: ${input.reason.trim()}`,
              reference: dispatch.code,
              preorderItemId: item.preorderItemId,
              dispatchItemId: item.id,
              createdById: input.userId,
            },
          });
        }
      }
    } else {
      for (const item of preorder.items) {
        if (Number(item.reservedQuantity) <= 0) continue;
        await tx.stockBalance.update({
          where: { productId_locationId: { productId: item.productId, locationId: preorder.originLocationId } },
          data: { reserved: { decrement: item.reservedQuantity } },
        });
      }
    }

    await tx.dispatch.updateMany({
      where: { preorderId: preorder.id, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    const cancelled = await tx.preorder.update({
      where: { id: preorder.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: "PREORDER_CANCELLED",
        entity: "Preorder",
        entityId: preorder.id,
        metadata: {
          code: preorder.code,
          reason: input.reason.trim(),
          previousStatus: preorder.status,
          openDispatchCancelled: hasOpenDispatch,
          deliveredDispatchesRestored: deliveredDispatches.map((dispatch) => dispatch.code),
        },
      },
    });

    return cancelled;
  });
}

export async function updatePreorder(input: {
  preorderId: string;
  clientName: string;
  taxId?: string;
  phone?: string;
  address?: string;
  deliveryAddress?: string;
  originLocationId: string;
  paymentMethod?: string;
  discount: string;
  amountReceived: string;
  items: Array<{ productId: string; quantity: string; unitPrice: string }>;
  userId: string;
  roleName: string;
}) {
  const items = input.items
    .map((item) => ({ ...item, quantityValue: parseMoney(item.quantity), unitPriceValue: parseMoney(item.unitPrice) }))
    .filter((item) => item.productId && item.quantityValue > 0);

  if (!input.preorderId) throw new Error("Selecciona la preventa que deseas editar.");
  if (!input.clientName.trim()) throw new Error("El nombre del cliente es obligatorio.");
  if (!input.taxId?.trim()) throw new Error("Ingresa NIT o CF.");
  if (!isValidGuatemalaPhone(input.phone || "")) throw new Error("El telefono debe tener exactamente 8 digitos.");
  if (!input.address?.trim()) throw new Error("La direccion fiscal es obligatoria.");
  if (!input.deliveryAddress?.trim()) throw new Error("La direccion de entrega es obligatoria.");
  if (!input.originLocationId) throw new Error("Selecciona bodega de origen.");
  if (items.length === 0) throw new Error("Agrega al menos un producto.");

  const deliveryAddress = input.deliveryAddress.trim();
  const subtotal = items.reduce((sum, item) => sum + item.quantityValue * item.unitPriceValue, 0);
  const discount = parseMoney(input.discount);
  const amountReceived = parseMoney(input.amountReceived);
  const total = Math.max(subtotal - discount, 0);
  const canEditAny = ["Super admin", "Administrador"].includes(input.roleName);

  return prisma.$transaction(async (tx) => {
    const preorder = await tx.preorder.findUnique({
      where: { id: input.preorderId },
      include: {
        items: true,
        dispatches: { select: { id: true } },
        invoice: true,
      },
    });

    if (!preorder) throw new Error("Preventa no encontrada.");
    if (!canEditAny && preorder.createdById !== input.userId) throw new Error("Solo puedes editar tus propias preventas.");
    if (!["QUOTE", "PENDING", "CONFIRMED"].includes(preorder.status)) throw new Error("Solo se pueden editar preventas pendientes, confirmadas o cotizaciones.");
    if (preorder.dispatches.length > 0) throw new Error("Esta preventa ya tiene despacho. Debe corregirse desde administracion o anularse con auditoria.");

    const isQuote = preorder.status === "QUOTE";
    const warehouse = await tx.location.findFirst({ where: { id: input.originLocationId, type: "WAREHOUSE", isActive: true } });
    if (!warehouse) throw new Error("Bodega de origen no encontrada.");

    if (!isQuote && preorder.originLocationId) {
      for (const item of preorder.items) {
        if (Number(item.reservedQuantity) <= 0) continue;
        await tx.stockBalance.update({
          where: { productId_locationId: { productId: item.productId, locationId: preorder.originLocationId } },
          data: { reserved: { decrement: item.reservedQuantity } },
        });
      }
    }

    if (!isQuote) {
      for (const item of aggregateStockItems(items)) {
        const balance = await lockStockBalance(tx, item.productId, input.originLocationId);
        if (availableStock(balance) < item.quantityValue) {
          throw new Error("No hay existencia disponible suficiente para uno de los productos.");
        }
      }
    }

    const client = await findOrCreateClient(tx, input);
    await tx.preorderItem.deleteMany({ where: { preorderId: preorder.id } });
    const updated = await tx.preorder.update({
      where: { id: preorder.id },
      data: {
        clientId: client.id,
        originLocationId: input.originLocationId,
        deliveryAddress,
        paymentMethod: input.paymentMethod || null,
        discountGTQ: discount,
        amountReceivedGTQ: amountReceived,
        totalGTQ: total,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantityValue,
            reservedQuantity: isQuote ? 0 : item.quantityValue,
            unitPrice: item.unitPriceValue,
          })),
        },
      },
    });

    if (!isQuote) {
      for (const item of aggregateStockItems(items)) {
        await tx.stockBalance.update({
          where: { productId_locationId: { productId: item.productId, locationId: input.originLocationId } },
          data: { reserved: { increment: item.quantityValue } },
        });
      }
      if (preorder.invoice) {
        await tx.invoice.update({ where: { id: preorder.invoice.id }, data: { totalGTQ: total } });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: "PREORDER_UPDATED",
        entity: "Preorder",
        entityId: preorder.id,
        metadata: {
          code: preorder.code,
          previousStatus: preorder.status,
          reason: "Preventa editada antes de despacho",
          previousTotal: preorder.totalGTQ.toString(),
          newTotal: String(total),
          affectsInventory: isQuote ? false : true,
          affectsSales: !isQuote,
        },
      },
    });

    return updated;
  });
}

export async function getNextPreorderCode() {
  const year = new Date().getFullYear();
  const count = await prisma.preorder.count({ where: { code: { startsWith: `PV-${year}-` } } });
  return `PV-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function getPreviewPreorderCode(viewer?: Viewer) {
  if (viewer?.role.name === "Vendedor") {
    const salesBook = await prisma.salesBook.findFirst({
      where: { userId: viewer.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!salesBook) return "Sin talonario activo";
    if (salesBook.nextNumber > salesBook.endNumber) return "Talonario terminado";

    return `PV-${String(salesBook.nextNumber).padStart(7, "0")}`;
  }

  return getNextPreorderCode();
}

async function buildPreorderCode(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const count = await tx.preorder.count({ where: { code: { startsWith: `PV-${year}-` } } });
  return `PV-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function buildSellerPreorderCode(tx: Prisma.TransactionClient, sellerId: string) {
  const seller = await tx.user.findUnique({ where: { id: sellerId }, include: { role: true } });
  if (seller?.role.name !== "Vendedor") return buildPreorderCode(tx);

  const salesBook = await tx.salesBook.findFirst({
    where: { userId: sellerId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!salesBook) throw new Error("El vendedor no tiene talonario activo. Asigna un rango en Usuarios antes de crear preventas.");
  if (salesBook.nextNumber > salesBook.endNumber) throw new Error("El talonario del vendedor ya se termino. Asigna un nuevo rango.");

  const nextNumber = salesBook.nextNumber;
  await tx.salesBook.update({
    where: { id: salesBook.id },
    data: {
      nextNumber: { increment: 1 },
      isActive: nextNumber + 1 <= salesBook.endNumber,
    },
  });

  return `PV-${String(nextNumber).padStart(7, "0")}`;
}

async function buildInvoiceNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const count = await tx.invoice.count({ where: { number: { startsWith: `FAC-${year}-` } } });
  return `FAC-${year}-${String(count + 1).padStart(6, "0")}`;
}

function buildInvoiceNumberFromPreorder(code: string) {
  const match = /^PV-(\d{7})$/.exec(code);
  return match ? `FAC-${match[1]}` : "";
}

function buildQuoteWhatsappUrl(phone: string, quote: string, client: string, total: unknown) {
  const guatemalaPhone = normalizeGuatemalaPhone(phone);
  if (!guatemalaPhone) return "";
  const message = `Cotizacion ${quote} para ${client}. Total ${formatGTQ(Number(total || 0))}. Documento informativo, no descuenta stock hasta confirmar la venta.`;
  return `https://wa.me/${guatemalaPhone}?text=${encodeURIComponent(message)}`;
}

async function findOrCreateClient(tx: Prisma.TransactionClient, input: { clientName: string; taxId?: string; phone?: string; address?: string }) {
  const taxId = input.taxId?.trim() || null;
  const existing = taxId ? await tx.client.findFirst({ where: { taxId } }) : null;
  if (existing) {
    return tx.client.update({ where: { id: existing.id }, data: { name: input.clientName.trim(), phone: cleanPhone(input.phone || ""), address: input.address?.trim() || null } });
  }

  return tx.client.create({ data: { name: input.clientName.trim(), taxId, phone: cleanPhone(input.phone || ""), address: input.address?.trim() || null } });
}

function productTitle(product: { name: string; modelName: string | null }) {
  return product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
}

function parseMoney(value: string) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Los montos y cantidades deben ser numeros mayores o iguales a cero.");
  return parsed;
}

function aggregateStockItems<T extends { productId: string; quantityValue: number }>(items: T[]) {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantityValue);
  }
  return Array.from(totals.entries())
    .map(([productId, quantityValue]) => ({ productId, quantityValue }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

function parseOptionalCoordinate(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function isValidGuatemalaPhone(value: string) {
  return /^\d{8}$/.test(cleanPhone(value));
}

function normalizeGuatemalaPhone(value: string) {
  const clean = cleanPhone(value);
  if (clean.length === 8) return `502${clean}`;
  if (clean.length === 11 && clean.startsWith("502")) return clean;
  return "";
}

function buildMovementCode(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function statusLabel(status: string) {
  const labels = {
    QUOTE: { label: "Cotizacion", tone: "info" as const },
    PENDING: { label: "Pendiente", tone: "warning" as const },
    CONFIRMED: { label: "Confirmada", tone: "success" as const },
    DISPATCHED: { label: "Entregada", tone: "success" as const },
    CANCELLED: { label: "Cancelada", tone: "danger" as const },
  };

  return labels[status as keyof typeof labels] || { label: status, tone: "neutral" as const };
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    QUOTE_CANCELLED: "Cotizacion cancelada",
    PREORDER_CANCELLED: "Venta anulada",
    PREORDER_UPDATED: "Preventa editada",
  };
  return labels[action] || action;
}

function auditReason(metadata: Prisma.JsonValue | null) {
  return auditMetadataValue(metadata, "reason") || "Sin motivo registrado";
}

function auditInventoryEffect(metadata: Prisma.JsonValue | null) {
  const restored = auditMetadataValue(metadata, "deliveredDispatchesRestored");
  if (auditMetadataValue(metadata, "affectsInventory") === "false") return "No afecto inventario";
  if (auditMetadataValue(metadata, "newTotal")) return "Reserva actualizada antes de despacho";
  if (restored && restored !== "[]") return `Inventario devuelto: ${restored}`;
  return "Reserva liberada o sin movimiento fisico";
}

function auditSalesEffect(metadata: Prisma.JsonValue | null) {
  if (auditMetadataValue(metadata, "affectsSales") === "false") return "No se registro como venta";
  const newTotal = auditMetadataValue(metadata, "newTotal");
  if (newTotal) return `Venta actualizada. Nuevo total ${formatGTQ(Number(newTotal))}`;
  return "Registro comercial cancelado";
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

function formatGTQ(value: Prisma.Decimal | number) {
  return `Q ${Number(value).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(date);
}

function startOfDayInTimeZone(date: Date) {
  const parts = datePartsInGuatemala(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 6, 0, 0, 0));
}

function startOfMonthInTimeZone(date: Date) {
  const parts = datePartsInGuatemala(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, 1, 6, 0, 0, 0));
}

function datePartsInGuatemala(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value || date.getUTCFullYear()),
    month: Number(parts.find((part) => part.type === "month")?.value || date.getUTCMonth() + 1),
    day: Number(parts.find((part) => part.type === "day")?.value || date.getUTCDate()),
  };
}
