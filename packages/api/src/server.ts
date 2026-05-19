import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { initSentry } from './lib/sentry.js';
import { logger } from './lib/logger.js';
import { LOCAL_UPLOAD_DIR } from './lib/storage.js';
import sessionPlugin from './plugins/session.js';
import { authRoutes } from './modules/auth/routes.js';
import { airportRoutes } from './modules/airports/routes.js';
import { uploadRoutes } from './modules/uploads/routes.js';
import { adminServicesRoutes } from './modules/services/routes.js';
import { publicRoutes } from './modules/public/routes.js';
import { pricingAdminRoutes, pricingPublicRoutes } from './modules/pricing/routes.js';
import { availabilityAdminRoutes, availabilityPublicRoutes } from './modules/availability/routes.js';
import { supplierRoutes } from './modules/suppliers/routes.js';
import { searchRoutes } from './modules/search/routes.js';
import { bookingPublicRoutes, bookingAdminRoutes, customerAdminRoutes } from './modules/bookings/routes.js';
import { paymentPublicRoutes, paymentAdminRoutes } from './modules/payments/routes.js';
import { stripeWebhookRoutes } from './modules/webhooks/stripe.js';
import { aiSeoRoutes } from './modules/ai-seo/routes.js';
import { aiTranslationRoutes } from './modules/ai-translation/routes.js';
import { flightPublicRoutes, flightAdminRoutes } from './modules/flight-data/routes.js';
import { refundAdminRoutes } from './modules/refunds/routes.js';
import { incidentAdminRoutes } from './modules/incidents/routes.js';
import { dashboardAdminRoutes } from './modules/dashboard/routes.js';
import { analyticsPublicRoutes, analyticsAdminRoutes } from './modules/analytics/routes.js';
import { internalLinkRoutes } from './modules/internal-links/routes.js';
import { loungePublicRoutes, loungeAdminRoutes } from './modules/lounge-inventory/routes.js';
import { taxAdminRoutes } from './modules/tax/routes.js';
import { supplierPortalRoutes } from './modules/supplier-portal/routes.js';
import { customerPortalRoutes } from './modules/customer-portal/routes.js';
import { corporateAdminRoutes, corporatePublicRoutes } from './modules/corporate/routes.js';
import { apiKeyAdminRoutes, apiV1Routes } from './modules/api-keys/routes.js';
import { settingsAdminRoutes } from './modules/settings/routes.js';

// Initialize Sentry before anything else
initSentry();

const PORT = parseInt(process.env['API_PORT'] ?? '3001', 10);
const HOST = process.env['API_HOST'] ?? '0.0.0.0';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
    trustProxy: true,
  });

  // ── Security headers ──────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // CSP handled by Next.js frontend
    // Frontend (localhost:3000) needs to embed images served from this origin (localhost:3001).
    // Default 'same-origin' blocks cross-origin <img>/CSS-background loads.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // ── CORS ─────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env['NEXT_PUBLIC_API_URL']
      ? [process.env['NEXT_PUBLIC_API_URL'], 'http://localhost:3000']
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Cookies ───────────────────────────────────────────────────────────────
  await app.register(cookie, {
    secret: process.env['SESSION_SECRET'] ?? 'change-me-to-a-32-char-random-string',
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    }),
  });

  // ── Multipart (file uploads) ──────────────────────────────────────────────
  await app.register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // ── Static file serving for local uploads ─────────────────────────────────
  // Ensure the upload dir exists before registering the static plugin
  const { mkdirSync: mkdirSyncForStatic, existsSync: existsSyncForStatic } = await import('fs');
  if (!existsSyncForStatic(LOCAL_UPLOAD_DIR)) {
    mkdirSyncForStatic(LOCAL_UPLOAD_DIR, { recursive: true });
  }
  await app.register(fastifyStatic, {
    root: LOCAL_UPLOAD_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // ── Session plugin ────────────────────────────────────────────────────────
  await app.register(sessionPlugin);

  // ── Auth routes with tighter rate limit ──────────────────────────────────
  await app.register(
    async (authApp) => {
      await authApp.register(rateLimit, {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (request) => `login:${request.ip}`,
        errorResponseBuilder: () => ({
          statusCode: 429,
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again in 1 minute.',
          },
        }),
      });
      await authApp.register(authRoutes);
    },
    { prefix: '/api/admin/auth' },
  );

  // ── Airport administration routes ────────────────────────────────────────
  await app.register(airportRoutes, { prefix: '/api/admin/airports' });

  // ── Upload routes ─────────────────────────────────────────────────────────
  await app.register(uploadRoutes, { prefix: '/api/admin/uploads' });

  // ── Admin services routes ─────────────────────────────────────────────────
  await app.register(adminServicesRoutes, { prefix: '/api/admin/services' });

  // ── Pricing admin routes ──────────────────────────────────────────────────
  await app.register(pricingAdminRoutes, { prefix: '/api/admin/pricing' });

  // ── Availability admin routes ─────────────────────────────────────────────
  await app.register(availabilityAdminRoutes, { prefix: '/api/admin/availability' });

  // ── Supplier admin routes ─────────────────────────────────────────────────
  await app.register(supplierRoutes, { prefix: '/api/admin/suppliers' });

  // ── Booking admin routes ──────────────────────────────────────────────────
  await app.register(bookingAdminRoutes, { prefix: '/api/admin/bookings' });

  // ── Payment admin routes ──────────────────────────────────────────────────
  await app.register(paymentAdminRoutes, { prefix: '/api/admin/payments' });

  // ── Customer admin routes ─────────────────────────────────────────────────
  await app.register(customerAdminRoutes, { prefix: '/api/admin/customers' });

  // ── AI SEO admin routes ───────────────────────────────────────────────────
  await app.register(aiSeoRoutes, { prefix: '/api/admin/ai-seo' });

  // ── AI Translation admin routes ───────────────────────────────────────────
  await app.register(aiTranslationRoutes, { prefix: '/api/admin/ai-translation' });

  // ── Flight data admin routes ──────────────────────────────────────────────
  await app.register(flightAdminRoutes, { prefix: '/api/admin/flights' });

  // ── Refunds admin routes ──────────────────────────────────────────────────
  await app.register(refundAdminRoutes, { prefix: '/api/admin/refunds' });

  // ── Incidents admin routes ────────────────────────────────────────────────
  await app.register(incidentAdminRoutes, { prefix: '/api/admin/incidents' });

  // ── Dashboard admin routes ────────────────────────────────────────────────
  await app.register(dashboardAdminRoutes, { prefix: '/api/admin/dashboard' });

  // ── Analytics admin routes ────────────────────────────────────────────────
  await app.register(analyticsAdminRoutes, { prefix: '/api/admin/analytics' });

  // ── Internal links admin routes ───────────────────────────────────────────
  await app.register(internalLinkRoutes, { prefix: '/api/admin/internal-links' });

  // ── Lounge admin routes ────────────────────────────────────────────────────
  await app.register(loungeAdminRoutes, { prefix: '/api/admin/lounges' });

  // ── Tax rates admin routes ─────────────────────────────────────────────────
  await app.register(taxAdminRoutes, { prefix: '/api/admin/tax-rates' });

  // ── Corporate accounts admin routes ───────────────────────────────────────
  await app.register(corporateAdminRoutes, { prefix: '/api/admin/corporate' });

  // ── API key management admin routes ───────────────────────────────────────
  await app.register(apiKeyAdminRoutes, { prefix: '/api/admin/api-keys' });

  // ── Public routes ─────────────────────────────────────────────────────────
  // publicRoutes handles /api/public/airports and /api/public/services
  await app.register(publicRoutes, { prefix: '/api/public' });
  await app.register(pricingPublicRoutes, { prefix: '/api/public/pricing' });
  await app.register(availabilityPublicRoutes, { prefix: '/api/public/availability' });
  await app.register(loungePublicRoutes, { prefix: '/api/public/lounges' });
  await app.register(searchRoutes, { prefix: '/api/public/search' });
  // ── Public booking routes with stricter rate limit (20/hour per IP) ──────
  await app.register(
    async (bookingApp) => {
      await bookingApp.register(rateLimit, {
        max: 20,
        timeWindow: '1 hour',
        keyGenerator: (request) => `public-booking:${request.ip}`,
        errorResponseBuilder: () => ({
          statusCode: 429,
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many booking requests. Please try again later.',
          },
        }),
      });
      await bookingApp.register(bookingPublicRoutes);
    },
    { prefix: '/api/public/bookings' },
  );

  // ── Public payment routes with stricter rate limit (10/hour per IP) ──────
  await app.register(
    async (paymentApp) => {
      await paymentApp.register(rateLimit, {
        max: 10,
        timeWindow: '1 hour',
        keyGenerator: (request) => `public-payment:${request.ip}`,
        errorResponseBuilder: () => ({
          statusCode: 429,
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many payment requests. Please try again later.',
          },
        }),
      });
      await paymentApp.register(paymentPublicRoutes);
    },
    { prefix: '/api/public/payments' },
  );

  // ── Public flight search routes ───────────────────────────────────────────
  await app.register(flightPublicRoutes, { prefix: '/api/public/flights' });

  // ── Public analytics routes (rate limit 100/min per IP) ───────────────────
  await app.register(
    async (analyticsApp) => {
      await analyticsApp.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        keyGenerator: (request) => `analytics:${request.ip}`,
        errorResponseBuilder: () => ({
          statusCode: 429,
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        }),
      });
      await analyticsApp.register(analyticsPublicRoutes);
    },
    { prefix: '/api/public/analytics' },
  );

  // ── Supplier portal routes ─────────────────────────────────────────────────
  await app.register(supplierPortalRoutes, { prefix: '/api/supplier' });

  // ── Customer portal routes ─────────────────────────────────────────────────
  await app.register(customerPortalRoutes, { prefix: '/api/public/customers' });

  // ── Corporate public routes ────────────────────────────────────────────────
  await app.register(corporatePublicRoutes, { prefix: '/api/public/corporate' });

  // ── Settings admin routes ──────────────────────────────────────────────────
  await app.register(settingsAdminRoutes, { prefix: '/api/admin/settings' });

  // ── Public API v1 (developer API, key-authenticated) ──────────────────────
  await app.register(apiV1Routes, { prefix: '/api/v1' });

  // ── Stripe webhook route (raw body required — scoped content type parser) ──
  await app.register(stripeWebhookRoutes, { prefix: '/api/webhooks/stripe' });

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async () => {
    return { status: 'ok', service: 'airportfaster-api', timestamp: new Date().toISOString() };
  });

  // ── Global error handler ──────────────────────────────────────────────────
  app.setErrorHandler(
    (
      error: Error & {
        statusCode?: number;
        success?: boolean;
        error?: { code?: string; message?: string };
      },
      request,
      reply,
    ) => {
      if (error.statusCode === 429 || error.error?.code === 'RATE_LIMITED') {
        return reply.status(429).send({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: error.error?.message ?? 'Too many requests. Please try again later.',
          },
        });
      }

      logger.error({ err: error, url: request.url }, 'Unhandled error');
      const statusCode = error.statusCode ?? 500;
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message:
            process.env['NODE_ENV'] === 'production'
              ? 'An internal error occurred'
              : error.message,
        },
      });
    },
  );

  return app;
}

async function start() {
  try {
    const app = await buildServer();
    await app.listen({ port: PORT, host: HOST });
    logger.info(`🚀 API server running on http://${HOST}:${PORT}`);

    // ── Start background workers (only if ENABLE_WORKERS=true) ──────────────
    // Disabled by default to avoid double-running in cluster/PM2 mode.
    if (process.env['ENABLE_WORKERS'] === 'true') {
      const { startEmailWorker } = await import('./workers/email.worker.js');
      const { startSitemapWorker } = await import('./workers/sitemap.worker.js');
      startEmailWorker();
      startSitemapWorker();
      logger.info('Background workers started');
    }
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  start();
}
