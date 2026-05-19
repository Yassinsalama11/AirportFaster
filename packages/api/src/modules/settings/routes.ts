import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';
import { prisma, Prisma } from '@airportfaster/db';

const SupplierAssignmentSettingsSchema = z.object({
  minReliabilityScore: z.number().min(0).max(1).optional(),
  autoAssignEnabled: z.boolean().optional(),
});

/**
 * Settings admin routes.
 * Registered at /api/admin/settings
 */
export async function settingsAdminRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * PATCH /api/admin/settings/supplier-assignment
   * Configure automated supplier assignment rules.
   * Upserts to settings table with domain: 'supplier_assignment', key: 'supplier_assignment'
   */
  fastify.patch(
    '/supplier-assignment',
    { preHandler: requirePermission('settings.write') },
    async (request, reply) => {
      const parseResult = SupplierAssignmentSettingsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten(),
          },
        });
      }

      const { minReliabilityScore, autoAssignEnabled } = parseResult.data;

      // Load existing setting to merge
      const existing = await prisma.setting.findUnique({
        where: { key: 'supplier_assignment' },
      });

      const existingValue = (existing?.value ?? {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...existingValue };

      if (minReliabilityScore !== undefined) merged['minReliabilityScore'] = minReliabilityScore;
      if (autoAssignEnabled !== undefined) merged['autoAssignEnabled'] = autoAssignEnabled;

      const setting = await prisma.setting.upsert({
        where: { key: 'supplier_assignment' },
        create: {
          key: 'supplier_assignment',
          value: merged as Prisma.InputJsonValue,
          domain: 'supplier_assignment',
          isPublic: false,
        },
        update: {
          value: merged as Prisma.InputJsonValue,
        },
      });

      return reply.status(200).send({ success: true, data: { setting } });
    },
  );

  /**
   * GET /api/admin/settings/supplier-assignment
   * Retrieve current supplier assignment settings.
   */
  fastify.get(
    '/supplier-assignment',
    { preHandler: requirePermission('settings.read') },
    async (_request, reply) => {
      const setting = await prisma.setting.findUnique({
        where: { key: 'supplier_assignment' },
      });

      const value = (setting?.value ?? { minReliabilityScore: 0.7, autoAssignEnabled: true }) as Record<string, unknown>;

      return reply.status(200).send({ success: true, data: { settings: value } });
    },
  );
}
