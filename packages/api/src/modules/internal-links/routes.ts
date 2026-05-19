import type { FastifyInstance } from 'fastify';
import { prisma } from '@airportfaster/db';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';

// ── T-053: Internal Links API ─────────────────────────────────────────────────
// Internal links are stored in the internal_links table using Page rows (fromPageId / toPageId).
// This API accepts entityType / entityId and resolves (or creates) the corresponding Page row.

const VALID_ENTITY_TYPES = ['airport', 'service'] as const;
type EntityType = (typeof VALID_ENTITY_TYPES)[number];

const CreateInternalLinkBodySchema = z.object({
  sourceEntityType: z.enum(VALID_ENTITY_TYPES),
  sourceEntityId: z.string().uuid(),
  targetEntityType: z.enum(VALID_ENTITY_TYPES),
  targetEntityId: z.string().uuid(),
  anchorText: z.string().trim().min(1).max(300),
  locale: z.string().min(2).max(10).default('en'),
});

const ListInternalLinksQuerySchema = z.object({
  entityType: z.enum(VALID_ENTITY_TYPES).optional(),
  entityId: z.string().uuid().optional(),
  locale: z.string().min(2).max(10).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const DeleteParamsSchema = z.object({
  id: z.string().uuid(),
});

// Maps entity type to the Page type field in the DB.
const PAGE_TYPE_MAP: Record<EntityType, string> = {
  airport: 'airport',
  service: 'service',
};

/**
 * Find or create a Page row for a given entity.
 * Pages may or may not exist; we create them (as draft) if missing.
 */
async function resolveOrCreatePage(
  entityType: EntityType,
  entityId: string,
): Promise<string> {
  // Check by entity ID field.
  const where =
    entityType === 'airport'
      ? { airportId: entityId }
      : { serviceId: entityId };

  const existing = await prisma.page.findFirst({ where });
  if (existing) return existing.id;

  // Determine a unique slug for the new page.
  const slugBase =
    entityType === 'airport'
      ? `airport-${entityId}`
      : `service-${entityId}`;

  const created = await prisma.page.create({
    data: {
      type: PAGE_TYPE_MAP[entityType] as Parameters<typeof prisma.page.create>[0]['data']['type'],
      slug: slugBase,
      status: 'draft',
      airportId: entityType === 'airport' ? entityId : null,
      serviceId: entityType === 'service' ? entityId : null,
    },
  });

  return created.id;
}

export async function internalLinkRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/internal-links — list all links (optionally filtered)
  fastify.get(
    '/',
    { preHandler: requirePermission('cms.read') },
    async (request, reply) => {
      const parseResult = ListInternalLinksQuerySchema.safeParse(request.query);
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

      const { entityType, entityId, locale, limit, offset } = parseResult.data;

      // Build a filter: if entityType+entityId provided, match fromPage or toPage.
      const pageFilter = entityType && entityId
        ? entityType === 'airport'
          ? { airportId: entityId }
          : { serviceId: entityId }
        : undefined;

      const links = await prisma.internalLink.findMany({
        where: {
          ...(locale ? { locale } : {}),
          ...(pageFilter
            ? {
                OR: [
                  { fromPage: pageFilter },
                  { toPage: pageFilter },
                ],
              }
            : {}),
        },
        include: {
          fromPage: {
            select: { id: true, type: true, slug: true, airportId: true, serviceId: true },
          },
          toPage: {
            select: { id: true, type: true, slug: true, airportId: true, serviceId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      return reply.status(200).send({ success: true, data: { links } });
    },
  );

  // POST /api/admin/internal-links — create a link
  fastify.post(
    '/',
    { preHandler: requirePermission('cms.write') },
    async (request, reply) => {
      const parseResult = CreateInternalLinkBodySchema.safeParse(request.body);
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

      const { sourceEntityType, sourceEntityId, targetEntityType, targetEntityId, anchorText, locale } =
        parseResult.data;

      // Resolve page IDs (create pages if needed)
      const [fromPageId, toPageId] = await Promise.all([
        resolveOrCreatePage(sourceEntityType, sourceEntityId),
        resolveOrCreatePage(targetEntityType, targetEntityId),
      ]);

      try {
        const link = await prisma.internalLink.create({
          data: { fromPageId, toPageId, anchorText, locale },
          include: {
            fromPage: {
              select: { id: true, type: true, slug: true, airportId: true, serviceId: true },
            },
            toPage: {
              select: { id: true, type: true, slug: true, airportId: true, serviceId: true },
            },
          },
        });

        return reply.status(201).send({ success: true, data: { link } });
      } catch (error: unknown) {
        // P2002 = unique constraint (duplicate link)
        const prismaError = error as { code?: string };
        if (prismaError?.code === 'P2002') {
          return reply.status(409).send({
            success: false,
            error: { code: 'DUPLICATE_LINK', message: 'This internal link already exists' },
          });
        }
        throw error;
      }
    },
  );

  // DELETE /api/admin/internal-links/:id
  fastify.delete(
    '/:id',
    { preHandler: requirePermission('cms.write') },
    async (request, reply) => {
      const parseResult = DeleteParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid link id' },
        });
      }

      try {
        await prisma.internalLink.delete({ where: { id: parseResult.data.id } });
        return reply.status(204).send();
      } catch (error: unknown) {
        const prismaError = error as { code?: string };
        if (prismaError?.code === 'P2025') {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Internal link not found' },
          });
        }
        throw error;
      }
    },
  );
}
