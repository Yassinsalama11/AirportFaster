import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

export function initSentry(): void {
  const dsn = process.env['SENTRY_DSN'];

  if (!dsn || dsn.includes('...')) {
    logger.warn('SENTRY_DSN not set — Sentry disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    // Do not send PII by default
    sendDefaultPii: false,
  });

  logger.info('Sentry initialized');
}

export { Sentry };
