import type { FastifyInstance, FastifyReply } from 'fastify';
import { requirePermission } from '../../lib/rbac.js';
import {
  CreateCorporateBodySchema,
  UpdateCorporateBodySchema,
  AddMemberBodySchema,
  CorporateIdParamsSchema,
  MemberIdParamsSchema,
} from './validators.js';
import {
  CorporateError,
  listCorporateService,
  getCorporateService,
  createCorporateService,
  updateCorporateService,
  addMemberService,
  removeMemberService,
  getMyCorporateService,
  getMyCorporateBookingsService,
} from './service.js';

function sendCorporateError(reply: FastifyReply, error: CorporateError) {
  return reply.status(error.statusCode).send({
    success: false,
    error: { code: error.code, message: error.message },
  });
}

// ── Admin routes (/api/admin/corporate) ──────────────────────────────────────

export async function corporateAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET / — list corporate accounts
  fastify.get('/', { preHandler: requirePermission('customers.read') }, async (_request, reply) => {
    const accounts = await listCorporateService();
    return reply.status(200).send({ success: true, data: { accounts } });
  });

  // POST / — create corporate account
  fastify.post('/', { preHandler: requirePermission('customers.write') }, async (request, reply) => {
    const parseResult = CreateCorporateBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() },
      });
    }

    try {
      const account = await createCorporateService(parseResult.data);
      return reply.status(201).send({ success: true, data: { account } });
    } catch (error) {
      if (error instanceof CorporateError) return sendCorporateError(reply, error);
      throw error;
    }
  });

  // GET /:id — detail with members and bookings
  fastify.get('/:id', { preHandler: requirePermission('customers.read') }, async (request, reply) => {
    const parseResult = CorporateIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
    }

    try {
      const account = await getCorporateService(parseResult.data.id);
      return reply.status(200).send({ success: true, data: { account } });
    } catch (error) {
      if (error instanceof CorporateError) return sendCorporateError(reply, error);
      throw error;
    }
  });

  // PATCH /:id — update
  fastify.patch('/:id', { preHandler: requirePermission('customers.write') }, async (request, reply) => {
    const paramsResult = CorporateIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
    }

    const bodyResult = UpdateCorporateBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: bodyResult.error.flatten() },
      });
    }

    try {
      const account = await updateCorporateService(paramsResult.data.id, bodyResult.data);
      return reply.status(200).send({ success: true, data: { account } });
    } catch (error) {
      if (error instanceof CorporateError) return sendCorporateError(reply, error);
      throw error;
    }
  });

  // POST /:id/members — add member
  fastify.post('/:id/members', { preHandler: requirePermission('customers.write') }, async (request, reply) => {
    const paramsResult = CorporateIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
    }

    const bodyResult = AddMemberBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: bodyResult.error.flatten() },
      });
    }

    try {
      const member = await addMemberService(paramsResult.data.id, bodyResult.data);
      return reply.status(201).send({ success: true, data: { member } });
    } catch (error) {
      if (error instanceof CorporateError) return sendCorporateError(reply, error);
      throw error;
    }
  });

  // DELETE /:id/members/:memberId — remove member
  fastify.delete('/:id/members/:memberId', { preHandler: requirePermission('customers.write') }, async (request, reply) => {
    const paramsResult = MemberIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid params' } });
    }

    try {
      await removeMemberService(paramsResult.data.id, paramsResult.data.memberId);
      return reply.status(200).send({ success: true, data: { removed: true } });
    } catch (error) {
      if (error instanceof CorporateError) return sendCorporateError(reply, error);
      throw error;
    }
  });
}

// ── Public routes (/api/public/corporate) ────────────────────────────────────

export async function corporatePublicRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/public/corporate/me
   * Returns the corporate account for the authenticated customer.
   * Authentication: X-Customer-Email header (stub — full auth requires customer session implementation).
   * TODO: Replace with proper customer session once customer auth is implemented.
   */
  fastify.get('/me', async (request, reply) => {
    const customerEmail = request.headers['x-customer-email'];
    if (!customerEmail || typeof customerEmail !== 'string') {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'X-Customer-Email header required' },
      });
    }

    try {
      const account = await getMyCorporateService(customerEmail);
      return reply.status(200).send({ success: true, data: { account } });
    } catch (error) {
      if (error instanceof CorporateError) return sendCorporateError(reply, error);
      throw error;
    }
  });

  /**
   * GET /api/public/corporate/me/bookings
   * Returns all bookings made under the customer's corporate account.
   */
  fastify.get('/me/bookings', async (request, reply) => {
    const customerEmail = request.headers['x-customer-email'];
    if (!customerEmail || typeof customerEmail !== 'string') {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'X-Customer-Email header required' },
      });
    }

    try {
      const bookings = await getMyCorporateBookingsService(customerEmail);
      return reply.status(200).send({ success: true, data: { bookings } });
    } catch (error) {
      if (error instanceof CorporateError) return sendCorporateError(reply, error);
      throw error;
    }
  });
}
