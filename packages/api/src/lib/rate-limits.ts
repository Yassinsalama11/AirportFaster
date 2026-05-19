// Named rate limit configurations for use with @fastify/rate-limit
// Apply via route-level config: { config: { rateLimit: AUTH_RATE_LIMIT } }
// or via scoped plugin registration for broader coverage.

export const AUTH_RATE_LIMIT = { max: 10, timeWindow: '1 minute' } as const;
export const PUBLIC_BOOKING_RATE_LIMIT = { max: 20, timeWindow: '1 hour' } as const;
export const PUBLIC_PAYMENT_RATE_LIMIT = { max: 10, timeWindow: '1 hour' } as const;
export const PUBLIC_SEARCH_RATE_LIMIT = { max: 60, timeWindow: '1 minute' } as const;
export const ANALYTICS_RATE_LIMIT = { max: 100, timeWindow: '1 minute' } as const;
