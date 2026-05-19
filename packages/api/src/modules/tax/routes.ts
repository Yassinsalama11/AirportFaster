import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';
import { writeAuditLog } from '../../lib/audit.js';
import {
  listTaxRates,
  findTaxRateById,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
} from './service.js';

function getAuditCtx(request: {
  session: { userId: string } | null;
  ip: string;
  headers: { 'user-agent'?: string };
}) {
  return {
    userId: request.session?.userId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

const IdParamsSchema = z.object({ id: z.string().uuid() });

const CreateTaxRateSchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  taxType: z.enum(['vat', 'gst', 'sales_tax']),
  rate: z.number().min(0).max(1), // decimal 0.0 – 1.0
  serviceType: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validFrom must be YYYY-MM-DD'),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

const UpdateTaxRateSchema = CreateTaxRateSchema.partial();

export async function taxAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/tax-rates
  fastify.get(
    '/',
    { preHandler: requirePermission('pricing.read') },
    async (_request, reply) => {
      const rates = await listTaxRates();
      return reply.status(200).send({ success: true, data: { rates } });
    },
  );

  // POST /api/admin/tax-rates
  fastify.post(
    '/',
    { preHandler: requirePermission('pricing.write') },
    async (request, reply) => {
      const parseResult = CreateTaxRateSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tax rate',
            details: parseResult.error.flatten(),
          },
        });
      }
      const rate = await createTaxRate(parseResult.data);
      await writeAuditLog({
        ...getAuditCtx(request),
        action: 'tax.rate.create',
        entityType: 'tax_rate',
        entityId: rate.id,
      });
      return reply.status(201).send({ success: true, data: { rate } });
    },
  );

  // GET /api/admin/tax-rates/:id
  fastify.get(
    '/:id',
    { preHandler: requirePermission('pricing.read') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid id' },
        });
      }
      const rate = await findTaxRateById(paramsResult.data.id);
      if (!rate) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tax rate not found' },
        });
      }
      return reply.status(200).send({ success: true, data: { rate } });
    },
  );

  // PATCH /api/admin/tax-rates/:id
  fastify.patch(
    '/:id',
    { preHandler: requirePermission('pricing.write') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      const bodyResult = UpdateTaxRateSchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid update request' },
        });
      }
      const existing = await findTaxRateById(paramsResult.data.id);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tax rate not found' },
        });
      }
      const rate = await updateTaxRate(paramsResult.data.id, bodyResult.data);
      await writeAuditLog({
        ...getAuditCtx(request),
        action: 'tax.rate.update',
        entityType: 'tax_rate',
        entityId: rate.id,
      });
      return reply.status(200).send({ success: true, data: { rate } });
    },
  );

  // DELETE /api/admin/tax-rates/:id (soft delete — sets isActive=false)
  fastify.delete(
    '/:id',
    { preHandler: requirePermission('pricing.write') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid id' },
        });
      }
      const existing = await findTaxRateById(paramsResult.data.id);
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tax rate not found' },
        });
      }
      await deleteTaxRate(paramsResult.data.id);
      await writeAuditLog({
        ...getAuditCtx(request),
        action: 'tax.rate.delete',
        entityType: 'tax_rate',
        entityId: paramsResult.data.id,
      });
      return reply.status(200).send({
        success: true,
        data: { id: paramsResult.data.id, isActive: false },
      });
    },
  );
}
