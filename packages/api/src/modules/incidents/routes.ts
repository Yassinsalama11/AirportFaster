import type { FastifyInstance, FastifyReply } from 'fastify';
import { writeAuditLog } from '../../lib/audit.js';
import { requirePermission } from '../../lib/rbac.js';
import {
  ListIncidentsQuerySchema,
  IncidentIdParamsSchema,
  CreateIncidentBodySchema,
  AddIncidentUpdateBodySchema,
  AssignIncidentBodySchema,
  ResolveIncidentBodySchema,
} from './validators.js';
import {
  IncidentError,
  listIncidentsService,
  getIncidentByIdService,
  createIncidentService,
  addIncidentUpdateService,
  assignIncidentService,
  resolveIncidentService,
} from './service.js';

function sendIncidentError(reply: FastifyReply, error: IncidentError) {
  return reply.status(error.statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

function getAuditContext(request: {
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

export async function incidentAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/incidents — list with filters
  fastify.get(
    '/',
    { preHandler: requirePermission('operations.read') },
    async (request, reply) => {
      const parseResult = ListIncidentsQuerySchema.safeParse(request.query);
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

      const result = await listIncidentsService(parseResult.data);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // GET /api/admin/incidents/:id — full detail
  fastify.get(
    '/:id',
    { preHandler: requirePermission('operations.read') },
    async (request, reply) => {
      const paramsResult = IncidentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid incident id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        const incident = await getIncidentByIdService(paramsResult.data.id);
        return reply.status(200).send({ success: true, data: { incident } });
      } catch (error) {
        if (error instanceof IncidentError) return sendIncidentError(reply, error);
        throw error;
      }
    },
  );

  // POST /api/admin/incidents — create incident
  fastify.post(
    '/',
    { preHandler: requirePermission('operations.write') },
    async (request, reply) => {
      const bodyResult = CreateIncidentBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid incident request',
            details: bodyResult.error.flatten(),
          },
        });
      }

      try {
        const actorId = request.session?.userId;
        const incident = await createIncidentService(bodyResult.data, actorId);

        await writeAuditLog({
          ...getAuditContext(request),
          action: 'incidents.create',
          entityType: 'incident',
          entityId: incident.id,
          metadata: {
            type: bodyResult.data.type,
            severity: bodyResult.data.severity,
            bookingId: bodyResult.data.bookingId,
          },
        });

        return reply.status(201).send({ success: true, data: { incident } });
      } catch (error) {
        if (error instanceof IncidentError) return sendIncidentError(reply, error);
        throw error;
      }
    },
  );

  // POST /api/admin/incidents/:id/updates — add update
  fastify.post(
    '/:id/updates',
    { preHandler: requirePermission('operations.write') },
    async (request, reply) => {
      const paramsResult = IncidentIdParamsSchema.safeParse(request.params);
      const bodyResult = AddIncidentUpdateBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        const actorId = request.session?.userId;
        const incident = await addIncidentUpdateService(
          paramsResult.data.id,
          bodyResult.data,
          actorId,
        );
        return reply.status(200).send({ success: true, data: { incident } });
      } catch (error) {
        if (error instanceof IncidentError) return sendIncidentError(reply, error);
        throw error;
      }
    },
  );

  // PATCH /api/admin/incidents/:id/assign — assign to admin user/team
  fastify.patch(
    '/:id/assign',
    { preHandler: requirePermission('operations.write') },
    async (request, reply) => {
      const paramsResult = IncidentIdParamsSchema.safeParse(request.params);
      const bodyResult = AssignIncidentBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid assignment request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        const incident = await assignIncidentService(paramsResult.data.id, bodyResult.data);

        await writeAuditLog({
          ...getAuditContext(request),
          action: 'incidents.assign',
          entityType: 'incident',
          entityId: incident.id,
          metadata: {
            userId: bodyResult.data.userId,
            team: bodyResult.data.team,
          },
        });

        return reply.status(200).send({ success: true, data: { incident } });
      } catch (error) {
        if (error instanceof IncidentError) return sendIncidentError(reply, error);
        throw error;
      }
    },
  );

  // PATCH /api/admin/incidents/:id/resolve — resolve incident
  fastify.patch(
    '/:id/resolve',
    { preHandler: requirePermission('operations.write') },
    async (request, reply) => {
      const paramsResult = IncidentIdParamsSchema.safeParse(request.params);
      const bodyResult = ResolveIncidentBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid resolve request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        const actorId = request.session?.userId;
        const incident = await resolveIncidentService(
          paramsResult.data.id,
          bodyResult.data,
          actorId,
        );

        await writeAuditLog({
          ...getAuditContext(request),
          action: 'incidents.resolve',
          entityType: 'incident',
          entityId: incident.id,
          metadata: { resolution: bodyResult.data.resolution },
        });

        return reply.status(200).send({ success: true, data: { incident } });
      } catch (error) {
        if (error instanceof IncidentError) return sendIncidentError(reply, error);
        throw error;
      }
    },
  );
}
