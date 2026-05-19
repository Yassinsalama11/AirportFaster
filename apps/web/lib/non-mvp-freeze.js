/* global process */

export const SUPPORTED_LOCALES = ['en', 'ar'];

const FROZEN_PREFIXES = [
  '/account/login',
  '/account/register',
  '/developers',
  '/supplier-portal',
  '/admin/corporate',
];

function stripLocalePrefix(pathname) {
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const [, firstSegment, ...rest] = cleanPath.split('/');

  if (SUPPORTED_LOCALES.includes(firstSegment)) {
    return rest.length > 0 ? `/${rest.join('/')}` : '/';
  }

  return cleanPath;
}

export function isNonMvpFreezeEnabled(env = process.env) {
  return env.AIRPORTFASTER_FREEZE_NON_MVP === 'true';
}

export function isFrozenNonMvpPath(pathname) {
  const normalizedPath = stripLocalePrefix(pathname).replace(/\/+$/, '') || '/';

  return FROZEN_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
}
