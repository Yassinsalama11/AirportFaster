import type { FastifyInstance } from 'fastify';
import {
  LoginBodySchema,
  PasswordResetConfirmBodySchema,
  PasswordResetRequestBodySchema,
} from './validators.js';
import {
  AuthError,
  confirmPasswordResetService,
  loginService,
  logoutService,
  requestPasswordResetService,
} from './service.js';
import { requireAuth } from '../../lib/rbac.js';

const COOKIE_NAME = 'airportfaster_session';
const SESSION_TTL = parseInt(process.env['SESSION_TTL_SECONDS'] ?? '28800', 10);

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/admin/auth/login
   */
  fastify.post('/login', async (request, reply) => {
    const parseResult = LoginBodySchema.safeParse(request.body);
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

    const { email, password } = parseResult.data;

    try {
      const result = await loginService({
        email,
        password,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      // Set HttpOnly session cookie
      reply.setCookie(COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_TTL,
        expires: result.expiresAt,
      });

      return reply.status(200).send({
        success: true,
        data: {
          user: result.user,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(401).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }
      throw error;
    }
  });

  /**
   * POST /api/admin/auth/logout
   */
  fastify.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    const token = request.cookies[COOKIE_NAME];

    if (token) {
      await logoutService({
        token,
        userId: request.session?.userId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    }

    reply.clearCookie(COOKIE_NAME, { path: '/' });

    return reply.status(200).send({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });

  /**
   * POST /api/admin/auth/password-reset/request
   */
  fastify.post('/password-reset/request', async (request, reply) => {
    const parseResult = PasswordResetRequestBodySchema.safeParse(request.body);
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

    const result = await requestPasswordResetService({
      email: parseResult.data.email,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return reply.status(200).send({
      success: true,
      data: {
        message: 'If the account exists, password reset instructions have been sent.',
        resetToken: result.resetToken,
      },
    });
  });

  /**
   * POST /api/admin/auth/password-reset/confirm
   */
  fastify.post('/password-reset/confirm', async (request, reply) => {
    const parseResult = PasswordResetConfirmBodySchema.safeParse(request.body);
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
      await confirmPasswordResetService({
        token: parseResult.data.token,
        password: parseResult.data.password,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(200).send({
        success: true,
        data: { message: 'Password reset successfully.' },
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/admin/auth/me
   */
  fastify.get('/me', { preHandler: requireAuth }, async (request, reply) => {
    const session = request.session!;

    return reply.status(200).send({
      success: true,
      data: {
        user: {
          id: session.userId,
          email: session.email,
          name: session.name,
          roles: session.roles,
          permissions: session.permissions,
        },
      },
    });
  });
}
