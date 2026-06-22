import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";

type Viewer = { id: string; role: { name: string } };

export async function getInvoicesModuleData(viewer?: Viewer) {
  const roleName = viewer?.role.name as Role | undefined;
  const invoices = await prisma.invoice.findMany({
    where: roleName === "Vendedor" ? { preorder: { createdById: viewer?.id } } : {},
    include: {
      preorder: {
        include: {
          client: true,
          createdBy: true,
          items: { include: { product: true } },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
    take: 50,
  });

  return invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    preorder: invoice.preorder.code,
    client: invoice.preorder.client.name,
    taxId: invoice.preorder.client.taxId || "C/F",
    address: invoice.preorder.client.address || invoice.preorder.deliveryAddress || "Sin direccion registrada",
    phone: invoice.preorder.client.phone || "",
    paymentMethod: invoice.preorder.paymentMethod || "No registrado",
    seller: invoice.preorder.createdBy.name,
    subtotal: formatGTQ(invoice.preorder.items.reduce((total, item) => total + Number(item.quantity) * Number(item.unitPrice), 0)),
    discount: formatGTQ(invoice.preorder.discountGTQ),
    amountReceived: formatGTQ(invoice.preorder.amountReceivedGTQ),
    change: formatGTQ(Math.max(0, Number(invoice.preorder.amountReceivedGTQ) - Number(invoice.totalGTQ))),
    total: formatGTQ(invoice.totalGTQ),
    issuedDateKey: new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone: "America/Guatemala" }).format(invoice.issuedAt),
    issuedAt: new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(invoice.issuedAt),
    generatedAt: new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guatemala" }).format(invoice.createdAt),
    companyAddress: invoice.companyAddress,
    companyPhone: invoice.companyPhone,
    items: invoice.preorder.items.map((item) => ({
      sku: item.product.sku,
      product: productTitle(item.product),
      color: item.product.color || "Sin color",
      quantity: Number(item.quantity).toLocaleString("es-GT"),
      unitPrice: formatGTQ(item.unitPrice),
      subtotal: formatGTQ(Number(item.quantity) * Number(item.unitPrice)),
    })),
  }));
}

export type InvoiceRecord = Awaited<ReturnType<typeof getInvoicesModuleData>>[number];

function productTitle(product: { name: string; modelName: string | null }) {
  return product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
}

function formatGTQ(value: unknown) {
  return `Q ${Number(value || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
