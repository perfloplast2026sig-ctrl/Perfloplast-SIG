import { prisma } from "@/lib/prisma";

export type PasswordResetRequestRow = {
  id: string;
  requesterEmail: string;
  userId: string | null;
  status: string;
  createdAt: Date;
};

export async function findPendingPasswordResetRequests(take = 20) {
  return prisma.$queryRaw<PasswordResetRequestRow[]>`
    SELECT id, requesterEmail, userId, status, createdAt
    FROM PasswordResetRequest
    WHERE status = 'PENDING'
    ORDER BY createdAt DESC
    LIMIT ${take}
  `;
}

export async function findRecentPendingPasswordResetRequest(email: string, since: Date) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM PasswordResetRequest
    WHERE requesterEmail = ${email}
      AND status = 'PENDING'
      AND createdAt >= ${since}
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function createPasswordResetRequest(input: { requesterEmail: string; userId?: string | null }) {
  const id = crypto.randomUUID();

  await prisma.$executeRaw`
    INSERT INTO PasswordResetRequest (id, requesterEmail, userId, status, createdAt, updatedAt)
    VALUES (${id}, ${input.requesterEmail}, ${input.userId || null}, 'PENDING', NOW(3), NOW(3))
  `;

  return id;
}

export async function resolvePasswordResetRequest(requestId: string, resolvedById: string) {
  await prisma.$executeRaw`
    UPDATE PasswordResetRequest
    SET status = 'RESOLVED',
        resolvedById = ${resolvedById},
        resolvedAt = NOW(3),
        updatedAt = NOW(3)
    WHERE id = ${requestId}
  `;
}
