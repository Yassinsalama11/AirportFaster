import type { FastifyInstance } from 'fastify';
import { SearchQuerySchema } from './validators.js';
import { searchService } from './service.js';

export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/public/search
  fastify.get('/', async (request, reply) => {
    const parseResult = SearchQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: parseResult.error.flatten(),
        },
      });
    }

    // Extract session ID from the airportfaster_session cookie if present.
    const sessionId =
      (request.cookies as Record<string, string | undefined>)['airportfaster_session'] ?? undefined;

    const results = await searchService(parseResult.data, sessionId);

    return reply.status(200).send({
      success: true,
      data: {
        results,
        total: results.length,
        query: parseResult.data.q,
      },
    });
  });
}
