import type { Prisma } from "@prisma/client";

type StockBalanceRow = {
  id: string;
  productId: string;
  locationId: string;
  quantity: Prisma.Decimal;
  reserved: Prisma.Decimal;
};

export async function lockStockBalance(
  tx: Prisma.TransactionClient,
  productId: string,
  locationId: string
) {
  const rows = await tx.$queryRaw<StockBalanceRow[]>`
    SELECT id, productId, locationId, quantity, reserved
    FROM \`StockBalance\`
    WHERE productId = ${productId} AND locationId = ${locationId}
    FOR UPDATE
  `;

  return rows[0] ?? null;
}

export function availableStock(balance: { quantity: unknown; reserved: unknown } | null | undefined) {
  return Number(balance?.quantity || 0) - Number(balance?.reserved || 0);
}
