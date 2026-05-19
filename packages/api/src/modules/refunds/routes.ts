import type { FastifyInstance, FastifyReply } from 'fastify';
import { writeAuditLog } from '../../lib/audit.js';
import { requirePermission } from '../../lib/rbac.js';
import {
  ListRefundsQuerySchema,
  RefundIdParamsSchema,
  InitiateAdminRefundBodySchema,
} from './validators.js';
import {
  RefundError,
  listRefundsService,
  getRefundByIdService,
  initiateAdminRefundService,
  cancelRefundService,
} from './service.js';

function sendRefundError(reply: FastifyReply, error: RefundError) {
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

export async function refundAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/refunds — list with filters
  fastify.get(
    '/',
    { preHandler: requirePermission('payments.read') },
    async (request, reply) => {
      const parseResult = ListRefundsQuerySchema.safeParse(request.query);
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

      const result = await listRefundsService(parseResult.data);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // GET /api/admin/refunds/:id — detail with status history
  fastify.get(
    '/:id',
    { preHandler: requirePermission('payments.read') },
    async (request, reply) => {
      const paramsResult = RefundIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid refund id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        const refund = await getRefundByIdService(paramsResult.data.id);
        return reply.status(200).send({ success: true, data: { refund } });
      } catch (error) {
        if (error instanceof RefundError) return sendRefundError(reply, error);
        throw error;
      }
    },
  );

  // POST /api/admin/refunds — initiate refund
  fastify.post(
    '/',
    { preHandler: requirePermission('payments.write') },
    async (request, reply) => {
      const bodyResult = InitiateAdminRefundBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid refund request',
            details: bodyResult.error.flatten(),
          },
        });
      }

      try {
        const actorId = request.session?.userId;
        const refund = await initiateAdminRefundService(bodyResult.data, actorId);

        await writeAuditLog({
          ...getAuditContext(request),
          action: 'refunds.initiate',
          entityType: 'refund',
          entityId: refund.id,
          metadata: {
            bookingId: bodyResult.data.bookingId,
            type: bodyResult.data.type,
            amountMinorUnits: bodyResult.data.amountMinorUnits,
            reason: bodyResult.data.reason,
          },
        });

        return reply.status(201).send({ success: true, data: { refund } });
      } catch (error) {
        if (error instanceof RefundError) return sendRefundError(reply, error);
        throw error;
      }
    },
  );

  // PATCH /api/admin/refunds/:id/cancel — cancel pending refund
  fastify.patch(
    '/:id/cancel',
    { preHandler: requirePermission('payments.write') },
    async (request, reply) => {
      const paramsResult = RefundIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid refund id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        const actorId = request.session?.userId;
        const refund = await cancelRefundService(paramsResult.data.id, actorId);

        await writeAuditLog({
          ...getAuditContext(request),
          action: 'refunds.cancel',
          entityType: 'refund',
          entityId: refund.id,
        });

        return reply.status(200).send({ success: true, data: { refund } });
      } catch (error) {
        if (error instanceof RefundError) return sendRefundError(reply, error);
        throw error;
      }
    },
  );
}
