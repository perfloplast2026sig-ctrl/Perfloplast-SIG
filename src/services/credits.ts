import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

async function getCreditsModuleDataRaw() {
  const [credits, invoices] = await Promise.all([
    prisma.customerCredit.findMany({
      include: {
        client: true,
        preorder: true,
        invoice: true,
        payments: { include: { createdBy: true }, orderBy: { paymentDate: "desc" } },
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.invoice.findMany({
      where: { credit: null },
      include: { preorder: { include: { client: true, createdBy: true } } },
      orderBy: { issuedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    rows: credits.map(mapCreditRow),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      preorder: invoice.preorder.code,
      client: invoice.preorder.client.name,
      taxId: invoice.preorder.client.taxId || "C/F",
      seller: invoice.preorder.createdBy.name,
      total: Number(invoice.totalGTQ),
      label: `${invoice.preorder.code} / ${invoice.number} - ${invoice.preorder.client.name}`,
    })),
  };
}

export type CreditsModuleData = Awaited<ReturnType<typeof getCreditsModuleDataRaw>>;
export type CreditRow = CreditsModuleData["rows"][number];
export type CreditInvoiceOption = CreditsModuleData["invoices"][number];

export const getCreditsModuleDataCached = unstable_cache(
  async () => getCreditsModuleDataRaw(),
  ["credits-data"],
  { revalidate: 10, tags: ["credits"] }
);

export function getCreditsModuleData() {
  return getCreditsModuleDataCached();
}

export async function createCustomerCredit(input: {
  invoiceId?: string;
  clientName: string;
  taxId?: string;
  phone?: string;
  address?: string;
  sellerName?: string;
  preorderCode: string;
  invoiceNumber?: string;
  creditAmount: string;
  openingBalance?: string;
  notes?: string;
  createdById: string;
}) {
  const creditAmount = parseMoney(input.creditAmount);
  const openingBalance = input.openingBalance?.trim() ? parseMoney(input.openingBalance) : creditAmount;
  if (creditAmount <= 0) throw new Error("El monto del credito debe ser mayor a cero.");
  if (openingBalance < 0 || openingBalance > creditAmount) throw new Error("El saldo inicial no puede superar el credito.");

  return prisma.$transaction(async (tx) => {
    const code = await buildCreditCode(tx);
    if (input.invoiceId) {
      const invoice = await tx.invoice.findUnique({
        where: { id: input.invoiceId },
        include: { preorder: { include: { client: true, createdBy: true } }, credit: true },
      });
      if (!invoice) throw new Error("Factura no encontrada.");
      if (invoice.credit) throw new Error("Esta factura ya tiene credito registrado.");
      return tx.customerCredit.create({
        data: {
          code,
          clientId: invoice.preorder.clientId,
          preorderId: invoice.preorderId,
          invoiceId: invoice.id,
          clientName: invoice.preorder.client.name,
          taxId: invoice.preorder.client.taxId || null,
          phone: invoice.preorder.client.phone || null,
          address: invoice.preorder.client.address || invoice.preorder.deliveryAddress || null,
          sellerName: invoice.preorder.createdBy.name,
          preorderCode: invoice.preorder.code,
          invoiceNumber: invoice.number,
          creditAmountGTQ: Number(invoice.totalGTQ),
          openingBalanceGTQ: Number(invoice.totalGTQ),
          notes: input.notes?.trim() || null,
          createdById: input.createdById,
        },
      });
    }

    if (!input.clientName.trim()) throw new Error("El cliente es obligatorio.");
    if (!input.preorderCode.trim()) throw new Error("El numero de pedido es obligatorio.");
    return tx.customerCredit.create({
      data: {
        code,
        clientName: input.clientName.trim(),
        taxId: input.taxId?.trim() || null,
        phone: cleanPhone(input.phone || "") || null,
        address: input.address?.trim() || null,
        sellerName: input.sellerName?.trim() || null,
        preorderCode: input.preorderCode.trim(),
        invoiceNumber: input.invoiceNumber?.trim() || null,
        creditAmountGTQ: creditAmount,
        openingBalanceGTQ: openingBalance,
        notes: input.notes?.trim() || null,
        createdById: input.createdById,
      },
    });
  });
}

export async function createCreditPayment(input: {
  creditId: string;
  paymentDate?: string;
  bank?: string;
  documentNumber?: string;
  amount: string;
  notes?: string;
  createdById: string;
}) {
  const amount = parseMoney(input.amount);
  if (!input.creditId) throw new Error("Selecciona el credito.");
  if (amount <= 0) throw new Error("El abono debe ser mayor a cero.");

  return prisma.$transaction(async (tx) => {
    const credit = await lockCredit(tx, input.creditId);
    if (!credit) throw new Error("Credito no encontrado.");
    if (credit.status !== "OPEN") throw new Error("Este credito ya no esta abierto para abonos.");
    const paid = await tx.creditPayment.aggregate({ where: { creditId: input.creditId }, _sum: { amountGTQ: true } });
    const balance = Number(credit.openingBalanceGTQ) - Number(paid._sum.amountGTQ || 0);
    if (amount > balance) throw new Error(`El abono supera el saldo pendiente (${formatGTQ(balance)}).`);

    const payment = await tx.creditPayment.create({
      data: {
        creditId: input.creditId,
        paymentDate: input.paymentDate ? new Date(`${input.paymentDate}T12:00:00-06:00`) : new Date(),
        bank: input.bank?.trim() || null,
        documentNumber: input.documentNumber?.trim() || null,
        amountGTQ: amount,
        notes: input.notes?.trim() || null,
        createdById: input.createdById,
      },
    });

    if (balance - amount <= 0) {
      await tx.customerCredit.update({ where: { id: input.creditId }, data: { status: "PAID" } });
    }

    return payment;
  });
}

function mapCreditRow(credit: Prisma.CustomerCreditGetPayload<{ include: { payments: { include: { createdBy: true } }; createdBy: true; client: true; preorder: true; invoice: true } }>) {
  const paid = credit.payments.reduce((sum, payment) => sum + Number(payment.amountGTQ), 0);
  const balance = Math.max(0, Number(credit.openingBalanceGTQ) - paid);
  return {
    id: credit.id,
    code: credit.code,
    client: credit.clientName,
    taxId: credit.taxId || "C/F",
    phone: credit.phone || "",
    address: credit.address || "Sin direccion",
    seller: credit.sellerName || "Sin vendedor",
    preorder: credit.preorderCode,
    invoice: credit.invoiceNumber || "Sin factura",
    creditAmount: Number(credit.creditAmountGTQ),
    openingBalance: Number(credit.openingBalanceGTQ),
    paid,
    balance,
    status: balance <= 0 || credit.status === "PAID" ? { label: "Pagado", tone: "success" as const } : credit.status === "CANCELLED" ? { label: "Anulado", tone: "danger" as const } : { label: "Abierto", tone: "warning" as const },
    createdAtKey: dateKey(credit.createdAt),
    createdAt: formatDate(credit.createdAt),
    payments: credit.payments.map((payment) => ({
      id: payment.id,
      dateKey: dateKey(payment.paymentDate),
      date: formatDate(payment.paymentDate),
      bank: payment.bank || "Sin banco",
      document: payment.documentNumber || "Sin documento",
      amount: Number(payment.amountGTQ),
      notes: payment.notes || "",
      user: payment.createdBy.name,
    })),
  };
}

async function buildCreditCode(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const count = await tx.customerCredit.count({ where: { code: { startsWith: `CR-${year}-` } } });
  return `CR-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function lockCredit(tx: Prisma.TransactionClient, creditId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; openingBalanceGTQ: Prisma.Decimal; status: string }>>`
    SELECT id, openingBalanceGTQ, status
    FROM \`CustomerCredit\`
    WHERE id = ${creditId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

function parseMoney(value: string) {
  const parsed = Number(String(value || "0").replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Los montos deben ser numeros mayores o iguales a cero.");
  return parsed;
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala" }).format(date);
}

function formatGTQ(value: number) {
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}