import type { FastifyInstance } from 'fastify';
import { prisma } from '@airportfaster/db';
import { z } from 'zod';
import { sendSalesLeadNotification } from '../notifications/service.js';

const PublicAirportsQuerySchema = z.object({
  featured: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const PublicContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(5000),
  sourcePath: z.string().trim().max(500).optional(),
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

    const supplierIds = [
      ...new Set(
        airport.airportServices
          .flatMap((airportService) => airportService.pricingRules)
          .map((rule) => rule.supplierId)
          .filter((supplierId): supplierId is string => typeof supplierId === 'string'),
      ),
    ];
    const supplierCommissions = supplierIds.length
      ? await prisma.supplier.findMany({
          where: { id: { in: supplierIds } },
          select: { id: true, commissionPercent: true },
        })
      : [];
    const commissionBySupplierId = new Map(
      supplierCommissions.map((supplier) => [
        supplier.id,
        supplier.commissionPercent != null ? Number(supplier.commissionPercent) : null,
      ]),
    );
    const airportWithCommission = {
      ...airport,
      airportServices: airport.airportServices.map((airportService) => ({
        ...airportService,
        pricingRules: airportService.pricingRules.map((rule) => ({
          ...rule,
          supplierCommissionPercent: rule.supplierId ? commissionBySupplierId.get(rule.supplierId) ?? null : null,
        })),
      })),
    };

    return reply.status(200).send({ success: true, data: { airport: airportWithCommission } });
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

  // POST /api/public/contact — For Business inquiry form
  fastify.post('/contact', async (request, reply) => {
    const body = PublicContactSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid contact form request' },
      });
    }

    void sendSalesLeadNotification({
      ...body.data,
      sourcePath: body.data.sourcePath ?? request.headers.referer,
      userAgent: request.headers['user-agent'],
    });

    return reply.status(200).send({ success: true, data: { received: true } });
  });

  // POST /api/public/quote-requests — customer quote request for airports
  // that don't yet have configured pricing.
  fastify.post('/quote-requests', async (request, reply) => {
    const { z } = await import('zod');
    const { sendQuoteRequestNotification } = await import('../notifications/service.js');
    const schema = z.object({
      fullName: z.string().trim().min(2).max(200),
      email: z.string().trim().email(),
      // Phone is required: customer service uses WhatsApp / phone as the
      // primary way to reach the customer with the quote.
      phone: z.string().trim().min(4).max(40),
      airportSlug: z.string().trim().min(2).max(120),
      serviceSlug: z.string().trim().min(2).max(120).optional(),
      direction: z.enum(['arrival', 'departure', 'transfer', 'both']).optional(),
      serviceDate: z.string().trim().min(4).max(64),
      passengerCount: z.coerce.number().int().min(1).max(50),
      flightNumber: z.string().trim().max(20).optional(),
      terminal: z.string().trim().max(10).optional(),
      specialRequests: z.string().trim().max(4000).optional(),
      locale: z.string().trim().min(2).max(8).optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quote request',
          details: parsed.error.flatten(),
        },
      });
    }

    // Look up airport + optional service for human-friendly names in the email.
    const airport = await prisma.airport.findUnique({
      where: { slug: parsed.data.airportSlug },
      include: { translations: { where: { locale: 'en' } } },
    });
    if (!airport) {
      return reply.status(404).send({
        success: false,
        error: { code: 'AIRPORT_NOT_FOUND', message: 'Airport not found' },
      });
    }
    const airportName =
      airport.translations[0]?.name ?? airport.city ?? `Airport ${airport.iataCode}`;

    let serviceName: string | undefined;
    if (parsed.data.serviceSlug) {
      const service = await prisma.service.findUnique({
        where: { slug: parsed.data.serviceSlug },
        include: { translations: { where: { locale: 'en' } } },
      });
      if (service) serviceName = service.translations[0]?.name ?? service.slug;
    }

    void sendQuoteRequestNotification({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      airportName,
      airportIataCode: airport.iataCode,
      ...(serviceName && { serviceName }),
      ...(parsed.data.direction && { direction: parsed.data.direction }),
      serviceDate: parsed.data.serviceDate,
      passengerCount: parsed.data.passengerCount,
      ...(parsed.data.flightNumber && { flightNumber: parsed.data.flightNumber }),
      ...(parsed.data.terminal && { terminal: parsed.data.terminal }),
      ...(parsed.data.specialRequests && { specialRequests: parsed.data.specialRequests }),
      ...(request.headers.referer && { sourcePath: request.headers.referer }),
      ...(request.headers['user-agent'] && { userAgent: request.headers['user-agent'] }),
    }).catch(() => undefined);

    return reply.status(200).send({
      success: true,
      data: { received: true, airport: airport.iataCode, message: 'Quote request received — our team will be in touch within 24 hours.' },
    });
  });
}
