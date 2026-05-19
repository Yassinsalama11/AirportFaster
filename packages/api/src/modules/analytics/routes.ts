import type { FastifyInstance } from 'fastify';
import { requirePermission } from '../../lib/rbac.js';
import {
  trackEvent,
  getFunnelData,
  getTopAirports,
  getStatusBreakdown,
  getRevenueOverTime,
  getAirportPerformance,
  getServiceBreakdown,
  getSupplierPerformance,
} from './service.js';
import { z } from 'zod';

const TrackEventBodySchema = z.object({
  eventType: z.string().min(1).max(100),
  properties: z.record(z.unknown()).default({}),
  sessionId: z.string().optional(),
});

const RevenuePeriodSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

const DateRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// ── Public analytics route ────────────────────────────────────────────────────

export async function analyticsPublicRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/public/analytics/event
  fastify.post('/event', async (request, reply) => {
    const parseResult = TrackEventBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      // Return 200 anyway — fire and forget, don't block client
      return reply.status(200).send({ success: true });
    }

    // Fire and forget
    const { eventType, properties, sessionId } = parseResult.data;
    void trackEvent({
      eventType,
      properties,
      sessionId,
      ipAddress: request.ip,
    }).catch(() => {
      // swallow errors silently
    });

    return reply.status(200).send({ success: true });
  });
}

// ── Admin analytics routes ────────────────────────────────────────────────────

export async function analyticsAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/analytics/funnel
  fastify.get(
    '/funnel',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const parseResult = DateRangeQuerySchema.safeParse(request.query);
      const days = parseResult.success ? parseResult.data.days : 30;

      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const data = await getFunnelData(dateFrom, dateTo);
      return reply.status(200).send({ success: true, data });
    },
  );

  // GET /api/admin/analytics/top-airports
  fastify.get(
    '/top-airports',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const parseResult = DateRangeQuerySchema.safeParse(request.query);
      const days = parseResult.success ? parseResult.data.days : 30;

      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const airports = await getTopAirports(dateFrom, dateTo);
      return reply.status(200).send({ success: true, data: { airports } });
    },
  );

  // GET /api/admin/analytics/status-breakdown
  fastify.get(
    '/status-breakdown',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const parseResult = DateRangeQuerySchema.safeParse(request.query);
      const days = parseResult.success ? parseResult.data.days : 30;

      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const breakdown = await getStatusBreakdown(dateFrom, dateTo);
      return reply.status(200).send({ success: true, data: { breakdown } });
    },
  );

  // GET /api/admin/analytics/revenue?period=30d&groupBy=day
  fastify.get(
    '/revenue',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const parseResult = RevenuePeriodSchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query params' },
        });
      }
      const data = await getRevenueOverTime(parseResult.data.period, parseResult.data.groupBy);
      return reply.status(200).send({ success: true, data });
    },
  );

  // GET /api/admin/analytics/airports
  fastify.get(
    '/airports',
    { preHandler: requirePermission('bookings.read') },
    async (_request, reply) => {
      const data = await getAirportPerformance();
      return reply.status(200).send({ success: true, data });
    },
  );

  // GET /api/admin/analytics/services
  fastify.get(
    '/services',
    { preHandler: requirePermission('bookings.read') },
    async (_request, reply) => {
      const data = await getServiceBreakdown();
      return reply.status(200).send({ success: true, data });
    },
  );

  // GET /api/admin/analytics/suppliers
  fastify.get(
    '/suppliers',
    { preHandler: requirePermission('bookings.read') },
    async (_request, reply) => {
      const data = await getSupplierPerformance();
      return reply.status(200).send({ success: true, data });
    },
  );
}
