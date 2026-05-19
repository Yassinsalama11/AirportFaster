import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';
import { writeAuditLog } from '../../lib/audit.js';
import {
  CreateAvailabilityRuleSchema,
  UpdateAvailabilityRuleSchema,
  CreateBlackoutDateSchema,
  CheckAvailabilityQuerySchema,
} from './validators.js';
import {
  listAvailabilityRules,
  findAvailabilityRuleById,
  createAvailabilityRule,
  updateAvailabilityRule,
  deleteAvailabilityRule,
  findBlackoutDates,
  createBlackoutDate,
  deleteBlackoutDate,
} from './repository.js';
import { checkAvailability } from './service.js';

const IdParamsSchema = z.object({ id: z.string().uuid() });

function getAuditCtx(request: { session: { userId: string } | null; ip: string; headers: { 'user-agent'?: string } }) {
  return {
    userId: request.session?.userId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

export async function availabilityAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Availability Rules ─────────────────────────────────────────────────────

  fastify.get(
    '/rules',
    { preHandler: requirePermission('availability.read') },
    async (request, reply) => {
      const query = request.query as { airportServiceId?: string };
      if (!query.airportServiceId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'airportServiceId query param required' },
        });
      }
      const rules = await listAvailabilityRules(query.airportServiceId);
      return reply.status(200).send({ success: true, data: { rules } });
    },
  );

  fastify.post(
    '/rules',
    { preHandler: requirePermission('availability.write') },
    async (request, reply) => {
      const parseResult = CreateAvailabilityRuleSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid availability rule', details: parseResult.error.flatten() },
        });
      }
      const rule = await createAvailabilityRule(parseResult.data);
      await writeAuditLog({ ...getAuditCtx(request), action: 'availability.rule.create', entityType: 'availability_rule', entityId: rule.id });
      return reply.status(201).send({ success: true, data: { rule } });
    },
  );

  fastify.patch(
    '/rules/:id',
    { preHandler: requirePermission('availability.write') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      const bodyResult = UpdateAvailabilityRuleSchema.safeParse(request.body);
      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid update' } });
      }
      const existing = await findAvailabilityRuleById(paramsResult.data.id);
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } });
      }
      const rule = await updateAvailabilityRule(paramsResult.data.id, bodyResult.data);
      return reply.status(200).send({ success: true, data: { rule } });
    },
  );

  fastify.delete(
    '/rules/:id',
    { preHandler: requirePermission('availability.write') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } });
      }
      const existing = await findAvailabilityRuleById(paramsResult.data.id);
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found' } });
      }
      await deleteAvailabilityRule(paramsResult.data.id);
      await writeAuditLog({ ...getAuditCtx(request), action: 'availability.rule.delete', entityType: 'availability_rule', entityId: paramsResult.data.id });
      return reply.status(204).send();
    },
  );

  // ── Blackout Dates ─────────────────────────────────────────────────────────

  fastify.get(
    '/blackouts',
    { preHandler: requirePermission('availability.read') },
    async (request, reply) => {
      const query = request.query as { scopeId?: string; scopeType?: string };
      if (!query.scopeId || !query.scopeType) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'scopeId and scopeType query params required' },
        });
      }
      const blackouts = await findBlackoutDates(
        query.scopeType as 'airport' | 'airport_service',
        query.scopeId,
      );
      return reply.status(200).send({ success: true, data: { blackouts } });
    },
  );

  fastify.post(
    '/blackouts',
    { preHandler: requirePermission('availability.write') },
    async (request, reply) => {
      const parseResult = CreateBlackoutDateSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid blackout date', details: parseResult.error.flatten() },
        });
      }
      const blackout = await createBlackoutDate(parseResult.data);
      await writeAuditLog({ ...getAuditCtx(request), action: 'availability.blackout.create', entityType: 'blackout_date', entityId: blackout.id });
      return reply.status(201).send({ success: true, data: { blackout } });
    },
  );

  fastify.delete(
    '/blackouts/:id',
    { preHandler: requirePermission('availability.write') },
    async (request, reply) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid id' } });
      }
      await deleteBlackoutDate(paramsResult.data.id);
      return reply.status(204).send();
    },
  );
}

export async function availabilityPublicRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/public/availability?airportServiceId=&dateTime=&passengers=
  fastify.get('/', async (request, reply) => {
    const parseResult = CheckAvailabilityQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: parseResult.error.flatten() },
      });
    }
    const result = await checkAvailability({
      airportServiceId: parseResult.data.airportServiceId,
      serviceDateTime: new Date(parseResult.data.dateTime),
      passengerCount: parseResult.data.passengers,
    });
    return reply.status(200).send({ success: true, data: result });
  });
}
