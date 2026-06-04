import "dotenv/config";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const domain = process.env.CORPORATE_EMAIL_DOMAIN || "perfloplast.com";
const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || `admin@${domain}`;
const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
const adminEmail = process.env.SEED_ADMIN_EMAIL || `administrador@${domain}`;
const adminPassword = process.env.SEED_ADMIN_PASSWORD || superAdminPassword;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no esta configurada.");
}

if (!superAdminPassword || superAdminPassword === "cambia-esta-clave") {
  throw new Error("Configura SEED_SUPER_ADMIN_PASSWORD en .env antes de ejecutar el seed.");
}

if (!adminPassword || adminPassword === "cambia-esta-clave") {
  throw new Error("Configura SEED_ADMIN_PASSWORD o SEED_SUPER_ADMIN_PASSWORD en .env antes de ejecutar el seed.");
}

const url = new URL(process.env.DATABASE_URL);
const useSSL = url.searchParams.get("sslaccept") === "accept_invalid_certs" || url.hostname !== "localhost";
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  connectionLimit: 5,
  ...(useSSL && { ssl: { rejectUnauthorized: false } }),
});
const prisma = new PrismaClient({ adapter });

const roles = [
  ["Super admin", "Control total del sistema, usuarios, roles, permisos y auditoria"],
  ["Administrador", "Gestion operativa, usuarios internos, roles y autorizaciones"],
  ["Contaduria", "Reportes, costos, inventario valorizado y movimientos auditables"],
  ["Piloto", "Despachos asignados, carga del camion, ruta y estado de entrega"],
  ["Vendedor", "Clientes, preventas, disponibilidad y seguimiento comercial"],
  ["Bodeguero", "Entradas, salidas, traslados, ajustes, Kardex e inventario fisico"],
];

function hashPassword(password) {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
  return `${iterations}:${salt}:${hash}`;
}

async function main() {
  for (const [name, description] of roles) {
    await prisma.role.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "Super admin" } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "Administrador" } });

  const existingSuperAdmin = await prisma.user.count({ where: { role: { name: "Super admin" } } });
  if (existingSuperAdmin === 0) {
    await prisma.user.create({
      data: {
        name: "Super Admin",
        email: superAdminEmail.toLowerCase(),
        area: "Direccion",
        passwordHash: hashPassword(superAdminPassword),
        isActive: true,
        mustChangePassword: true,
        roleId: superAdminRole.id,
      },
    });
  }

  const existingAdmin = await prisma.user.count({ where: { role: { name: "Administrador" } } });
  if (existingAdmin === 0) {
    await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail.toLowerCase(),
        area: "Administracion",
        passwordHash: hashPassword(adminPassword),
        isActive: true,
        mustChangePassword: true,
        roleId: adminRole.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completado: roles base, Super admin unico y Administrador minimo.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });
