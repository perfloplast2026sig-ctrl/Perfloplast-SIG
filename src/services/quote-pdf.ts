import { prisma } from "@/lib/prisma";

type QuotePdfData = {
  code: string;
  client: string;
  taxId: string;
  phone: string;
  address: string;
  deliveryAddress: string;
  seller: string;
  warehouse: string;
  date: string;
  discount: string;
  total: string;
  items: Array<{
    product: string;
    color: string;
    quantity: string;
    unitPrice: string;
    subtotal: string;
  }>;
};

export async function getQuotePdfData(preorderId: string, userId: string, canSeeAll: boolean) {
  const quote = await prisma.preorder.findFirst({
    where: {
      id: preorderId,
      status: "QUOTE",
      ...(canSeeAll ? {} : { createdById: userId }),
    },
    include: {
      client: true,
      createdBy: true,
      items: { include: { product: true } },
    },
  });

  if (!quote) {
    throw new Error("Cotizacion no encontrada o sin permisos.");
  }

  const warehouse = quote.originLocationId ? await prisma.location.findUnique({ where: { id: quote.originLocationId } }) : null;

  return {
    code: quote.code,
    client: quote.client.name,
    taxId: quote.client.taxId || "C/F",
    phone: quote.client.phone || "",
    address: quote.client.address || "Sin direccion",
    deliveryAddress: quote.deliveryAddress || quote.client.address || "Sin direccion de entrega",
    seller: quote.createdBy.name,
    warehouse: warehouse?.name || "Sin bodega",
    date: new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(quote.createdAt),
    discount: formatGTQ(quote.discountGTQ),
    total: formatGTQ(quote.totalGTQ),
    items: quote.items.map((item) => ({
      product: productTitle(item.product),
      color: item.product.color || "Sin color",
      quantity: item.quantity.toString(),
      unitPrice: formatGTQ(item.unitPrice),
      subtotal: formatGTQ(Number(item.quantity) * Number(item.unitPrice)),
    })),
  };
}

export function buildQuotePdfBuffer(quote: QuotePdfData) {
  const lines = [
    { x: 48, y: 780, size: 20, text: "PERFLOPLAST" },
    { x: 48, y: 762, size: 8, text: "INDUSTRIA DE PLASTICO" },
    { x: 48, y: 748, size: 8, text: "Aldea Chijou, Santa Cruz Verapaz" },
    { x: 48, y: 736, size: 8, text: "Tel: 44235941 / 53146115" },
    { x: 390, y: 780, size: 10, text: "COTIZACION COMERCIAL" },
    { x: 390, y: 758, size: 18, text: quote.code },
    { x: 48, y: 706, size: 9, text: `Cliente: ${quote.client}` },
    { x: 300, y: 706, size: 9, text: `NIT: ${quote.taxId}` },
    { x: 48, y: 690, size: 9, text: `Telefono: ${quote.phone || "Sin telefono"}` },
    { x: 300, y: 690, size: 9, text: `Fecha: ${quote.date}` },
    { x: 48, y: 674, size: 9, text: `Vendedor: ${quote.seller}` },
    { x: 300, y: 674, size: 9, text: `Bodega ref.: ${quote.warehouse}` },
    { x: 48, y: 646, size: 9, text: "Documento informativo. No descuenta stock hasta confirmar la venta." },
    { x: 48, y: 620, size: 8, text: "PRODUCTO" },
    { x: 270, y: 620, size: 8, text: "COLOR" },
    { x: 350, y: 620, size: 8, text: "CANT." },
    { x: 410, y: 620, size: 8, text: "PRECIO" },
    { x: 485, y: 620, size: 8, text: "SUBTOTAL" },
  ];

  let y = 602;
  for (const item of quote.items.slice(0, 22)) {
    const productLines = wrapText(item.product, 35).slice(0, 2);
    lines.push({ x: 48, y, size: 8, text: productLines[0] || "" });
    if (productLines[1]) lines.push({ x: 48, y: y - 10, size: 8, text: productLines[1] });
    lines.push({ x: 270, y, size: 8, text: item.color });
    lines.push({ x: 360, y, size: 8, text: item.quantity });
    lines.push({ x: 410, y, size: 8, text: item.unitPrice });
    lines.push({ x: 485, y, size: 8, text: item.subtotal });
    y -= productLines[1] ? 26 : 18;
  }

  lines.push({ x: 380, y: Math.max(y - 16, 90), size: 10, text: `Descuento: ${quote.discount}` });
  lines.push({ x: 380, y: Math.max(y - 36, 70), size: 14, text: `Total: ${quote.total}` });
  lines.push({ x: 48, y: 44, size: 7, text: "Generado automaticamente por el sistema de inventario empresarial." });

  return buildPdf(lines);
}

function buildPdf(lines: Array<{ x: number; y: number; size: number; text: string }>) {
  const content = [
    "0.8 w",
    "48 724 m 548 724 l S",
    "48 632 m 548 632 l S",
    ...lines.map((line) => `BT /F1 ${line.size} Tf ${line.x} ${line.y} Td (${escapePdf(line.text)}) Tj ET`),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function wrapText(value: string, maxLength: number) {
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapePdf(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function productTitle(product: { name: string; modelName: string | null }) {
  return product.modelName && product.modelName.toLowerCase() !== "general" ? product.modelName : product.name;
}

function formatGTQ(value: unknown) {
  return `Q ${Number(value || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
