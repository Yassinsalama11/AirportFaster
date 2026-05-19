import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify preHandler factory that checks the request's session has a required permission.
 * Usage: { preHandler: requirePermission('airports.write') }
 */
export function requirePermission(permission: string) {
  return async function checkPermission(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const session = request.session;

    if (!session) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!session.permissions.includes(permission)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing required permission: ${permission}`,
        },
      });
    }
  };
}

/**
 * Fastify preHandler that requires any authenticated session (any role).
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.session) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }
}
