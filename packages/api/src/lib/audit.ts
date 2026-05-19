import { prisma, Prisma } from '@airportfaster/db';
import { logger } from './logger.js';

export interface AuditLogEntry {
  userId?: string | undefined;
  action: string;
  entityType?: string | undefined;
  entityId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ? (entry.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (error) {
    // Audit log failure must never block the main operation
    logger.error({ error, entry }, 'Failed to write audit log');
  }
}
