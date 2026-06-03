export type Role =
  | "Super admin"
  | "Administrador"
  | "Contaduria"
  | "Piloto"
  | "Vendedor"
  | "Bodeguero";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  area: string;
  isActive: boolean;
  isProtected: boolean;
  lastLogin: string;
  status: StatusBadge;
};

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export type StatusBadge = {
  label: string;
  tone: StatusTone;
};
