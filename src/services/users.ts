import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { hashPassword } from "@/lib/password";
import { CORPORATE_EMAIL_DOMAIN, isCorporateEmail, SYSTEM_ROLES } from "@/lib/constants";
import { findPendingPasswordResetRequests, resolvePasswordResetRequest as resolveStoredPasswordResetRequest } from "@/services/password-reset-requests";
import type { Role, UserRow } from "@/types";

async function getUserModuleDataRaw() {
  const [dbUsers, dbRoles, resetRequests] = await Promise.all([
    prisma.user.findMany({
      include: { role: true },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    findPendingPasswordResetRequests(20),
  ]);

  const users: UserRow[] = dbUsers.map((user) => {
    const role = user.role.name as Role;
    const isProtected = role === "Super admin";
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      area: user.area || "Sin area",
      isActive: user.isActive,
      isProtected,
      lastLogin: formatLastLogin(user.lastLoginAt),
      status: user.isActive ? { label: "Activo", tone: "success" } : { label: "Inactivo", tone: "neutral" },
    };
  });

  const roles = dbRoles.map((role) => ({
    role: role.name,
    scope: role.description || "Sin descripcion",
    users: role._count.users,
  }));

  return {
    users,
    roles,
    resetRequests: resetRequests.map((request) => ({
      id: request.id,
      email: request.requesterEmail,
      userId: request.userId,
      requestedAt: formatLastLogin(request.createdAt),
      status: request.status,
    })),
    stats: {
      activeUsers: users.filter((user) => user.isActive).length,
      roles: roles.length,
      domain: CORPORATE_EMAIL_DOMAIN,
      inactiveUsers: users.filter((user) => !user.isActive).length,
    },
  };
}

export const getUserModuleData = unstable_cache(
  async () => getUserModuleDataRaw(),
  ["users-data"],
  {
    revalidate: 10,
    tags: ["users"],
  },
);

export async function getUserEditData(userId: string) {
  const [user, roles] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { role: true } }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      area: user.area || "",
      role: user.role.name as Role,
      isActive: user.isActive,
      isProtected: user.role.name === "Super admin",
    },
    roles: roles.map((role) => ({ role: role.name, scope: role.description || "" })),
  };
}

export async function createUser(input: {
  name: string;
  email: string;
  area?: string;
  roleName: Role;
  password: string;
}) {
  const email = normalizeEmail(input.email);

  if (!input.name.trim()) {
    throw new Error("El nombre es obligatorio.");
  }

  if (!isCorporateEmail(email)) {
    throw new Error(`El correo debe terminar en @${CORPORATE_EMAIL_DOMAIN}.`);
  }

  if (!SYSTEM_ROLES.includes(input.roleName)) {
    throw new Error("Rol no permitido.");
  }

  if (input.password.length < 8) {
    throw new Error("La clave temporal debe tener al menos 8 caracteres.");
  }

  return prisma.$transaction(async (tx) => {
    const role = await tx.role.findUnique({ where: { name: input.roleName } });

    if (!role) {
      throw new Error("El rol no existe. Ejecuta el seed inicial antes de crear usuarios.");
    }

    if (input.roleName === "Super admin") {
      const existingSuperAdmin = await tx.user.count({
        where: { role: { name: "Super admin" } },
      });

      if (existingSuperAdmin > 0) {
        throw new Error("Solo puede existir un Super admin en el sistema.");
      }
    }

    const existingEmail = await tx.user.findUnique({ where: { email } });

    if (existingEmail) {
      throw new Error("Ya existe un usuario con ese correo.");
    }

    return tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        area: input.area?.trim() || null,
        passwordHash: hashPassword(input.password),
        mustChangePassword: true,
        isActive: true,
        roleId: role.id,
      },
    });
  });
}

export async function resolvePasswordResetRequest(requestId: string, resolvedById: string) {
  if (!requestId) {
    throw new Error("Solicitud no valida.");
  }

  return resolveStoredPasswordResetRequest(requestId, resolvedById);
}

export async function setUserActive(userId: string, nextActive: boolean) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, include: { role: true } });

    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    if (user.role.name === "Super admin" && !nextActive) {
      throw new Error("El Super admin no se puede desactivar.");
    }

    if (user.role.name === "Administrador" && !nextActive) {
      const activeAdmins = await tx.user.count({
        where: {
          isActive: true,
          role: { name: "Administrador" },
          NOT: { id: user.id },
        },
      });

      if (activeAdmins < 1) {
        throw new Error("Debe existir al menos un Administrador activo en el sistema.");
      }
    }

    return tx.user.update({ where: { id: user.id }, data: { isActive: nextActive } });
  });
}

export async function updateUser(input: {
  userId: string;
  name: string;
  email: string;
  area?: string;
  roleName: Role;
  password?: string;
}) {
  const email = normalizeEmail(input.email);

  if (!input.name.trim()) {
    throw new Error("El nombre es obligatorio.");
  }

  if (!isCorporateEmail(email)) {
    throw new Error(`El correo debe terminar en @${CORPORATE_EMAIL_DOMAIN}.`);
  }

  if (!SYSTEM_ROLES.includes(input.roleName)) {
    throw new Error("Rol no permitido.");
  }

  if (input.password && input.password.length < 8) {
    throw new Error("La nueva clave temporal debe tener al menos 8 caracteres.");
  }

  return prisma.$transaction(async (tx) => {
    const [user, targetRole, existingEmail] = await Promise.all([
      tx.user.findUnique({ where: { id: input.userId }, include: { role: true } }),
      tx.role.findUnique({ where: { name: input.roleName } }),
      tx.user.findUnique({ where: { email } }),
    ]);

    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    if (!targetRole) {
      throw new Error("El rol seleccionado no existe.");
    }

    if (existingEmail && existingEmail.id !== user.id) {
      throw new Error("Ya existe otro usuario con ese correo.");
    }

    if (user.role.name === "Super admin" && input.roleName !== "Super admin") {
      throw new Error("No se puede cambiar el rol del Super admin unico.");
    }

    if (input.roleName === "Super admin") {
      const otherSuperAdmins = await tx.user.count({
        where: { role: { name: "Super admin" }, NOT: { id: user.id } },
      });

      if (otherSuperAdmins > 0) {
        throw new Error("Solo puede existir un Super admin en el sistema.");
      }
    }

    if (user.role.name === "Administrador" && input.roleName !== "Administrador" && user.isActive) {
      const otherActiveAdmins = await tx.user.count({
        where: {
          isActive: true,
          role: { name: "Administrador" },
          NOT: { id: user.id },
        },
      });

      if (otherActiveAdmins < 1) {
        throw new Error("Debe existir al menos un Administrador activo en el sistema.");
      }
    }

    return tx.user.update({
      where: { id: user.id },
      data: {
        name: input.name.trim(),
        email,
        area: input.area?.trim() || null,
        roleId: targetRole.id,
        ...(input.password ? { passwordHash: hashPassword(input.password), mustChangePassword: true } : {}),
      },
    });
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function formatLastLogin(date: Date | null) {
  if (!date) {
    return "Sin ingreso";
  }

  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
