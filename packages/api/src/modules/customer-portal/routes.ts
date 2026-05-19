import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';
import { prisma } from '@airportfaster/db';

// ── Cookie / session helpers ──────────────────────────────────────────────────

const CUSTOMER_COOKIE = 'airportfaster_customer_session';
const SESSION_TTL_SECONDS = 604800; // 7 days
const SESSION_SECRET =
  process.env['SESSION_SECRET'] ?? 'change-me-to-a-32-char-random-string';

interface CustomerSessionPayload {
  customerId: string;
  email: string;
  exp: number;
}

function signCustomerToken(payload: CustomerSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyCustomerToken(token: string): CustomerSessionPayload | null {
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
    typeof (payload as Record<string, unknown>)['customerId'] !== 'string' ||
    typeof (payload as Record<string, unknown>)['email'] !== 'string' ||
    typeof (payload as Record<string, unknown>)['exp'] !== 'number'
  ) {
    return null;
  }
  const p = payload as CustomerSessionPayload;
  if (p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}

/**
 * Middleware: require a valid customer session cookie.
 * Attaches customerSession to request.
 */
async function requireCustomerAuth(
  request: FastifyRequest & { customerSession?: CustomerSessionPayload },
  reply: FastifyReply,
): Promise<void> {
  const token = request.cookies[CUSTOMER_COOKIE];
  if (!token) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Customer authentication required' },
    });
  }
  const session = verifyCustomerToken(token);
  if (!session) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired customer session' },
    });
  }
  request.customerSession = session;
}

// ── Validators ────────────────────────────────────────────────────────────────

const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const UpdateProfileBodySchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
});

// ── Customer portal routes ────────────────────────────────────────────────────

export async function customerPortalRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/public/customers/register
   * body: { email, password, firstName, lastName, phone? }
   * STUB: proper customer session table in post-MVP
   */
  fastify.post('/register', async (request, reply) => {
    const parseResult = RegisterBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration request',
          details: parseResult.error.flatten(),
        },
      });
    }

    const { email, password, firstName, lastName, phone } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if customer with email exists
    const existing = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    // 2. If exists and has passwordHash: return 409
    if (existing && existing.passwordHash) {
      return reply.status(409).send({
        success: false,
        error: { code: 'ALREADY_REGISTERED', message: 'An account with this email already exists' },
      });
    }

    // 3. Hash password with argon2
    const passwordHash = await hash(password, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 4. Upsert customer: set passwordHash, firstName, lastName, phone
    const customer = await prisma.customer.upsert({
      where: { email: normalizedEmail },
      update: {
        passwordHash,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        phone: phone ?? undefined,
      },
      create: {
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        phone: phone ?? null,
      },
    });

    // 5. Create signed session token
    // STUB: proper customer session table in post-MVP
    const sessionPayload: CustomerSessionPayload = {
      customerId: customer.id,
      email: customer.email,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const token = signCustomerToken(sessionPayload);

    // 6. Set httpOnly cookie
    reply.setCookie(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });

    // 7. Return customer info
    return reply.status(201).send({
      success: true,
      data: {
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      },
    });
  });

  /**
   * POST /api/public/customers/login
   * body: { email, password }
   */
  fastify.post('/login', async (request, reply) => {
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

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!customer || !customer.passwordHash) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const passwordValid = await verify(customer.passwordHash, password);
    if (!passwordValid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const sessionPayload: CustomerSessionPayload = {
      customerId: customer.id,
      email: customer.email,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const token = signCustomerToken(sessionPayload);

    reply.setCookie(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });

    return reply.status(200).send({
      success: true,
      data: {
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      },
    });
  });

  /**
   * POST /api/public/customers/logout
   */
  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie(CUSTOMER_COOKIE, { path: '/' });
    return reply.status(200).send({ success: true, data: { message: 'Logged out successfully' } });
  });

  /**
   * GET /api/public/customers/me
   * Returns customer profile.
   */
  fastify.get('/me', { preHandler: requireCustomerAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { customerSession?: CustomerSessionPayload })
      .customerSession!;

    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        fullName: true,
        phone: true,
        locale: true,
        isVip: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
    });

    if (!customer) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
    }

    return reply.status(200).send({ success: true, data: { customer } });
  });

  /**
   * GET /api/public/customers/me/bookings
   * Returns all bookings for the authenticated customer.
   */
  fastify.get('/me/bookings', { preHandler: requireCustomerAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { customerSession?: CustomerSessionPayload })
      .customerSession!;

    const bookings = await prisma.booking.findMany({
      where: { customerId: session.customerId },
      include: {
        airportService: {
          include: {
            airport: { include: { translations: { where: { locale: 'en' } } } },
            service: { include: { translations: { where: { locale: 'en' } } } },
          },
        },
        priceSnapshot: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.status(200).send({ success: true, data: { bookings } });
  });

  /**
   * PATCH /api/public/customers/me
   * Update customer profile.
   */
  fastify.patch('/me', { preHandler: requireCustomerAuth as never }, async (request, reply) => {
    const session = (request as FastifyRequest & { customerSession?: CustomerSessionPayload })
      .customerSession!;

    const parseResult = UpdateProfileBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile update',
          details: parseResult.error.flatten(),
        },
      });
    }

    const { firstName, lastName, phone, locale } = parseResult.data;

    // Build fullName if name fields changed
    let fullNameUpdate: string | undefined;
    if (firstName || lastName) {
      // Need to get current values to build combined name
      const current = await prisma.customer.findUnique({
        where: { id: session.customerId },
        select: { firstName: true, lastName: true },
      });
      const newFirst = firstName ?? current?.firstName ?? '';
      const newLast = lastName ?? current?.lastName ?? '';
      fullNameUpdate = `${newFirst} ${newLast}`.trim();
    }

    const customer = await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(fullNameUpdate !== undefined && { fullName: fullNameUpdate }),
        ...(phone !== undefined && { phone }),
        ...(locale !== undefined && { locale }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        fullName: true,
        phone: true,
        locale: true,
      },
    });

    return reply.status(200).send({ success: true, data: { customer } });
  });
}
