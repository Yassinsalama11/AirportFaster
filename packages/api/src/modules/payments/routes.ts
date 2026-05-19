import type { FastifyInstance, FastifyReply } from 'fastify';
import { writeAuditLog } from '../../lib/audit.js';
import { requirePermission } from '../../lib/rbac.js';
import {
  CreatePaymentIntentBodySchema,
  ListPaymentsQuerySchema,
  PaymentIdParamsSchema,
  InitiateRefundBodySchema,
} from './validators.js';
import {
  PaymentError,
  createPaymentIntentService,
  getPaymentByIdService,
  listPaymentsService,
  initiateRefundService,
} from './service.js';

function sendPaymentError(reply: FastifyReply, error: PaymentError) {
  return reply.status(error.statusCode).send({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}

// ── Public routes ─────────────────────────────────────────────────────────────

export async function paymentPublicRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/public/payments/create-intent
  fastify.post('/create-intent', async (request, reply) => {
    const parseResult = CreatePaymentIntentBodySchema.safeParse(request.body);
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
      const result = await createPaymentIntentService(parseResult.data);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        return sendPaymentError(reply, error);
      }
      throw error;
    }
  });
}

// ── Admin routes ──────────────────────────────────────────────────────────────

export async function paymentAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/payments — List
  fastify.get(
    '/',
    { preHandler: requirePermission('payments.read') },
    async (request, reply) => {
      const parseResult = ListPaymentsQuerySchema.safeParse(request.query);
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

      const result = await listPaymentsService(parseResult.data);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  // GET /api/admin/payments/:id — Detail with transactions
  fastify.get(
    '/:id',
    { preHandler: requirePermission('payments.read') },
    async (request, reply) => {
      const paramsResult = PaymentIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid payment id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        const payment = await getPaymentByIdService(paramsResult.data.id);
        return reply.status(200).send({
          success: true,
          data: { payment },
        });
      } catch (error) {
        if (error instanceof PaymentError) {
          return sendPaymentError(reply, error);
        }
        throw error;
      }
    },
  );

  // POST /api/admin/payments/:id/refund — Initiate refund
  fastify.post(
    '/:id/refund',
    { preHandler: requirePermission('payments.write') },
    async (request, reply) => {
      const paramsResult = PaymentIdParamsSchema.safeParse(request.params);
      const bodyResult = InitiateRefundBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid refund request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        const result = await initiateRefundService(paramsResult.data.id, bodyResult.data);

        await writeAuditLog({
          userId: (request as { session?: { userId?: string } }).session?.userId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          action: 'payments.refund.initiate',
          entityType: 'payment',
          entityId: paramsResult.data.id,
          metadata: {
            amountMinorUnits: bodyResult.data.amountMinorUnits,
            reason: bodyResult.data.reason,
            refundId: result.refundId,
          },
        });

        return reply.status(200).send({
          success: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof PaymentError) {
          return sendPaymentError(reply, error);
        }
        throw error;
      }
    },
  );
}
