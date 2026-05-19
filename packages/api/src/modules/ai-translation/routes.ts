import type { FastifyInstance } from 'fastify';
import { requirePermission } from '../../lib/rbac.js';
import {
  GenerateTranslationBodySchema,
  WorkflowIdParamsSchema,
  ListTranslationWorkflowsQuerySchema,
} from './validators.js';
import {
  generateTranslation,
  listTranslationWorkflows,
  approveTranslationWorkflow,
  rejectTranslationWorkflow,
} from './service.js';

export async function aiTranslationRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /generate
  fastify.post(
    '/generate',
    { preHandler: requirePermission('content.write') },
    async (request, reply) => {
      const parseResult = GenerateTranslationBodySchema.safeParse(request.body);
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
        const result = await generateTranslation(parseResult.data);
        return reply.status(200).send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Translation generation failed';
        return reply.status(500).send({
          success: false,
          error: { code: 'GENERATION_ERROR', message },
        });
      }
    },
  );

  // GET /workflows — list translation workflows (default: pending/draft)
  fastify.get(
    '/workflows',
    { preHandler: requirePermission('content.write') },
    async (request, reply) => {
      const queryResult = ListTranslationWorkflowsQuerySchema.safeParse(request.query);
      if (!queryResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query params' },
        });
      }

      const workflows = await listTranslationWorkflows(queryResult.data.status);
      return reply.status(200).send({ success: true, data: { workflows } });
    },
  );

  // PATCH /workflows/:id/approve
  fastify.patch(
    '/workflows/:id/approve',
    { preHandler: requirePermission('content.write') },
    async (request, reply) => {
      const paramsResult = WorkflowIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid workflow id' },
        });
      }

      const session = request.session;
      // Accept optional edited translations from the reviewer UI
      const body = (request.body ?? {}) as { editedTranslations?: Record<string, string> };
      const editedTranslations =
        body['editedTranslations'] && typeof body['editedTranslations'] === 'object'
          ? (body['editedTranslations'] as Record<string, string>)
          : undefined;

      try {
        const workflow = await approveTranslationWorkflow(
          paramsResult.data.id,
          session?.userId ?? undefined,
          editedTranslations,
        );
        return reply.status(200).send({ success: true, data: { workflow } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Approve failed';
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message },
        });
      }
    },
  );

  // PATCH /workflows/:id/reject
  fastify.patch(
    '/workflows/:id/reject',
    { preHandler: requirePermission('content.write') },
    async (request, reply) => {
      const paramsResult = WorkflowIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid workflow id' },
        });
      }

      const session = request.session;
      try {
        const workflow = await rejectTranslationWorkflow(
          paramsResult.data.id,
          session?.userId ?? undefined,
        );
        return reply.status(200).send({ success: true, data: { workflow } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Reject failed';
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message },
        });
      }
    },
  );
}
