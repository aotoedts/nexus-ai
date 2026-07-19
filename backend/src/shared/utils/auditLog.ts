import { prisma } from '../../core/infrastructure/database/prisma/client.js';
import { v4 as uuid } from 'uuid';
import { logger } from '../../config/logger.js';

/** Registra uma entrada de auditoria persistida, visivel no painel administrativo. */
export async function recordAuditLog(params: {
  userId?: string;
  action: string;
  details?: Record<string, unknown>;
  level?: 'info' | 'warn' | 'error';
}) {
  try {
    await prisma.auditLog.create({
      data: {
        id: uuid(),
        userId: params.userId,
        action: params.action,
        details: params.details as any,
        level: params.level ?? 'info',
      },
    });
  } catch (err) {
    logger.error({ err }, 'Falha ao gravar audit log');
  }
}
