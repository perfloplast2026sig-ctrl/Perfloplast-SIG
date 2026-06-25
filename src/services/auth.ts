import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { CREDIT_MANAGER_ROLES, INVENTORY_MANAGER_ROLES, INVENTORY_VIEWER_ROLES, PRODUCTION_MANAGER_ROLES, USER_MANAGER_ROLES } from "@/lib/constants";
import type { Role } from "@/types";

export async function getCurrentUser() {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    include: { role: true },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireUserManager() {
  const user = await requireCurrentUser();
  const roleName = user.role.name as Role;

  if (!USER_MANAGER_ROLES.includes(roleName)) {
    throw new Error("No tienes permisos para administrar usuarios.");
  }

  return user;
}

export async function requireInventoryManager() {
  const user = await requireCurrentUser();
  const roleName = user.role.name as Role;

  if (!INVENTORY_MANAGER_ROLES.includes(roleName)) {
    throw new Error("No tienes permisos para administrar inventario.");
  }

  return user;
}

export async function requireInventoryViewer() {
  const user = await requireCurrentUser();
  const roleName = user.role.name as Role;

  if (!INVENTORY_VIEWER_ROLES.includes(roleName)) {
    throw new Error("No tienes permisos para consultar inventario.");
  }

  return user;
}

export async function requireSuperAdmin() {
  const user = await requireCurrentUser();

  if (user.role.name !== "Super admin") {
    throw new Error("Solo el Super admin puede realizar esta correccion.");
  }

  return user;
}

export async function requireProductionManager() {
  const user = await requireCurrentUser();
  const roleName = user.role.name as Role;

  if (!PRODUCTION_MANAGER_ROLES.includes(roleName)) {
    throw new Error("No tienes permisos para registrar produccion.");
  }

  return user;
}

export async function requireCreditManager() {
  const user = await requireCurrentUser();
  const roleName = user.role.name as Role;

  if (!CREDIT_MANAGER_ROLES.includes(roleName)) {
    throw new Error("No tienes permisos para administrar creditos de clientes.");
  }

  return user;
}

export async function requireShiftScheduleManager() {
  const user = await requireCurrentUser();
  const roleName = user.role.name as Role;

  if (!["Super admin", "Administrador"].includes(roleName)) {
    throw new Error("No tienes permisos para configurar turnos.");
  }

  return user;
}
