import type { FastifyInstance } from 'fastify';
import { requirePermission } from '../../lib/rbac.js';
import {
  GenerateAirportDescriptionBodySchema,
  GenerateMetaBodySchema,
  GenerateFaqBodySchema,
  WorkflowIdParamsSchema,
} from './validators.js';
import {
  generateAirportDescription,
  generateMeta,
  generateFaq,
  listAiWorkflows,
  approveWorkflow,
  rejectWorkflow,
} from './service.js';

export async function aiSeoRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /generate/airport-description
  fastify.post(
    '/generate/airport-description',
    { preHandler: requirePermission('content.write') },
    async (request, reply) => {
      const parseResult = GenerateAirportDescriptionBodySchema.safeParse(request.body);
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
        const result = await generateAirportDescription(parseResult.data);
        return reply.status(200).send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed';
        return reply.status(500).send({
          success: false,
          error: { code: 'GENERATION_ERROR', message },
        });
      }
    },
  );

  // POST /generate/meta
  fastify.post(
    '/generate/meta',
    { preHandler: requirePermission('content.write') },
    async (request, reply) => {
      const parseResult = GenerateMetaBodySchema.safeParse(request.body);
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
        const result = await generateMeta(parseResult.data);
        return reply.status(200).send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed';
        return reply.status(500).send({
          success: false,
          error: { code: 'GENERATION_ERROR', message },
        });
      }
    },
  );

  // POST /generate/faq
  fastify.post(
    '/generate/faq',
    { preHandler: requirePermission('content.write') },
    async (request, reply) => {
      const parseResult = GenerateFaqBodySchema.safeParse(request.body);
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
        const result = await generateFaq(parseResult.data);
        return reply.status(200).send({ success: true, data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed';
        return reply.status(500).send({
          success: false,
          error: { code: 'GENERATION_ERROR', message },
        });
      }
    },
  );

  // GET /workflows — list pending AI drafts
  fastify.get(
    '/workflows',
    { preHandler: requirePermission('content.write') },
    async (_request, reply) => {
      const workflows = await listAiWorkflows();
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
      try {
        const workflow = await approveWorkflow(
          paramsResult.data.id,
          session?.userId ?? undefined,
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
        const workflow = await rejectWorkflow(
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
