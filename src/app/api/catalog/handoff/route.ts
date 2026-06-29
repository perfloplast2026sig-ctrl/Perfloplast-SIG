import { NextResponse } from "next/server";
import { createCatalogHandoffToken } from "@/lib/catalog-handoff";
import { requireInventoryManager } from "@/services/auth";

export async function GET() {
  const user = await requireInventoryManager();
  const handoffUrl = new URL(getCatalogHandoffUrl());

  handoffUrl.searchParams.set("token", createCatalogHandoffToken(user, process.env.CATALOG_HANDOFF_EMAIL || "admin@perfloplast.com"));
  handoffUrl.searchParams.set("callbackUrl", getCatalogAdminUrl());

  return NextResponse.redirect(handoffUrl);
}

function getCatalogHandoffUrl() {
  const explicitUrl = process.env.CATALOG_HANDOFF_URL || process.env.NEXT_PUBLIC_CATALOG_HANDOFF_URL;
  if (explicitUrl) return explicitUrl;

  const adminUrl = getCatalogAdminUrl();
  try {
    const url = new URL(adminUrl);
    return `${url.origin}/api/auth/handoff`;
  } catch {
    return "https://catalogoperfloplast.vercel.app/api/auth/handoff";
  }
}

function getCatalogAdminUrl() {
  const explicitUrl = process.env.CATALOG_ADMIN_URL || process.env.NEXT_PUBLIC_CATALOG_ADMIN_URL;
  if (explicitUrl) return explicitUrl;

  const apiUrl = process.env.CATALOG_PRODUCTS_API_URL || process.env.NEXT_PUBLIC_CATALOG_PRODUCTS_API_URL;
  if (!apiUrl) return "https://catalogoperfloplast.vercel.app/admin/catalog";

  try {
    const url = new URL(apiUrl);
    return `${url.origin}/admin/catalog`;
  } catch {
    return "https://catalogoperfloplast.vercel.app/admin/catalog";
  }
}
