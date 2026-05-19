import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';
import { writeAuditLog } from '../../lib/audit.js';
import {
  CreatePricingRuleSchema,
  UpdatePricingRuleSchema,
  QuoteRequestSchema,
  CreatePromoCodeSchema,
  UpdatePromoCodeSchema,
} from './validators.js';
import {
  listPricingRules,
  findPricingRuleById,
  createPricingRule,
  updatePricingRule,
  softDeletePricingRule,
  listPromoCodes,
  findPromoCodeById,
  createPromoCode,
  updatePromoCode,
} from './repository.js';
import { quote } from './service.js';
import { getDynamicPrice } from './dynamic.js';

function getAuditCtx(request: { session: { userId: string } | null; ip: string; headers: { 'user-agent'?: string } }) {
  return {
    userId: request.session?.userId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

const IdParamsSchema = z.object({ id: z.string().uuid() });

export async function pricingAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Pricing Rules ──────────────────────────────────────────────────────────

  fastify.get(
    '/rules',
    { preHandler: requirePermission('pricing.read') },
    async (request, reply) => {
      const query = request.query as { airportServiceId?: string };
      if (!query.airportServiceId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'airportServiceId query param required' },
        });
      }
      const rules = await listPricingRules(query.airportServiceId);
      return reply.status(200).send({ success: true, data: { rules } });
    },
  );

  fastify.post(
    '/rules',
    { preHandler: requirePermission('pricing.write') },
    async (request, reply) => {
      const parseResult = CreatePricingRuleSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid pricing rule', details: parseResult.error.flatten() },
        });
      }
      const rule = await createPricingRule(parseResult.data);
      await writeAuditLog({ ...getAuditCtx(request), action: 'pricing.rule.create', entityType: 'pricing_rule', entityId: rule.id });
      return reply.status(201).send({ success: true, data: { rule } });
    },
  );

  fastify.patch(
    '/rules/:id',
    { preHandler: requirePermission('pricing.write') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      const bodyResult = UpdatePricingRuleSchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid update request' } });
      }
      const existing = await findPricingRuleById(paramsResult.data.id);
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Pricing rule not found' } });
      }
      const rule = await updatePricingRule(paramsResult.data.id, bodyResult.data);
      await writeAuditLog({ ...getAuditCtx(request), action: 'pricing.rule.update', entityType: 'pricing_rule', entityId: rule.id });
      return reply.status(200).send({ success: true, data: { rule } });
    },
  );

  fastify.delete(
    '/rules/:id',
    { preHandler: requirePermission('pricing.write') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } });
      }
      const existing = await findPricingRuleById(paramsResult.data.id);
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Pricing rule not found' } });
      }
      await softDeletePricingRule(paramsResult.data.id);
      await writeAuditLog({ ...getAuditCtx(request), action: 'pricing.rule.delete', entityType: 'pricing_rule', entityId: paramsResult.data.id });
      return reply.status(200).send({ success: true, data: { id: paramsResult.data.id, status: 'inactive' } });
    },
  );

  // Admin quote test
  fastify.post(
    '/quote',
    { preHandler: requirePermission('pricing.read') },
    async (request, reply) => {
      const parseResult = QuoteRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid quote request', details: parseResult.error.flatten() },
        });
      }
      const result = await quote({
        airportServiceId: parseResult.data.airportServiceId,
        passengers: parseResult.data.passengers,
        currency: parseResult.data.currency,
        promoCode: parseResult.data.promoCode,
        supplierId: parseResult.data.supplierId,
      });
      if (!result) {
        return reply.status(404).send({ success: false, error: { code: 'NO_PRICING_RULE', message: 'No active pricing rule found for this service' } });
      }
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // ── Promo Codes ────────────────────────────────────────────────────────────

  fastify.get(
    '/promo-codes',
    { preHandler: requirePermission('pricing.read') },
    async (_request, reply) => {
      const promoCodes = await listPromoCodes();
      return reply.status(200).send({ success: true, data: { promoCodes } });
    },
  );

  fastify.post(
    '/promo-codes',
    { preHandler: requirePermission('pricing.write') },
    async (request, reply) => {
      const parseResult = CreatePromoCodeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid promo code', details: parseResult.error.flatten() },
        });
      }
      const promoCode = await createPromoCode(parseResult.data);
      await writeAuditLog({ ...getAuditCtx(request), action: 'pricing.promo.create', entityType: 'promo_code', entityId: promoCode.id });
      return reply.status(201).send({ success: true, data: { promoCode } });
    },
  );

  fastify.patch(
    '/promo-codes/:id',
    { preHandler: requirePermission('pricing.write') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      const bodyResult = UpdatePromoCodeSchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } });
      }
      const existing = await findPromoCodeById(paramsResult.data.id);
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Promo code not found' } });
      }
      const promoCode = await updatePromoCode(paramsResult.data.id, bodyResult.data);
      return reply.status(200).send({ success: true, data: { promoCode } });
    },
  );

  // Dynamic pricing preview
  // GET /api/admin/pricing/dynamic-preview?airportServiceId=<id>&date=<date>&passengers=<n>
  fastify.get(
    '/dynamic-preview',
    { preHandler: requirePermission('pricing.read') },
    async (request, reply) => {
      const DynamicPreviewSchema = z.object({
        airportServiceId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
        passengers: z.coerce.number().int().min(1).max(20).default(1),
      });
      const parseResult = DynamicPreviewSchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query params',
            details: parseResult.error.flatten(),
          },
        });
      }
      const { airportServiceId, date, passengers } = parseResult.data;
      const serviceDate = new Date(`${date}T00:00:00Z`);
      const result = await getDynamicPrice(airportServiceId, serviceDate, passengers);
      return reply.status(200).send({ success: true, data: result });
    },
  );
}

export async function pricingPublicRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/public/pricing/quote?airportServiceId=&passengers=&currency=
  fastify.get('/quote', async (request, reply) => {
    const parseResult = QuoteRequestSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: parseResult.error.flatten() },
      });
    }
    const result = await quote({
      airportServiceId: parseResult.data.airportServiceId,
      passengers: parseResult.data.passengers,
      currency: parseResult.data.currency,
      promoCode: parseResult.data.promoCode,
    });
    if (!result) {
      return reply.status(404).send({ success: false, error: { code: 'NO_PRICING_RULE', message: 'No active pricing rule found' } });
    }
    return reply.status(200).send({ success: true, data: result });
  });
}
