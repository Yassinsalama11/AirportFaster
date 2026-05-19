// STUB: integrate AviationStack/FlightAware in post-MVP.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';
import { lookupFlight } from './service.js';

const FlightSearchQuerySchema = z.object({
  flightNumber: z.string().min(3).max(8).trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

// ── Public flight search ───────────────────────────────────────────────────────

export async function flightPublicRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/public/flights/search?flightNumber=EK123&date=2026-05-20
  // STUB: returns mock data for MVP — integrate real API in post-MVP
  fastify.get('/search', async (request, reply) => {
    const parseResult = FlightSearchQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        },
      });
    }

    const { flightNumber, date } = parseResult.data;
    const flight = await lookupFlight(flightNumber, date);

    if (!flight) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'FLIGHT_NOT_FOUND',
          message: `No flight found for ${flightNumber} on ${date}`,
        },
      });
    }

    return reply.status(200).send({ success: true, data: { flight } });
  });
}

// ── Admin flight lookup ───────────────────────────────────────────────────────

export async function flightAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/flights/lookup?flightNumber=EK123&date=2026-05-20
  // STUB: returns mock data for MVP — integrate real API in post-MVP
  fastify.get(
    '/lookup',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const parseResult = FlightSearchQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: parseResult.error.flatten(),
          },
        });
      }

      const { flightNumber, date } = parseResult.data;
      const flight = await lookupFlight(flightNumber, date);

      if (!flight) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'FLIGHT_NOT_FOUND',
            message: `No flight found for ${flightNumber} on ${date}`,
          },
        });
      }

      return reply.status(200).send({ success: true, data: { flight } });
    },
  );
}
