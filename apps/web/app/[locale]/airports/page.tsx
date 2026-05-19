import { AirportCard } from '@/components/public/AirportCard';
import { SchemaScript } from '@/components/public/SchemaScript';
import { itemListSchema } from '@/lib/schema';
import { localeAlternates, ogLocales } from '@/lib/seo';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const revalidate = 3600;

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('airports');
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${BASE_URL}/${locale}/airports`,
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: t('title') }],
      ...ogLocales(locale),
    },
    twitter: { card: 'summary_large_image', site: '@airportfaster' },
    alternates: localeAlternates('/airports', locale),
  };
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface AirportTranslation {
  locale: string;
  name: string;
}

interface AirportImage {
  url: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

interface Airport {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  translations: AirportTranslation[];
  images?: AirportImage[];
  airportServices: Array<{ isActive: boolean }>;
}

async function getAirports(): Promise<Airport[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/airports`, {
      next: { revalidate: 300, tags: ['airports'] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { success: boolean; data: { airports: Airport[] } };
    return data.success ? data.data.airports : [];
  } catch {
    return [];
  }
}

export default async function AirportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, t] = await Promise.all([params, getTranslations('airports')]);
  const airports = await getAirports();

  const airportListSchema = itemListSchema(
    airports.map((a) => ({
      name:
        a.translations.find((tr) => tr.locale === 'en')?.name ??
        a.translations[0]?.name ??
        a.city,
      url: `${BASE_URL}/en/airports/${a.slug}`,
    })),
  );

  return (
    <>
      <SchemaScript schema={airportListSchema} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-brand-gold">
            AirportFaster
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-none text-ink md:text-7xl">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-3">{t('description')}</p>
          <p className="mt-5 text-sm text-ink-3">
            <span className="font-semibold text-brand-gold">{airports.length}</span>{' '}
            {t('count', { count: airports.length }).replace(String(airports.length), '').trim()}
          </p>
        </div>

        {airports.length === 0 ? (
          <div className="apple-panel py-20 text-center text-ink-3">{t('empty')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {airports.map((airport) => {
              const activeServiceCount = airport.airportServices.filter((service) => service.isActive).length;
              return (
                <AirportCard
                  key={airport.id}
                  airport={airport}
                  locale={locale}
                  servicesLabel={t('services_available', { count: activeServiceCount })}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
