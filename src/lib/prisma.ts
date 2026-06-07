import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta configurada.");
  }

  const url = new URL(databaseUrl);
  const host = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
  const isRemote = host !== "127.0.0.1";

  return new PrismaMariaDb({
    host,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    // Serverless: fewer connections, faster startup
    connectionLimit: isRemote ? 3 : 10,
    // Local MySQL 8 can require RSA key retrieval when SSL is not enabled.
    allowPublicKeyRetrieval: !isRemote,
    // SSL required for Google Cloud SQL
    ...(isRemote && { ssl: { rejectUnauthorized: false } }),
  });
}

// Cache the Prisma client across warm serverless invocations
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });
globalForPrisma.prisma = prisma;
