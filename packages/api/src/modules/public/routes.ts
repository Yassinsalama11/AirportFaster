import type { FastifyInstance } from 'fastify';
import { prisma } from '@airportfaster/db';
import { z } from 'zod';

const PublicAirportsQuerySchema = z.object({
  featured: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const publicAirportListInclude = {
  translations: true,
  images: {
    orderBy: [
      { isPrimary: 'desc' as const },
      { sortOrder: 'asc' as const },
    ] as { isPrimary?: 'asc' | 'desc'; sortOrder?: 'asc' | 'desc' }[],
  },
  airportServices: {
    where: { isActive: true },
    include: {
      service: {
        include: {
          translations: true,
        },
      },
    },
  },
};

const publicAirportDetailInclude = {
  ...publicAirportListInclude,
  seo: true,
  airportServices: {
    where: { isActive: true },
    include: {
      pricingRules: {
        where: { status: 'active' as const },
        orderBy: [
          { priority: 'desc' as const },
          { createdAt: 'desc' as const },
        ],
        take: 1,
      },
      service: {
        include: {
          translations: true,
        },
      },
    },
  },
};

export async function publicRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/public/airports
  fastify.get('/airports', async (request, reply) => {
    const query = PublicAirportsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid airport query' },
      });
    }
    const take = query.data.limit ?? (query.data.featured === 'true' ? 8 : undefined);
    const airports = await prisma.airport.findMany({
      where: { status: 'active' },
      include: publicAirportListInclude,
      orderBy: { city: 'asc' },
      ...(take !== undefined && { take }),
    });
    return reply.status(200).send({ success: true, data: { airports } });
  });

  // GET /api/public/airports/:slug
  fastify.get('/airports/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const airport = await prisma.airport.findUnique({
      where: { slug },
      include: publicAirportDetailInclude,
    });

    if (!airport || airport.status !== 'active') {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Airport not found' },
      });
    }

    return reply.status(200).send({ success: true, data: { airport } });
  });

  // GET /api/public/services
  fastify.get('/services', async (_request, reply) => {
    const services = await prisma.service.findMany({
      where: { status: 'active' },
      include: {
        translations: true,
        seo: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    return reply.status(200).send({ success: true, data: { services } });
  });

  // GET /api/public/services/:slug
  fastify.get('/services/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const service = await prisma.service.findUnique({
      where: { slug },
      include: {
        translations: true,
        seo: true,
      },
    });

    if (!service || service.status !== 'active') {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
    }

    return reply.status(200).send({ success: true, data: { service } });
  });

  // POST /api/public/contact — stub endpoint for For Business inquiry form
  fastify.post('/contact', async (_request, reply) => {
    // TODO: Implement email delivery when SMTP is configured
    return reply.status(200).send({ success: true, data: { received: true } });
  });
}
