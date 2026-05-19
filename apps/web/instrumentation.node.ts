const SENTRY_DSN = process.env['SENTRY_DSN'] ?? process.env['NEXT_PUBLIC_SENTRY_DSN'];
const ENABLE_DEV_SENTRY = process.env['SENTRY_ENABLE_DEV'] === 'true';

function isConfiguredDsn(value: string | undefined): value is string {
  return Boolean(value && !value.includes('...'));
}

async function registerSentry() {
  if (!isConfiguredDsn(SENTRY_DSN)) return;
  if (process.env['NODE_ENV'] !== 'production' && !ENABLE_DEV_SENTRY) return;

  const loadSentry = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<typeof import('@sentry/nextjs')>;
  const Sentry = await loadSentry('@sentry/nextjs');
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
  });
}

void registerSentry();

export {};
