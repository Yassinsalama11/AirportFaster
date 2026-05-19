import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { validateSession } from '../lib/session.js';
import type { SessionData } from '../lib/session.js';

const COOKIE_NAME = 'airportfaster_session';

// Augment Fastify request type with session
declare module 'fastify' {
  interface FastifyRequest {
    session: SessionData | null;
  }
}

/**
 * Plugin that reads the session cookie on every request and attaches
 * the validated session (user + roles + permissions) to request.session.
 */
async function sessionPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('session', null);

  fastify.addHook('preHandler', async (request) => {
    const token = request.cookies[COOKIE_NAME];
    if (!token) {
      request.session = null;
      return;
    }

    const session = await validateSession(token);
    request.session = session;
  });
}

export default fp(sessionPlugin, {
  name: 'session',
  dependencies: ['@fastify/cookie'],
});
