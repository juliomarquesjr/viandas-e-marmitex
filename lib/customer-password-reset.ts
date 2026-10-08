import { createHash, randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

export const RESET_TOKEN_TTL_MINUTES = 60;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72; // bcrypt só considera os primeiros 72 bytes

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createPasswordResetToken(customerId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');

  // Um token ativo por cliente: invalida os anteriores ainda não usados
  await prisma.customerPasswordResetToken.updateMany({
    where: { customerId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.customerPasswordResetToken.create({
    data: {
      customerId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  return token;
}

export async function findValidResetToken(token: string) {
  const record = await prisma.customerPasswordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}
