import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, Prisma } from '@airportfaster/db';
import { requirePermission } from '../../lib/rbac.js';

const CURRENCY_RE = /^[A-Z]{3}$/;

const UpsertRateBodySchema = z.object({
  baseCurrency: z.string().trim().toUpperCase().regex(CURRENCY_RE),
  quoteCurrency: z.string().trim().toUpperCase().regex(CURRENCY_RE),
  rate: z.coerce.number().positive().max(1_000_000),
});

const DeleteRateParamsSchema = z.object({ id: z.string().uuid() });

/**
 * Admin currency rate routes.
 * Registered at /api/admin/currency-rates
 *
 * Exchange rates are stored as (baseCurrency, quoteCurrency, rate) — meaning
 * 1 unit of `baseCurrency` = `rate` units of `quoteCurrency`.
 * Customer-facing prices are always EUR, but suppliers may quote in their
 * native currency. The platform converts at import time using these rates.
 */
export async function currencyRatesAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/currency-rates — list all rates
  fastify.get(
    '/',
    { preHandler: requirePermission('settings.read') },
    async (_request, reply) => {
      const rates = await prisma.currencyRate.findMany({
        orderBy: [{ baseCurrency: 'asc' }, { quoteCurrency: 'asc' }],
      });
      return reply.status(200).send({
        success: true,
        data: {
          rates: rates.map((r) => ({
            id: r.id,
            baseCurrency: r.baseCurrency,
            quoteCurrency: r.quoteCurrency,
            rate: r.rate.toString(),
            fetchedAt: r.fetchedAt.toISOString(),
            updatedAt: r.createdAt.toISOString(),
          })),
        },
      });
    },
  );

  // PUT /api/admin/currency-rates — upsert a rate (by base+quote pair)
  fastify.put(
    '/',
    { preHandler: requirePermission('settings.write') },
    async (request, reply) => {
      const parsed = UpsertRateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid currency rate payload',
            details: parsed.error.flatten(),
          },
        });
      }
      const { baseCurrency, quoteCurrency, rate } = parsed.data;
      if (baseCurrency === quoteCurrency) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Base and quote currency must differ' },
        });
      }
      const row = await prisma.currencyRate.upsert({
        where: { baseCurrency_quoteCurrency: { baseCurrency, quoteCurrency } },
        create: {
          baseCurrency,
          quoteCurrency,
          rate: new Prisma.Decimal(rate),
          fetchedAt: new Date(),
        },
        update: { rate: new Prisma.Decimal(rate), fetchedAt: new Date() },
      });
      return reply.status(200).send({
        success: true,
        data: {
          rate: {
            id: row.id,
            baseCurrency: row.baseCurrency,
            quoteCurrency: row.quoteCurrency,
            rate: row.rate.toString(),
            fetchedAt: row.fetchedAt.toISOString(),
          },
        },
      });
    },
  );

  // DELETE /api/admin/currency-rates/:id
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requirePermission('settings.write') },
    async (request, reply) => {
      const parsed = DeleteRateParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid id' },
        });
      }
      await prisma.currencyRate.delete({ where: { id: parsed.data.id } });
      return reply.status(200).send({ success: true });
    },
  );
}
