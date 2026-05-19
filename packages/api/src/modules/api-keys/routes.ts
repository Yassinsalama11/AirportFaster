import type { FastifyInstance } from 'fastify';
import { requirePermission } from '../../lib/rbac.js';
import { requireApiKey, requireApiScope } from '../../lib/api-key-auth.js';
import { CreateApiKeyBodySchema, ApiKeyIdParamsSchema } from './validators.js';
import {
  listApiKeys,
  findApiKeyById,
  createApiKey,
  revokeApiKey,
  getApiKeyUsageStats,
} from './repository.js';
import { prisma } from '@airportfaster/db';

// ── Admin routes (/api/admin/api-keys) ───────────────────────────────────────

export async function apiKeyAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET / — list all keys (show prefix, not full key)
  fastify.get('/', { preHandler: requirePermission('settings.read') }, async (_request, reply) => {
    const keys = await listApiKeys();
    return reply.status(200).send({ success: true, data: { keys } });
  });

  // POST / — create key (returns full key ONCE, never stored)
  fastify.post('/', { preHandler: requirePermission('settings.write') }, async (request, reply) => {
    const parseResult = CreateApiKeyBodySchema.safeParse(request.body);
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

    const keyRecord = await createApiKey(parseResult.data);
    return reply.status(201).send({
      success: true,
      data: {
        key: keyRecord,
        warning: 'Store this key securely — it will not be shown again.',
      },
    });
  });

  // DELETE /:id — revoke key
  fastify.delete('/:id', { preHandler: requirePermission('settings.write') }, async (request, reply) => {
    const parseResult = ApiKeyIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
    }

    const existing = await findApiKeyById(parseResult.data.id);
    if (!existing) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }

    await revokeApiKey(parseResult.data.id);
    return reply.status(200).send({ success: true, data: { revoked: true } });
  });

  // GET /:id/usage — usage stats
  fastify.get('/:id/usage', { preHandler: requirePermission('settings.read') }, async (request, reply) => {
    const parseResult = ApiKeyIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
    }

    const stats = await getApiKeyUsageStats(parseResult.data.id);
    if (!stats) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } });
    }

    return reply.status(200).send({ success: true, data: { stats } });
  });
}

// ── Public API v1 routes (/api/v1) ───────────────────────────────────────────

export async function apiV1Routes(fastify: FastifyInstance): Promise<void> {
  // All routes require API key authentication
  fastify.addHook('preHandler', requireApiKey);

  /**
   * GET /api/v1/search — search airport services (mirrors /api/public/search)
   * Rate limiting is handled by requireApiKey middleware (per-key Redis rate limit)
   */
  fastify.get('/search', async (request, reply) => {
    // Proxy to the search module logic
    const query = request.query as {
      airport?: string;
      service?: string;
      date?: string;
      passengers?: string;
      locale?: string;
    };

    const airports = await prisma.airport.findMany({
      where: {
        status: 'active',
        ...(query['airport']
          ? {
              OR: [
                { iataCode: { equals: query['airport'], mode: 'insensitive' } },
                { slug: { contains: query['airport'], mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        translations: true,
        airportServices: {
          where: { isActive: true },
          include: {
            service: { include: { translations: true } },
          },
        },
      },
      take: 20,
    });

    return reply.status(200).send({ success: true, data: { airports } });
  });

  /**
   * GET /api/v1/airports/:slug — airport detail
   */
  fastify.get('/airports/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const airport = await prisma.airport.findUnique({
      where: { slug },
      include: {
        translations: true,
        images: true,
        seo: true,
        airportServices: {
          where: { isActive: true },
          include: {
            service: { include: { translations: true } },
          },
        },
      },
    });

    if (!airport || airport.status !== 'active') {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Airport not found' },
      });
    }

    return reply.status(200).send({ success: true, data: { airport } });
  });

  /**
   * GET /api/v1/bookings/:reference — booking status (requires bookings.read scope)
   */
  fastify.get(
    '/bookings/:reference',
    { preHandler: requireApiScope('bookings.read') },
    async (request, reply) => {
      const { reference } = request.params as { reference: string };
      const booking = await prisma.booking.findUnique({
        where: { reference },
        select: {
          id: true,
          reference: true,
          status: true,
          serviceDateTime: true,
          passengerCount: true,
          totalMinor: true,
          currency: true,
          createdAt: true,
          airportService: {
            include: {
              airport: { select: { iataCode: true, city: true } },
              service: { select: { slug: true } },
            },
          },
        },
      });

      if (!booking) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Booking not found' },
        });
      }

      return reply.status(200).send({ success: true, data: { booking } });
    },
  );

  /**
   * POST /api/v1/bookings — create booking (requires bookings.write scope)
   */
  fastify.post(
    '/bookings',
    { preHandler: requireApiScope('bookings.write') },
    async (request, reply) => {
      // Import and reuse the public booking service
      const { createBookingService, BookingError } = await import('../bookings/service.js');
      const { CreateBookingBodySchema } = await import('../bookings/validators.js');

      const parseResult = CreateBookingBodySchema.safeParse(request.body);
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

      try {
        const result = await createBookingService(parseResult.data);
        return reply.status(201).send({ success: true, data: result });
      } catch (error) {
        if (error instanceof BookingError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: { code: error.code, message: error.message },
          });
        }
        throw error;
      }
    },
  );
}
