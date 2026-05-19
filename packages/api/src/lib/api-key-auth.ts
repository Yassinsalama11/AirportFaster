import type { FastifyRequest, FastifyReply } from 'fastify';
import { getRedisConnection } from './queue.js';
import { findApiKeyByHash, hashApiKey, touchApiKeyLastUsed } from '../modules/api-keys/repository.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiKeyContext {
  keyId: string;
  scopes: string[];
  rateLimit: number;
}

// Augment FastifyRequest with apiKey context
declare module 'fastify' {
  interface FastifyRequest {
    apiKeyCtx?: ApiKeyContext;
  }
}

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * Fastify preHandler that authenticates requests via X-API-Key header.
 * - Hashes the key and looks it up in api_keys table
 * - Verifies status='active' and not expired
 * - Enforces per-key rate limit using Redis (incr with 60s window)
 * - Attaches key scopes to request.apiKeyCtx
 */
export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const rawKey = request.headers['x-api-key'];
  if (!rawKey || typeof rawKey !== 'string') {
    return reply.status(401).send({
      success: false,
      error: { code: 'API_KEY_REQUIRED', message: 'X-API-Key header is required' },
    });
  }

  // Hash and look up
  const keyHash = hashApiKey(rawKey);
  const apiKey = await findApiKeyByHash(keyHash);

  if (!apiKey || apiKey.status !== 'active') {
    return reply.status(401).send({
      success: false,
      error: { code: 'INVALID_API_KEY', message: 'Invalid or revoked API key' },
    });
  }

  // Check expiry
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return reply.status(401).send({
      success: false,
      error: { code: 'API_KEY_EXPIRED', message: 'API key has expired' },
    });
  }

  // Rate limit using Redis: bucket per minute
  try {
    const redis = getRedisConnection();
    const minuteBucket = Math.floor(Date.now() / 60000);
    const rateLimitKey = `api_rate:${apiKey.id}:${minuteBucket}`;
    const count = await redis.incr(rateLimitKey);
    if (count === 1) {
      await redis.expire(rateLimitKey, 60);
    }

    // Rate limit per hour = rateLimit/60 per minute (approx)
    const perMinuteLimit = Math.ceil(apiKey.rateLimit / 60);
    if (count > perMinuteLimit) {
      return reply.status(429).send({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'API rate limit exceeded' },
      });
    }
  } catch {
    // Redis unavailable — fail open (log and continue)
    const { logger } = await import('./logger.js');
    logger.warn({ keyId: apiKey.id }, 'Redis unavailable for API rate limiting');
  }

  // Update lastUsedAt (fire-and-forget)
  void touchApiKeyLastUsed(apiKey.id);

  // Attach context to request
  request.apiKeyCtx = {
    keyId: apiKey.id,
    scopes: apiKey.scopes,
    rateLimit: apiKey.rateLimit,
  };
}

/**
 * Fastify preHandler factory that checks the request has the required API scope.
 * Must be used after requireApiKey.
 */
export function requireApiScope(scope: string) {
  return async function checkScope(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!request.apiKeyCtx) {
      return reply.status(401).send({
        success: false,
        error: { code: 'API_KEY_REQUIRED', message: 'API key authentication required' },
      });
    }

    if (!request.apiKeyCtx.scopes.includes(scope)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPE',
          message: `API key is missing required scope: ${scope}`,
        },
      });
    }
  };
}
