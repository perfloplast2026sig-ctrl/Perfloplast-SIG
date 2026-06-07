import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { USER_MANAGER_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { findPendingPasswordResetRequests } from "@/services/password-reset-requests";
import type { Role } from "@/types";

async function getHeaderDataRaw(user?: { id: string; role: Role }) {
  const roleName = user?.role;
  const canManageUsers = roleName ? USER_MANAGER_ROLES.includes(roleName) : false;
  const canSeeInventory = roleName ? ["Super admin", "Administrador", "Contaduria", "Bodeguero"].includes(roleName) : false;
  const canSeeProduction = roleName ? ["Super admin", "Administrador", "Bodeguero"].includes(roleName) : false;
  const canSeePreorders = roleName ? ["Super admin", "Administrador", "Vendedor"].includes(roleName) : false;
  const canSeeDispatches = roleName ? ["Super admin", "Administrador", "Piloto", "Bodeguero"].includes(roleName) : false;
  const canSeeInvoices = roleName ? ["Super admin", "Administrador", "Contaduria", "Vendedor"].includes(roleName) : false;
  const preorderScope: Prisma.PreorderWhereInput = roleName === "Vendedor" ? { createdById: user?.id } : {};
  const dispatchScope: Prisma.DispatchWhereInput = roleName === "Piloto" ? { responsibleId: user?.id } : {};
  const [lowStock, pendingPreorders, activeProduction, openDispatches, products, preorders, clients, dispatches, invoices, productionOrders, users, resetRequests] = await Promise.all([
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
    canSeeInvoices ? prisma.invoice.findMany({ where: roleName === "Vendedor" ? { preorder: { createdById: user?.id } } : {}, include: { preorder: { include: { client: true } } }, orderBy: { issuedAt: "desc" }, take: 40 }) : Promise.resolve([]),
    canSeeProduction ? prisma.productionOrder.findMany({ include: { responsible: true, outputs: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 40 }) : Promise.resolve([]),
    canManageUsers ? prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: "desc" }, take: 40 }) : Promise.resolve([]),
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
        href: `/inventario?search=${encodeURIComponent(`${product.sku} ${productTitle(product)}`)}`,
        type: "Producto",
      })),
      ...preorders.map((preorder) => ({
        label: preorder.code,
        detail: preorder.client.name,
        href: `/preventas?search=${encodeURIComponent(preorder.code)}`,
        type: "Preventa",
      })),
      ...clients.map((client) => ({
        label: client.name,
        detail: client.taxId || client.phone || "Cliente",
        href: `/preventas?search=${encodeURIComponent(client.name)}`,
        type: "Cliente",
      })),
      ...dispatches.map((dispatch) => ({
        label: dispatch.code,
        detail: dispatch.preorder?.client.name || dispatch.destination,
        href: `/logistica?search=${encodeURIComponent(dispatch.code)}`,
        type: "Despacho",
      })),
      ...invoices.map((invoice) => ({
        label: invoice.number,
        detail: `${invoice.preorder.code} - ${invoice.preorder.client.name}`,
        href: `/facturas?search=${encodeURIComponent(invoice.number)}`,
        type: "Factura",
      })),
      ...productionOrders.map((order) => ({
        label: order.code,
        detail: `${formatProductionProducts(order.outputs)} - ${order.responsible.name}`,
        href: `/produccion?search=${encodeURIComponent(order.code)}`,
        type: "Produccion",
      })),
      ...users.map((row) => ({
        label: row.name,
        detail: `${row.email} - ${row.role.name}`,
        href: `/usuarios?search=${encodeURIComponent(row.email)}`,
        type: "Usuario",
      })),
    ],
  };
}

export const getHeaderData = unstable_cache(
  async (user?: { id: string; role: Role }) => getHeaderDataRaw(user),
  ["header-data"],
  {
    revalidate: 10,
    tags: ["header"],
  },
);

function productTitle(product: { name: string; modelName: string | null; color: string | null }) {
  const model = product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
  return product.color ? `${model} - ${product.color}` : model;
}

function formatProductionProducts(outputs: Array<{ product: { name: string; modelName: string | null } }>) {
  if (outputs.length === 0) return "Sin productos";
  const names = outputs.map((output) => output.product.modelName && output.product.modelName.toLowerCase() !== "general" ? output.product.modelName : output.product.name);
  return Array.from(new Set(names)).slice(0, 2).join(", ");
}
