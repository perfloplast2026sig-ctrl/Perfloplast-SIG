import { createHmac, randomUUID } from "node:crypto";

type CatalogHandoffUser = {
  id: string;
  name: string;
  email: string;
  role: { name: string };
};

function getSecret() {
  return process.env.CATALOG_HANDOFF_SECRET || process.env.AUTH_SECRET || "dev-only-change-this-secret";
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createCatalogHandoffToken(user: CatalogHandoffUser, catalogEmail: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "inventario",
    aud: "catalogo-perfloplast",
    sub: user.id,
    email: catalogEmail,
    inventoryEmail: user.email,
    name: user.name,
    role: user.role.name,
    iat: now,
    exp: now + 60,
    nonce: randomUUID(),
  };
  const body = base64Url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}
