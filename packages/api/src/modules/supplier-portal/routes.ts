import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '@airportfaster/db';

// ── Cookie / session helpers ──────────────────────────────────────────────────

const SUPPLIER_COOKIE = 'airportfaster_supplier_session';
const SESSION_TTL_SECONDS = 28800; // 8 hours
const SESSION_SECRET =
  process.env['SESSION_SECRET'] ?? 'change-me-to-a-32-char-random-string';

interface SupplierSessionPayload {
  supplierId: string;
  email: string;
  exp: number;
}

function signSupplierToken(payload: SupplierSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySupplierToken(token: string): SupplierSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts as [string, string];
  const expectedSig = createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  const received = Buffer.from(sig, 'base64url');
  const expected = Buffer.from(expectedSig, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as Record<string, unknown>)['supplierId'] !== 'string' ||
    typeof (payload as Record<string, unknown>)['email'] !== 'string' ||
    typeof (payload as Record<string, unknown>)['exp'] !== 'number'
  ) {
    return null;
  }
  const p = payload as SupplierSessionPayload;
  if (p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}

/**
 * Middleware: require a valid supplier session cookie.
 * Attaches supplierSession to request.
 */
async function requireSupplierAuth(
  request: FastifyRequest & { supplierSession?: SupplierSessionPayload },
  reply: FastifyReply,
): Promise<void> {
  const token = request.cookies[SUPPLIER_COOKIE];
  if (!token) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Supplier authentication required' },
    });
  }
  const session = verifySupplierToken(token);
  if (!session) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired supplier session' },
    });
  }
  request.supplierSession = session;
}

// ── Validators ────────────────────────────────────────────────────────────────

const LoginBodySchema = z.object({
  email: z.string().email(),
  pin: z.string().min(1),
});

const BookingIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ── Route handler helpers ─────────────────────────────────────────────────────

/**
 * Extract PIN from supplier notes JSON.
 * MVP convention: notes field may contain JSON like { "portalPin": "XXXX" }
 * STUB: replace with proper supplier auth (dedicated PIN hash column) in post-MVP
 */
function getPortalPinFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    return typeof parsed['portalPin'] === 'string' ? parsed['portalPin'] : null;
  } catch {
    return null;
  }
}

// ── Supplier portal routes ────────────────────────────────────────────────────

export async function supplierPortalRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/supplier/auth/login
   * body: { email: string, pin: string }
   * Looks up SupplierContact by email, verifies PIN against supplier notes JSON.
   * STUB: replace with proper supplier auth in post-MVP
   */
  fastify.post('/auth/login', async (request, reply) => {
    const parseResult = LoginBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login request',
          details: parseResult.error.flatten(),
        },
      });
    }

    const { email, pin } = parseResult.data;

    // Look up supplier contact by email
    const contact = await prisma.supplierContact.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: { supplier: true },
    });

    if (!contact || !contact.supplier) {
      // Deliberate vague message to avoid user enumeration
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or PIN' },
      });
    }

    // Verify PIN from supplier notes JSON
    // STUB: replace with proper PIN hash in dedicated DB column in post-MVP
    const expectedPin = getPortalPinFromNotes(contact.supplier.notes);

    if (!expectedPin) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'PORTAL_NOT_CONFIGURED',
          message: 'Supplier portal is not configured for this account',
        },
      });
    }

    // Constant-time comparison to prevent timing attacks
    const pinBuffer = Buffer.from(pin);
    const expectedBuffer = Buffer.from(expectedPin);
    const pinValid =
      pinBuffer.length === expectedBuffer.length &&
      timingSafeEqual(pinBuffer, expectedBuffer);

    if (!pinValid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or PIN' },
      });
    }

    // Create signed session token
    const sessionPayload: SupplierSessionPayload = {
      supplierId: contact.supplier.id,
      email: contact.email ?? email,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const token = signSupplierToken(sessionPayload);

    reply.setCookie(SUPPLIER_COOKIE, token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });

    return reply.status(200).send({
      success: true,
      data: {
        supplierId: contact.supplier.id,
        supplierName: contact.supplier.name,
        contactName: contact.name,
      },
    });
  });

  /**
   * POST /api/supplier/auth/logout
   */
  fastify.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(SUPPLIER_COOKIE, { path: '/' });
    return reply.status(200).send({ success: true, data: { message: 'Logged out' } });
  });

  /**
   * GET /api/supplier/auth/me
   * Returns current supplier info from session cookie.
   */
  fastify.get('/auth/me', { preHandler: requireSupplierAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { supplierSession?: SupplierSessionPayload })
      .supplierSession!;

    const supplier = await prisma.supplier.findUnique({
      where: { id: session.supplierId },
      select: { id: true, name: true, status: true, rating: true },
    });

    if (!supplier) {
      return reply.status(404).send({
        success: false,
        error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: { supplier, email: session.email },
    });
  });

  /**
   * GET /api/supplier/bookings
   * Returns bookings assigned to the authenticated supplier.
   */
  fastify.get('/bookings', { preHandler: requireSupplierAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { supplierSession?: SupplierSessionPayload })
      .supplierSession!;

    const query = request.query as Record<string, string | undefined>;
    const filter = query['filter'] ?? 'upcoming'; // 'today' | 'upcoming' | 'past'

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    let dateFilter: { gte?: Date; lt?: Date; lte?: Date } = {};
    if (filter === 'today') {
      dateFilter = { gte: startOfToday, lt: endOfToday };
    } else if (filter === 'upcoming') {
      dateFilter = { gte: now };
    } else if (filter === 'past') {
      dateFilter = { lte: now };
    }

    const assignments = await prisma.bookingSupplierAssignment.findMany({
      where: {
        supplierId: session.supplierId,
        ...(Object.keys(dateFilter).length > 0
          ? { booking: { serviceDateTime: dateFilter } }
          : {}),
      },
      include: {
        booking: {
          include: {
            customer: { select: { fullName: true, firstName: true, lastName: true, phone: true } },
            airportService: {
              include: {
                airport: { include: { translations: { where: { locale: 'en' } } } },
                service: { include: { translations: { where: { locale: 'en' } } } },
              },
            },
            passengers: true,
          },
        },
      },
      orderBy: { offeredAt: 'desc' },
    });

    const items = assignments.map((a) => ({
      assignmentId: a.id,
      assignmentStatus: a.status,
      offeredAt: a.offeredAt,
      booking: a.booking,
    }));

    return reply.status(200).send({ success: true, data: { items } });
  });

  /**
   * GET /api/supplier/bookings/:id
   * Returns full booking detail for a booking assigned to this supplier.
   */
  fastify.get('/bookings/:id', { preHandler: requireSupplierAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { supplierSession?: SupplierSessionPayload })
      .supplierSession!;

    const paramsResult = BookingIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid booking id' },
      });
    }

    // Verify this booking is assigned to this supplier
    const assignment = await prisma.bookingSupplierAssignment.findFirst({
      where: {
        bookingId: paramsResult.data.id,
        supplierId: session.supplierId,
      },
    });

    if (!assignment) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found or not assigned to you' },
      });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: paramsResult.data.id },
      include: {
        customer: {
          select: {
            fullName: true,
            firstName: true,
            lastName: true,
            phone: true,
            // email intentionally omitted for privacy
          },
        },
        airportService: {
          include: {
            airport: { include: { translations: { where: { locale: 'en' } } } },
            service: { include: { translations: { where: { locale: 'en' } } } },
          },
        },
        passengers: true,
        flights: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    return reply.status(200).send({ success: true, data: { booking, assignment } });
  });

  /**
   * PATCH /api/supplier/bookings/:id/confirm
   * Supplier confirms they can fulfil the booking.
   * Transitions: supplier_assigned | pending_supplier_confirmation → confirmed
   */
  fastify.patch('/bookings/:id/confirm', { preHandler: requireSupplierAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { supplierSession?: SupplierSessionPayload })
      .supplierSession!;

    const paramsResult = BookingIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid booking id' },
      });
    }

    const assignment = await prisma.bookingSupplierAssignment.findFirst({
      where: { bookingId: paramsResult.data.id, supplierId: session.supplierId },
      include: { booking: true },
    });

    if (!assignment) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found or not assigned to you' },
      });
    }

    const validStatuses = ['supplier_assigned', 'pending_supplier_confirmation'] as const;
    const currentStatus = assignment.booking.status;
    if (!validStatuses.includes(currentStatus as (typeof validStatuses)[number])) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot confirm booking in status: ${currentStatus}`,
        },
      });
    }

    // Update booking status and assignment status in a transaction
    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: paramsResult.data.id },
        data: { status: 'confirmed' },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId: paramsResult.data.id,
          fromStatus: currentStatus,
          toStatus: 'confirmed',
          actorType: 'supplier',
          actorId: session.supplierId,
          reason: 'Supplier confirmed booking',
        },
      }),
      prisma.bookingSupplierAssignment.update({
        where: { id: assignment.id },
        data: { status: 'accepted', respondedAt: new Date() },
      }),
    ]);

    return reply.status(200).send({ success: true, data: { booking: updatedBooking } });
  });

  /**
   * PATCH /api/supplier/bookings/:id/start
   * Supplier marks booking as in progress.
   * Transitions: confirmed → in_progress
   */
  fastify.patch('/bookings/:id/start', { preHandler: requireSupplierAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { supplierSession?: SupplierSessionPayload })
      .supplierSession!;

    const paramsResult = BookingIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid booking id' },
      });
    }

    const assignment = await prisma.bookingSupplierAssignment.findFirst({
      where: { bookingId: paramsResult.data.id, supplierId: session.supplierId },
      include: { booking: true },
    });

    if (!assignment) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found or not assigned to you' },
      });
    }

    if (assignment.booking.status !== 'confirmed') {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot start booking in status: ${assignment.booking.status}`,
        },
      });
    }

    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: paramsResult.data.id },
        data: { status: 'in_progress' },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId: paramsResult.data.id,
          fromStatus: 'confirmed',
          toStatus: 'in_progress',
          actorType: 'supplier',
          actorId: session.supplierId,
          reason: 'Supplier started service',
        },
      }),
    ]);

    return reply.status(200).send({ success: true, data: { booking: updatedBooking } });
  });

  /**
   * PATCH /api/supplier/bookings/:id/complete
   * Supplier marks booking as completed.
   * Transitions: in_progress → completed
   */
  fastify.patch('/bookings/:id/complete', { preHandler: requireSupplierAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { supplierSession?: SupplierSessionPayload })
      .supplierSession!;

    const paramsResult = BookingIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid booking id' },
      });
    }

    const assignment = await prisma.bookingSupplierAssignment.findFirst({
      where: { bookingId: paramsResult.data.id, supplierId: session.supplierId },
      include: { booking: true },
    });

    if (!assignment) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found or not assigned to you' },
      });
    }

    if (assignment.booking.status !== 'in_progress') {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot complete booking in status: ${assignment.booking.status}`,
        },
      });
    }

    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: paramsResult.data.id },
        data: { status: 'completed' },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId: paramsResult.data.id,
          fromStatus: 'in_progress',
          toStatus: 'completed',
          actorType: 'supplier',
          actorId: session.supplierId,
          reason: 'Supplier marked service completed',
        },
      }),
    ]);

    return reply.status(200).send({ success: true, data: { booking: updatedBooking } });
  });
}
