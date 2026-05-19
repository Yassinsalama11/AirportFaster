const SENTRY_DSN = process.env['NEXT_PUBLIC_SENTRY_DSN'];
const ENABLE_DEV_SENTRY = process.env['NEXT_PUBLIC_SENTRY_ENABLE_DEV'] === 'true';

function isConfiguredDsn(value: string | undefined): value is string {
  return Boolean(value && !value.includes('...'));
}

if (isConfiguredDsn(SENTRY_DSN) && (process.env['NODE_ENV'] === 'production' || ENABLE_DEV_SENTRY)) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env['NODE_ENV'] ?? 'development',
      tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
      sendDefaultPii: false,
    });
  });
}

export {};
