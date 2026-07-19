import { PrismaClient } from '@prisma/client';
import { env } from '../../../../config/env.js';

/**
 * Instancia unica (singleton) do Prisma Client, reaproveitada por toda
 * a aplicacao para evitar exaustao de conexoes com o Postgres.
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
