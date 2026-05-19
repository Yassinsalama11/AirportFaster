import type { FastifyInstance, FastifyReply } from 'fastify';
import { writeAuditLog } from '../../lib/audit.js';
import { requirePermission } from '../../lib/rbac.js';
import {
  CreateBookingBodySchema,
  PatchBookingStatusBodySchema,
  AddNoteBodySchema,
  ListBookingsQuerySchema,
  BookingIdParamsSchema,
  ManageTokenQuerySchema,
  AssignSupplierBodySchema,
  ListCustomersQuerySchema,
  CustomerIdParamsSchema,
  PublicCancelBookingBodySchema,
} from './validators.js';
import {
  BookingError,
  createBookingService,
  getBookingByManageTokenService,
  getBookingByIdService,
  patchBookingStatusService,
  addNoteService,
  assignSupplierService,
  publicCancelBookingService,
  lookupBookingByReferenceService,
  publicEditBookingService,
  publicSubmitComplaintService,
} from './service.js';
import { listBookings, listCustomers, getCustomerById } from './repository.js';

function sendBookingError(reply: FastifyReply, error: BookingError) {
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

// ── Public routes ─────────────────────────────────────────────────────────────

export async function bookingPublicRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/public/bookings — Create booking
  fastify.post('/', async (request, reply) => {
    const parseResult = CreateBookingBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid booking request',
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const result = await createBookingService(parseResult.data);
      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof BookingError) {
        return sendBookingError(reply, error);
      }
      throw error;
    }
  });

  // GET /api/public/bookings/manage?token=<token>
  fastify.get('/manage', async (request, reply) => {
    const parseResult = ManageTokenQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing or invalid token',
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const booking = await getBookingByManageTokenService(parseResult.data.token);
      return reply.status(200).send({
        success: true,
        data: { booking },
      });
    } catch (error) {
      if (error instanceof BookingError) {
        return sendBookingError(reply, error);
      }
      throw error;
    }
  });

  // POST /api/public/bookings/manage/cancel
  fastify.post('/manage/cancel', async (request, reply) => {
    const parseResult = PublicCancelBookingBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid cancel request',
          details: parseResult.error.flatten(),
        },
      });
    }

    try {
      const result = await publicCancelBookingService(parseResult.data);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      if (error instanceof BookingError) {
        return sendBookingError(reply, error);
      }
      throw error;
    }
  });

  // POST /api/public/bookings/lookup — find a booking by reference + email,
  // returns a fresh manage token the UI uses for follow-up calls.
  fastify.post('/lookup', async (request, reply) => {
    const { z } = await import('zod');
    const schema = z.object({
      reference: z.string().trim().min(3).max(40),
      email: z.string().trim().email(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid lookup request', details: parsed.error.flatten() },
      });
    }
    try {
      const result = await lookupBookingByReferenceService(parsed.data.reference, parsed.data.email);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      if (error instanceof BookingError) {
        return sendBookingError(reply, error);
      }
      throw error;
    }
  });

  // POST /api/public/bookings/manage/edit
  fastify.post('/manage/edit', async (request, reply) => {
    const { z } = await import('zod');
    const schema = z.object({
      token: z.string().min(10),
      bookingId: z.string().uuid(),
      serviceDateTime: z.string().datetime().optional(),
      passengers: z
        .array(
          z.object({
            id: z.string().uuid(),
            fullName: z.string().trim().min(2).max(200),
          }),
        )
        .optional(),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid edit request', details: parsed.error.flatten() },
      });
    }
    try {
      const result = await publicEditBookingService(parsed.data);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      if (error instanceof BookingError) {
        return sendBookingError(reply, error);
      }
      throw error;
    }
  });

  // POST /api/public/bookings/manage/complaint
  fastify.post('/manage/complaint', async (request, reply) => {
    const { z } = await import('zod');
    const schema = z.object({
      token: z.string().min(10),
      bookingId: z.string().uuid(),
      category: z.enum([
        'service_complaint',
        'supplier_no_show',
        'wrong_terminal',
        'communication_failure',
        'other',
      ]),
      message: z.string().trim().min(10).max(5000),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid complaint request', details: parsed.error.flatten() },
      });
    }
    try {
      const result = await publicSubmitComplaintService(parsed.data);
      return reply.status(200).send({ success: true, data: result });
    } catch (error) {
      if (error instanceof BookingError) {
        return sendBookingError(reply, error);
      }
      throw error;
    }
  });
}

// ── Admin routes ──────────────────────────────────────────────────────────────

export async function bookingAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/bookings — List
  fastify.get(
    '/',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const parseResult = ListBookingsQuerySchema.safeParse(request.query);
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

      const result = await listBookings(parseResult.data);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    },
  );

  // GET /api/admin/bookings/:id — Full detail
  fastify.get(
    '/:id',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const paramsResult = BookingIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid booking id',
            details: paramsResult.error.flatten(),
          },
        });
      }

      try {
        const booking = await getBookingByIdService(paramsResult.data.id);
        return reply.status(200).send({
          success: true,
          data: { booking },
        });
      } catch (error) {
        if (error instanceof BookingError) {
          return sendBookingError(reply, error);
        }
        throw error;
      }
    },
  );

  // PATCH /api/admin/bookings/:id/status — Manual status change
  fastify.patch(
    '/:id/status',
    { preHandler: requirePermission('bookings.write') },
    async (request, reply) => {
      const paramsResult = BookingIdParamsSchema.safeParse(request.params);
      const bodyResult = PatchBookingStatusBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status update request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        const actorId = request.session?.userId;
        const booking = await patchBookingStatusService(
          paramsResult.data.id,
          bodyResult.data,
          actorId,
        );

        await writeAuditLog({
          ...getRequestAuditContext(request),
          action: 'bookings.status.update',
          entityType: 'booking',
          entityId: booking.id,
          metadata: {
            newStatus: bodyResult.data.status,
            reason: bodyResult.data.reason,
          },
        });

        return reply.status(200).send({
          success: true,
          data: { booking },
        });
      } catch (error) {
        if (error instanceof BookingError) {
          return sendBookingError(reply, error);
        }
        throw error;
      }
    },
  );

  // POST /api/admin/bookings/:id/assign-supplier — Manual supplier assignment
  fastify.post(
    '/:id/assign-supplier',
    { preHandler: requirePermission('bookings.write') },
    async (request, reply) => {
      const paramsResult = BookingIdParamsSchema.safeParse(request.params);
      const bodyResult = AssignSupplierBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid assign supplier request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        const actorId = request.session?.userId;
        const booking = await assignSupplierService(
          paramsResult.data.id,
          bodyResult.data.supplierId,
          actorId,
        );

        await writeAuditLog({
          ...getRequestAuditContext(request),
          action: 'bookings.supplier.assign',
          entityType: 'booking',
          entityId: booking.id,
          metadata: { supplierId: bodyResult.data.supplierId },
        });

        return reply.status(200).send({
          success: true,
          data: { booking },
        });
      } catch (error) {
        if (error instanceof BookingError) {
          return sendBookingError(reply, error);
        }
        throw error;
      }
    },
  );

  // POST /api/admin/bookings/:id/notes — Add note
  fastify.post(
    '/:id/notes',
    { preHandler: requirePermission('bookings.write') },
    async (request, reply) => {
      const paramsResult = BookingIdParamsSchema.safeParse(request.params);
      const bodyResult = AddNoteBodySchema.safeParse(request.body);

      if (!paramsResult.success || !bodyResult.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid note request',
            details: {
              params: paramsResult.success ? undefined : paramsResult.error.flatten(),
              body: bodyResult.success ? undefined : bodyResult.error.flatten(),
            },
          },
        });
      }

      try {
        const authorUserId = request.session?.userId;
        const note = await addNoteService(
          paramsResult.data.id,
          bodyResult.data,
          authorUserId,
        );

        await writeAuditLog({
          ...getRequestAuditContext(request),
          action: 'bookings.note.add',
          entityType: 'booking',
          entityId: paramsResult.data.id,
          metadata: { visibility: bodyResult.data.visibility },
        });

        return reply.status(201).send({
          success: true,
          data: { note },
        });
      } catch (error) {
        if (error instanceof BookingError) {
          return sendBookingError(reply, error);
        }
        throw error;
      }
    },
  );
}

// ── Admin Customer routes ─────────────────────────────────────────────────────

export async function customerAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/customers — List customers
  fastify.get(
    '/',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const parseResult = ListCustomersQuerySchema.safeParse(request.query);
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
      const result = await listCustomers(parseResult.data);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // GET /api/admin/customers/:id — Customer detail
  fastify.get(
    '/:id',
    { preHandler: requirePermission('bookings.read') },
    async (request, reply) => {
      const paramsResult = CustomerIdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid customer id' },
        });
      }
      const customer = await getCustomerById(paramsResult.data.id);
      if (!customer) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' },
        });
      }
      return reply.status(200).send({ success: true, data: { customer } });
    },
  );
}
