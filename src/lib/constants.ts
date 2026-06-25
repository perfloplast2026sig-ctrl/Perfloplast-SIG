import type { Role } from "@/types";

export const CORPORATE_EMAIL_DOMAIN = process.env.CORPORATE_EMAIL_DOMAIN || "perfloplast.com";

export const SYSTEM_ROLES: Role[] = [
  "Super admin",
  "Administrador",
  "Contaduria",
  "Piloto",
  "Vendedor",
  "Bodeguero",
];

export const USER_MANAGER_ROLES: Role[] = ["Super admin", "Administrador"];
export const INVENTORY_VIEWER_ROLES: Role[] = ["Super admin", "Administrador", "Contaduria", "Bodeguero"];
export const INVENTORY_MANAGER_ROLES: Role[] = ["Super admin", "Administrador", "Bodeguero"];
export const PRODUCTION_MANAGER_ROLES: Role[] = ["Super admin", "Administrador"];
export const CREDIT_MANAGER_ROLES: Role[] = ["Super admin", "Administrador", "Contaduria"];

export function isCorporateEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${CORPORATE_EMAIL_DOMAIN}`);
}
