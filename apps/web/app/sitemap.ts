import type { MetadataRoute } from 'next';

const BASE_URL = 'https://airportfaster.com';
const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const LOCALES = ['en', 'ar'] as const;
const SERVICE_SLUGS = ['fast-track', 'meet-and-greet', 'lounge-access'] as const;

interface AirportServiceRow {
  isActive: boolean;
  service: { slug: string };
}

interface Airport {
  slug: string;
  airportServices: AirportServiceRow[];
}

async function fetchAirports(): Promise<Airport[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/airports`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: { airports: Airport[] };
    };
    return data.success ? data.data.airports : [];
  } catch {
    return [];
  }
}

function localeEntries(
  path: string,
  opts: { changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number },
): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}${path}`,
    lastModified: new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: {
      languages: Object.fromEntries(
        LOCALES.map((l) => [l, `${BASE_URL}/${l}${path}`]),
      ) as Record<string, string>,
    },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const airports = await fetchAirports();

  const staticRoutes = [
    ...localeEntries('', { changeFrequency: 'weekly', priority: 1.0 }),
    ...localeEntries('/airports', { changeFrequency: 'weekly', priority: 0.9 }),
    ...localeEntries('/services', { changeFrequency: 'weekly', priority: 0.9 }),
    ...SERVICE_SLUGS.flatMap((slug) =>
      localeEntries(`/services/${slug}`, { changeFrequency: 'weekly', priority: 0.85 }),
    ),
    ...localeEntries('/for-business', { changeFrequency: 'monthly', priority: 0.8 }),
    ...localeEntries('/help', { changeFrequency: 'monthly', priority: 0.7 }),
    ...localeEntries('/legal/terms', { changeFrequency: 'yearly', priority: 0.3 }),
    ...localeEntries('/legal/privacy', { changeFrequency: 'yearly', priority: 0.3 }),
    ...localeEntries('/legal/cookies', { changeFrequency: 'yearly', priority: 0.3 }),
  ];

  const airportRoutes = airports.flatMap((airport) =>
    localeEntries(`/airports/${airport.slug}`, { changeFrequency: 'weekly', priority: 0.8 }),
  );

  const airportServiceRoutes = airports.flatMap((airport) =>
    airport.airportServices
      .filter((as) => as.isActive)
      .flatMap((as) =>
        localeEntries(`/airports/${airport.slug}/${as.service.slug}`, {
          changeFrequency: 'monthly',
          priority: 0.7,
        }),
      ),
  );

  return [...staticRoutes, ...airportRoutes, ...airportServiceRoutes];
}
