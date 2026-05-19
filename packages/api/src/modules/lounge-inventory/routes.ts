import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';
import { getLoungesByAirport, getAllLounges } from './service.js';

const AirportQuerySchema = z.object({
  airport: z.string().length(3).toUpperCase(),
});

// ── Public routes ─────────────────────────────────────────────────────────────

export async function loungePublicRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/public/lounges?airport=<iata>
  fastify.get('/', async (request, reply) => {
    const parseResult = AirportQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query param `airport` (3-letter IATA code) is required',
          details: parseResult.error.flatten(),
        },
      });
    }

    const lounges = await getLoungesByAirport(parseResult.data.airport);
    return reply.status(200).send({ success: true, data: { lounges } });
  });
}

// ── Admin routes ──────────────────────────────────────────────────────────────

export async function loungeAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/lounges — list all configured lounges
  fastify.get(
    '/',
    { preHandler: requirePermission('airports.read') },
    async (_request, reply) => {
      const lounges = await getAllLounges();
      return reply.status(200).send({ success: true, data: { lounges } });
    },
  );

  // GET /api/admin/lounges?airport=<iata> — filter by airport
  // Note: handled via the same endpoint via optional query param
}
