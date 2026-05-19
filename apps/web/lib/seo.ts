const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

// Returns canonical URL (locale-specific) and full hreflang alternates.
// path should start with '/', e.g. '/airports/london-heathrow'
export function localeAlternates(path: string, locale: string = 'en') {
  return {
    canonical: `${BASE_URL}/${locale}${path}`,
    languages: {
      en: `${BASE_URL}/en${path}`,
      ar: `${BASE_URL}/ar${path}`,
      'x-default': `${BASE_URL}/en${path}`,
    },
  };
}

// Returns the og:locale string for a given locale code.
export function ogLocale(locale: string): string {
  return locale === 'ar' ? 'ar_AR' : 'en_US';
}

// Returns og:locale + og:locale:alternate for cross-locale OG discovery.
export function ogLocales(locale: string): { locale: string; alternateLocale: string[] } {
  return {
    locale: ogLocale(locale),
    alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_AR'],
  };
}
