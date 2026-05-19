import type { FastifyInstance } from 'fastify';
import { prisma } from '@airportfaster/db';
import { requirePermission } from '../../lib/rbac.js';

const serviceInclude = {
  translations: true,
  seo: true,
} as const;

export async function adminServicesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/',
    { preHandler: requirePermission('services.read') },
    async (_request, reply) => {
      const services = await prisma.service.findMany({
        include: serviceInclude,
        orderBy: { sortOrder: 'asc' },
      });
      return reply.status(200).send({ success: true, data: { services } });
    },
  );

  fastify.get(
    '/:id',
    { preHandler: requirePermission('services.read') },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const service = await prisma.service.findUnique({
        where: { id },
        include: serviceInclude,
      });
      if (!service) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Service not found' },
        });
      }
      return reply.status(200).send({ success: true, data: { service } });
    },
  );
}

export async function publicServicesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async (_request, reply) => {
    const services = await prisma.service.findMany({
      where: { status: 'active' },
      include: serviceInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return reply.status(200).send({ success: true, data: { services } });
  });
}
