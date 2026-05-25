import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '@airportfaster/db';
import { z } from 'zod';
import { writeAuditLog } from '../../lib/audit.js';
import { requirePermission } from '../../lib/rbac.js';
import {
  AirportIdParamsSchema,
  CreateAirportBodySchema,
  ListAirportsQuerySchema,
  UpdateAirportBodySchema,
} from './validators.js';
import {
  AirportError,
  createAirportService,
  deleteAirportService,
  getAirportService,
  listAirportsService,
  publishAirportService,
  unpublishAirportService,
  updateAirportService,
} from './service.js';

const UpsertTranslationBodySchema = z.object({
  locale: z.string().min(2).max(10),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).optional(),
});

const UpsertSeoBodySchema = z.object({
  metaTitle: z.string().trim().max(60).optional(),
  metaDescription: z.string().trim().max(160).optional(),
  ogTitle: z.string().trim().max(200).optional(),
  ogDescription: z.string().trim().max(300).optional(),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  ogImage: z.string().url().optional().or(z.literal('')),
});

const UpdateServicesBodySchema = z.object({
  services: z.array(
    z.object({
      serviceId: z.string().uuid(),
      isActive: z.boolean(),
      cutOffMinutes: z.number().int().min(0).optional().nullable(),
      minNoticeMinutes: z.number().int().min(0).optional().nullable(),
      minimumLeadHours: z.number().int().min(0).optional(),
      maxLeadDays: z.number().int().min(1).optional(),
      directionAvailable: z.enum(['arrival', 'departure', 'both']).optional(),
      nameEn: z.string().trim().max(200).optional(),
      nameAr: z.string().trim().max(200).optional(),
    }),
  ),
});

function sendAirportError(reply: FastifyReply, error: AirportError) {
  return reply.status(error.statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

function getRequestAuditContext(request: {
  session: { userId: string } | null;
  ip: string;
  headers: { 'user-agent'?: string | undefined };
}) {
  return {
    userId: request.session?.userId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

export async function airportRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/',
    { preHandler: requirePermission('airports.read') },
    async (request, reply) => {
      const parseResult = ListAirportsQuerySchema.safeParse(request.query);
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

      const result = await listAirportsService(parseResult.data);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  fastify.get(
    '/:id',
    { preHandler: requirePermission('airports.read') },
    async (request, reply) => {
      const paramsResult = AirportIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid airport id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        const airport = await getAirportService(paramsResult.data.id);
        return reply.status(200).send({
          success: true,
          data: { airport },
        });
      } catch (error) {
        if (error instanceof AirportError) {
          return sendAirportError(reply, error);
        }
        throw error;
      }
    },
  );

  fastify.post(
    '/',
    { preHandler: requirePermission('airports.write') },
    async (request, reply) => {
      const parseResult = CreateAirportBodySchema.safeParse(request.body);
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
        const airport = await createAirportService(parseResult.data);
        await writeAuditLog({
          ...getRequestAuditContext(request),
          action: 'airports.create',
          entityType: 'airport',
          entityId: airport.id,
          metadata: {
            iataCode: airport.iataCode,
            slug: airport.slug,
          },
        });

        return reply.status(201).send({
          success: true,
          data: { airport },
        });
      } catch (error) {
        if (error instanceof AirportError) {
          return sendAirportError(reply, error);
        }
        throw error;
      }
    },
  );

  fastify.patch(
    '/:id',
    { preHandler: requirePermission('airports.write') },
    async (request, reply) => {
      const paramsResult = AirportIdParamsSchema.safeParse(request.params);
      const bodyResult = UpdateAirportBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid airport update request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        const airport = await updateAirportService(paramsResult.data.id, bodyResult.data);
        await writeAuditLog({
          ...getRequestAuditContext(request),
          action: 'airports.update',
          entityType: 'airport',
          entityId: airport.id,
          metadata: {
            changedFields: Object.keys(bodyResult.data),
          },
        });

        return reply.status(200).send({
          success: true,
          data: { airport },
        });
      } catch (error) {
        if (error instanceof AirportError) {
          return sendAirportError(reply, error);
        }
        throw error;
      }
    },
  );

  fastify.patch(
    '/:id/publish',
    { preHandler: requirePermission('airports.publish') },
    async (request, reply) => {
      const paramsResult = AirportIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid airport id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        const airport = await publishAirportService(paramsResult.data.id);
        await writeAuditLog({
          ...getRequestAuditContext(request),
          action: 'airports.publish',
          entityType: 'airport',
          entityId: airport.id,
          metadata: {
            slug: airport.slug,
            status: airport.status,
          },
        });

        return reply.status(200).send({
          success: true,
          data: { airport },
        });
      } catch (error) {
        if (error instanceof AirportError) {
          return sendAirportError(reply, error);
        }
        throw error;
      }
    },
  );

  fastify.patch(
    '/:id/unpublish',
    { preHandler: requirePermission('airports.publish') },
    async (request, reply) => {
      const paramsResult = AirportIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid airport id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        const airport = await unpublishAirportService(paramsResult.data.id);
        await writeAuditLog({
          ...getRequestAuditContext(request),
          action: 'airports.unpublish',
          entityType: 'airport',
          entityId: airport.id,
          metadata: {
            slug: airport.slug,
            status: airport.status,
          },
        });

        return reply.status(200).send({
          success: true,
          data: { airport },
        });
      } catch (error) {
        if (error instanceof AirportError) {
          return sendAirportError(reply, error);
        }
        throw error;
      }
    },
  );

  fastify.delete(
    '/:id',
    { preHandler: requirePermission('airports.write') },
    async (request, reply) => {
      const paramsResult = AirportIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid airport id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        await deleteAirportService(paramsResult.data.id);
        await writeAuditLog({
          ...getRequestAuditContext(request),
          action: 'airports.delete',
          entityType: 'airport',
          entityId: paramsResult.data.id,
        });

        return reply.status(204).send();
      } catch (error) {
        if (error instanceof AirportError) {
          return sendAirportError(reply, error);
        }
        throw error;
      }
    },
  );

  // POST /:id/translations — upsert translation by locale
  fastify.post(
    '/:id/translations',
    { preHandler: requirePermission('airports.write') },
    async (request, reply) => {
      const paramsResult = AirportIdParamsSchema.safeParse(request.params);
      const bodyResult = UpsertTranslationBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid translation request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        await getAirportService(paramsResult.data.id);
      } catch (error) {
        if (error instanceof AirportError) return sendAirportError(reply, error);
        throw error;
      }

      const translation = await prisma.airportTranslation.upsert({
        where: {
          airportId_locale: {
            airportId: paramsResult.data.id,
            locale: bodyResult.data.locale,
          },
        },
        update: {
          name: bodyResult.data.name,
          description: bodyResult.data.description ?? null,
        },
        create: {
          airportId: paramsResult.data.id,
          locale: bodyResult.data.locale,
          name: bodyResult.data.name,
          description: bodyResult.data.description ?? null,
        },
      });

      await writeAuditLog({
        ...getRequestAuditContext(request),
        action: 'airports.translation.upsert',
        entityType: 'airport',
        entityId: paramsResult.data.id,
        metadata: { locale: bodyResult.data.locale },
      });

      return reply.status(200).send({ success: true, data: { translation } });
    },
  );

  // PATCH /:id/seo — upsert airport SEO fields
  fastify.patch(
    '/:id/seo',
    { preHandler: requirePermission('airports.write') },
    async (request, reply) => {
      const paramsResult = AirportIdParamsSchema.safeParse(request.params);
      const bodyResult = UpsertSeoBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid SEO request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        await getAirportService(paramsResult.data.id);
      } catch (error) {
        if (error instanceof AirportError) return sendAirportError(reply, error);
        throw error;
      }

      const seoData = {
        metaTitle: bodyResult.data.metaTitle ?? null,
        metaDescription: bodyResult.data.metaDescription ?? null,
        ogTitle: bodyResult.data.ogTitle ?? null,
        ogDescription: bodyResult.data.ogDescription ?? null,
        canonicalUrl: bodyResult.data.canonicalUrl ?? null,
        ogImage: bodyResult.data.ogImage ?? null,
      };

      const seo = await prisma.airportSeo.upsert({
        where: { airportId: paramsResult.data.id },
        update: seoData,
        create: { airportId: paramsResult.data.id, ...seoData },
      });

      await writeAuditLog({
        ...getRequestAuditContext(request),
        action: 'airports.seo.upsert',
        entityType: 'airport',
        entityId: paramsResult.data.id,
      });

      return reply.status(200).send({ success: true, data: { seo } });
    },
  );

  // PATCH /:id/services — update airport services configuration
  fastify.patch(
    '/:id/services',
    { preHandler: requirePermission('airports.write') },
    async (request, reply) => {
      const paramsResult = AirportIdParamsSchema.safeParse(request.params);
      const bodyResult = UpdateServicesBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid services request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        await getAirportService(paramsResult.data.id);
      } catch (error) {
        if (error instanceof AirportError) return sendAirportError(reply, error);
        throw error;
      }

      const airportId = paramsResult.data.id;
      const updatedServices = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const svc of bodyResult.data.services) {
          const record = await tx.airportService.upsert({
            where: { airportId_serviceId: { airportId, serviceId: svc.serviceId } },
            update: {
              isActive: svc.isActive,
              cutOffMinutes: svc.cutOffMinutes ?? null,
              minNoticeMinutes: svc.minNoticeMinutes ?? null,
              ...(svc.minimumLeadHours !== undefined && { minimumLeadHours: svc.minimumLeadHours }),
              ...(svc.maxLeadDays !== undefined && { maxLeadDays: svc.maxLeadDays }),
              ...(svc.directionAvailable !== undefined && { directionAvailable: svc.directionAvailable }),
            },
            create: {
              airportId,
              serviceId: svc.serviceId,
              isActive: svc.isActive,
              cutOffMinutes: svc.cutOffMinutes ?? null,
              minNoticeMinutes: svc.minNoticeMinutes ?? null,
              ...(svc.minimumLeadHours !== undefined && { minimumLeadHours: svc.minimumLeadHours }),
              ...(svc.maxLeadDays !== undefined && { maxLeadDays: svc.maxLeadDays }),
              ...(svc.directionAvailable !== undefined && { directionAvailable: svc.directionAvailable }),
            },
            include: { service: { include: { translations: true } }, translations: true },
          });

          // Upsert per-locale market-name translations (en + ar)
          if (svc.nameEn && svc.nameEn.trim()) {
            await tx.airportServiceTranslation.upsert({
              where: { airportServiceId_locale: { airportServiceId: record.id, locale: 'en' } },
              update: { name: svc.nameEn.trim() },
              create: { airportServiceId: record.id, locale: 'en', name: svc.nameEn.trim() },
            });
          } else if (svc.nameEn === '') {
            await tx.airportServiceTranslation
              .delete({
                where: { airportServiceId_locale: { airportServiceId: record.id, locale: 'en' } },
              })
              .catch(() => undefined);
          }
          if (svc.nameAr && svc.nameAr.trim()) {
            await tx.airportServiceTranslation.upsert({
              where: { airportServiceId_locale: { airportServiceId: record.id, locale: 'ar' } },
              update: { name: svc.nameAr.trim() },
              create: { airportServiceId: record.id, locale: 'ar', name: svc.nameAr.trim() },
            });
          } else if (svc.nameAr === '') {
            await tx.airportServiceTranslation
              .delete({
                where: { airportServiceId_locale: { airportServiceId: record.id, locale: 'ar' } },
              })
              .catch(() => undefined);
          }

          results.push(record);
        }
        return results;
      });

      await writeAuditLog({
        ...getRequestAuditContext(request),
        action: 'airports.services.update',
        entityType: 'airport',
        entityId: airportId,
        metadata: { serviceCount: bodyResult.data.services.length },
      });

      return reply.status(200).send({ success: true, data: { services: updatedServices } });
    },
  );
}
