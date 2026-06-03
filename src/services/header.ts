import type { Prisma } from "@prisma/client";
import { USER_MANAGER_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { findPendingPasswordResetRequests } from "@/services/password-reset-requests";
import type { Role } from "@/types";

export async function getHeaderData(user?: { id: string; role: Role }) {
  const roleName = user?.role;
  const canManageUsers = roleName ? USER_MANAGER_ROLES.includes(roleName) : false;
  const canSeeInventory = roleName ? ["Super admin", "Administrador", "Contaduria", "Bodeguero"].includes(roleName) : false;
  const canSeeProduction = roleName ? ["Super admin", "Administrador", "Bodeguero"].includes(roleName) : false;
  const canSeePreorders = roleName ? ["Super admin", "Administrador", "Vendedor"].includes(roleName) : false;
  const canSeeDispatches = roleName ? ["Super admin", "Administrador", "Piloto", "Bodeguero"].includes(roleName) : false;
  const preorderScope: Prisma.PreorderWhereInput = roleName === "Vendedor" ? { createdById: user?.id } : {};
  const dispatchScope: Prisma.DispatchWhereInput = roleName === "Piloto" ? { responsibleId: user?.id } : {};
  const [lowStock, pendingPreorders, activeProduction, openDispatches, products, preorders, clients, dispatches, resetRequests] = await Promise.all([
    canSeeInventory ? prisma.stockBalance.findMany({
      include: { product: true, location: true },
      take: 25,
    }) : Promise.resolve([]),
    canSeePreorders ? prisma.preorder.findMany({
      where: { ...preorderScope, status: { in: ["PENDING", "CONFIRMED"] }, dispatches: { none: { status: "DELIVERED" } } },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }) : Promise.resolve([]),
    canSeeProduction ? prisma.productionOrder.findMany({
      where: { status: { in: ["PLANNED", "IN_PROGRESS", "PAUSED", "QUALITY_REVIEW"] } },
      include: { targetProduct: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }) : Promise.resolve([]),
    canSeeDispatches ? prisma.dispatch.findMany({
      where: { ...dispatchScope, status: { in: ["SCHEDULED", "LOADED", "IN_ROUTE", "RETURN_REQUESTED", "RESCHEDULED"] } },
      include: { preorder: { include: { client: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }) : Promise.resolve([]),
    canSeeInventory ? prisma.product.findMany({
      where: { isActive: true },
      select: { sku: true, name: true, modelName: true, color: true },
      orderBy: { name: "asc" },
      take: 80,
    }) : Promise.resolve([]),
    canSeePreorders ? prisma.preorder.findMany({
      where: preorderScope,
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }) : Promise.resolve([]),
    ["Super admin", "Administrador", "Contaduria"].includes(roleName || "") ? prisma.client.findMany({ orderBy: { createdAt: "desc" }, take: 40 }) : Promise.resolve([]),
    canSeeDispatches ? prisma.dispatch.findMany({ where: dispatchScope, include: { preorder: { include: { client: true } } }, orderBy: { createdAt: "desc" }, take: 40 }) : Promise.resolve([]),
    canManageUsers ? findPendingPasswordResetRequests(5) : Promise.resolve([]),
  ]);

  const filteredLowStock = lowStock
    .filter((item) => Number(item.product.minimumStock) > 0 && Number(item.quantity) <= Number(item.product.minimumStock))
    .slice(0, 4);

  return {
    notifications: [
      ...resetRequests.map((request) => ({
        title: "Solicitud de clave",
        detail: `${request.requesterEmail} solicita recuperacion de acceso`,
        href: "/usuarios",
        tone: "warning" as const,
      })),
      ...filteredLowStock.map((item) => ({
        title: "Stock bajo",
        detail: `${item.product.name} en ${item.location.name}`,
        href: "/inventario",
        tone: "danger" as const,
      })),
      ...pendingPreorders.map((preorder) => ({
        title: "Preventa pendiente",
        detail: `${preorder.code} - ${preorder.client.name}`,
        href: "/preventas",
        tone: "warning" as const,
      })),
      ...activeProduction.map((order) => ({
        title: "Produccion abierta",
        detail: `${order.code}${order.targetProduct ? ` - ${order.targetProduct.name}` : ""}`,
        href: "/produccion",
        tone: "info" as const,
      })),
      ...openDispatches.map((dispatch) => ({
        title: "Despacho activo",
        detail: `${dispatch.code} - ${dispatch.preorder?.client.name || dispatch.destination}`,
        href: "/logistica",
        tone: "info" as const,
      })),
    ].slice(0, 10),
    searchItems: [
      ...products.map((product) => ({
        label: productTitle(product),
        detail: product.sku,
        href: "/inventario",
        type: "Producto",
      })),
      ...preorders.map((preorder) => ({
        label: preorder.code,
        detail: preorder.client.name,
        href: "/preventas",
        type: "Preventa",
      })),
      ...clients.map((client) => ({
        label: client.name,
        detail: client.taxId || client.phone || "Cliente",
        href: "/preventas",
        type: "Cliente",
      })),
      ...dispatches.map((dispatch) => ({
        label: dispatch.code,
        detail: dispatch.preorder?.client.name || dispatch.destination,
        href: "/logistica",
        type: "Despacho",
      })),
    ],
  };
}

function productTitle(product: { name: string; modelName: string | null; color: string | null }) {
  const model = product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
  return product.color ? `${model} - ${product.color}` : model;
}
