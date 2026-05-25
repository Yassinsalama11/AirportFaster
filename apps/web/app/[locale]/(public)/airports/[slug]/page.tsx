import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Zap, Users, Coffee, Sparkles, Clock, Shield } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { localeAlternates, ogLocales } from '@/lib/seo';
import { SchemaScript } from '@/components/public/SchemaScript';
import { airportSchema, breadcrumbSchema } from '@/lib/schema';
import {
  formatCurrency,
  selectPricingRule,
  calculatePriceMinor,
  type BookingPricingRule,
} from '@/lib/booking-pricing';

export const revalidate = 3600;

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

interface AirportTranslation {
  locale: string;
  name: string;
  description?: string;
}

interface ServiceTranslation {
  locale: string;
  name: string;
  description?: string;
}

interface Service {
  id: string;
  slug: string;
  icon?: string | null;
  translations: ServiceTranslation[];
}

interface AirportServiceTranslation {
  locale: string;
  name: string;
  description?: string | null;
}

interface AirportServiceRow {
  id: string;
  isActive: boolean;
  minimumLeadHours?: number;
  maxLeadDays?: number;
  directionAvailable?: 'arrival' | 'departure' | 'both';
  translations?: AirportServiceTranslation[];
  service: Service;
  pricingRules?: BookingPricingRule[];
}

interface AirportImage {
  url: string;
  altText?: string | null;
  isPrimary: boolean;
}

interface Airport {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  status: string;
  translations: AirportTranslation[];
  images?: AirportImage[];
  airportServices: AirportServiceRow[];
}

async function getAirport(slug: string): Promise<Airport | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/airports/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; data: { airport: Airport } };
    return data.success ? data.data.airport : null;
  } catch {
    return null;
  }
}

function getAirportName(airport: Airport, locale: string): string {
  return (
    airport.translations.find((t) => t.locale === locale)?.name ??
    airport.translations.find((t) => t.locale === 'en')?.name ??
    airport.city
  );
}

function getServiceDisplay(
  row: AirportServiceRow,
  locale: string,
): { name: string; description: string | null } {
  // Market-name override has top priority
  const override = row.translations?.find((t) => t.locale === locale);
  const overrideFallback = row.translations?.find((t) => t.locale === 'en');
  const overrideName = override?.name ?? overrideFallback?.name;
  const overrideDesc = override?.description ?? overrideFallback?.description ?? null;
  if (overrideName) {
    return { name: overrideName, description: overrideDesc };
  }
  // Fall back to global service translation
  const svc = row.service.translations.find((t) => t.locale === locale);
  const svcFb = row.service.translations.find((t) => t.locale === 'en');
  return {
    name: svc?.name ?? svcFb?.name ?? row.service.slug,
    description: svc?.description ?? svcFb?.description ?? null,
  };
}

function ServiceIcon({ slug, className }: { slug: string; className?: string }) {
  if (slug.includes('fast') || slug.includes('track')) return <Zap className={className} />;
  if (slug.includes('meet') || slug.includes('greet')) return <Users className={className} />;
  if (slug.includes('lounge')) return <Coffee className={className} />;
  return <Sparkles className={className} />;
}

function getFromPrice(rules: BookingPricingRule[] | undefined): {
  display: string;
  currency: string;
} | null {
  const rule = selectPricingRule(rules);
  if (!rule) return null;
  const oneAdultMinor = calculatePriceMinor(rule, { adults: 1, children: 0, infants: 0 });
  if (oneAdultMinor <= 0) return null;
  return { display: formatCurrency(oneAdultMinor, rule.currency), currency: rule.currency };
}

function parsePassengerParam(value: string | undefined, fallback: number, max: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, n);
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const airport = await getAirport(slug);
  if (!airport) return { title: 'Airport — AirportFaster' };
  const name = getAirportName(airport, locale);
  const t = await getTranslations({ locale, namespace: 'airport' });
  return {
    title: t('plans_meta_title', { airport: name, iata: airport.iataCode, default: `Choose your plan at ${name} (${airport.iataCode}) — AirportFaster` }),
    description: t('plans_meta_description', { airport: name, default: `Browse premium airport services available at ${name}: Fast Track, Meet & Greet, Lounge Access and more.` }),
    openGraph: {
      ...ogLocales(locale),
      url: `${BASE_URL}/${locale}/airports/${slug}`,
    },
    alternates: localeAlternates(`/airports/${slug}`, locale),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AirportPlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ date?: string; adults?: string; children?: string; infants?: string }>;
}) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const airport = await getAirport(slug);
  if (!airport || airport.status !== 'active') {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'airport' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  const name = getAirportName(airport, locale);
  const primaryImage = airport.images?.find((i) => i.isPrimary) ?? airport.images?.[0];

  const adults = parsePassengerParam(sp.adults, 1, 9);
  const children = parsePassengerParam(sp.children, 0, 9);
  const infants = parsePassengerParam(sp.infants, 0, 5);
  const totalPax = adults + children + infants;

  const activeServices = airport.airportServices.filter((s) => s.isActive);

  // Forward all the search params to the next step so the user doesn't re-pick.
  function buildBookUrl(serviceRowId: string): string {
    const params = new URLSearchParams();
    params.set('serviceId', serviceRowId);
    if (sp.date) params.set('date', sp.date);
    params.set('adults', String(adults));
    params.set('children', String(children));
    params.set('infants', String(infants));
    return `/${locale}/airports/${slug}/book?${params.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
      <SchemaScript
        schema={airportSchema({
          name,
          iataCode: airport.iataCode,
          city: airport.city,
          country: airport.country,
          slug: airport.slug,
        })}
      />
      <SchemaScript
        schema={breadcrumbSchema([
          { name: tCommon('home'), url: `${BASE_URL}/${locale}` },
          { name: t('breadcrumb_airports'), url: `${BASE_URL}/${locale}/airports` },
          { name: `${airport.iataCode} — ${name}`, url: `${BASE_URL}/${locale}/airports/${slug}` },
        ])}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-3 mb-6">
        <Link href="/" className="hover:text-ink transition-colors">
          {tCommon('home')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <Link href="/airports" className="hover:text-ink transition-colors">
          {t('breadcrumb_airports')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <span className="text-ink font-medium" dir="ltr">
          {airport.iataCode}
        </span>
      </nav>

      {/* Hero */}
      <header className="mb-10 lg:mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-brand-gold mb-3">
              {t('plans_eyebrow', { default: 'Choose your plan' })}
            </p>
            <h1 className="text-3xl lg:text-4xl font-bold text-ink tracking-tight mb-3">
              {t('plans_title', { airport: name, default: `Premium services at ${name}` })}
            </h1>
            <p className="text-ink-2 text-base lg:text-lg max-w-xl">
              {t('plans_subtitle', {
                count: activeServices.length,
                default: `${activeServices.length} services available. Compare options and book in under a minute.`,
              })}
            </p>

            {/* Booking summary chips */}
            <div className="flex flex-wrap gap-2 mt-5 text-xs">
              {sp.date && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-line text-ink-2">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(sp.date).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-line text-ink-2">
                <Users className="w-3.5 h-3.5" />
                {totalPax} {totalPax === 1 ? 'traveller' : 'travellers'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-line text-ink-2">
                <Shield className="w-3.5 h-3.5" />
                {t('plans_secure_badge', { default: 'Free cancellation up to 24h' })}
              </span>
            </div>
          </div>

          {primaryImage?.url && (
            <div className="relative h-56 lg:h-64 rounded-2xl overflow-hidden border border-line">
              <Image
                src={primaryImage.url}
                alt={primaryImage.altText ?? name}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 40vw, 100vw"
                priority
              />
            </div>
          )}
        </div>
      </header>

      {/* Plan cards */}
      {activeServices.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-ink-2">
            {t('plans_none', {
              airport: name,
              default: `No services are available at ${name} yet. Please check back soon.`,
            })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeServices.map((row) => {
            const display = getServiceDisplay(row, locale);
            const fromPrice = getFromPrice(row.pricingRules);
            const minHours = row.minimumLeadHours ?? 2;
            const direction = row.directionAvailable ?? 'both';

            return (
              <article
                key={row.id}
                className="group relative flex flex-col rounded-2xl border border-line bg-surface p-6 hover:border-brand-gold/40 hover:shadow-card-hover transition-all"
              >
                {/* Icon + name */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-gold/10 text-brand-gold-dark shrink-0">
                    <ServiceIcon slug={row.service.slug} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-ink leading-snug">{display.name}</h2>
                    <p className="text-xs text-ink-3 mt-0.5 font-mono">{row.service.slug}</p>
                  </div>
                </div>

                {/* Description */}
                {display.description && (
                  <p className="text-sm text-ink-2 mb-4 line-clamp-3">{display.description}</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap gap-2 text-[11px] text-ink-3 mb-5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-line">
                    <Clock className="w-3 h-3" />
                    {t('plans_lead_label', { hours: minHours, default: `${minHours}h advance` })}
                  </span>
                  {direction !== 'both' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-line capitalize">
                      {direction === 'arrival' ? t('arrival') : t('departure')}{' '}
                      {t('plans_only_label', { default: 'only' })}
                    </span>
                  )}
                </div>

                {/* Price + CTA */}
                <div className="mt-auto pt-4 border-t border-line flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">
                      {t('plans_from', { default: 'From' })}
                    </p>
                    <p className="text-2xl font-bold text-brand-gold-dark mt-0.5">
                      {fromPrice ? fromPrice.display : t('plans_on_request', { default: 'On request' })}
                    </p>
                    <p className="text-[11px] text-ink-3">{t('plans_per_pax', { default: 'per passenger' })}</p>
                  </div>
                  <Link
                    href={buildBookUrl(row.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-gold text-brand-black font-bold rounded-full hover:bg-brand-gold-light transition-colors text-sm whitespace-nowrap"
                  >
                    {t('plans_choose', { default: 'Choose plan' })}
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Why us strip */}
      <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-xl border border-line bg-surface-2 p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-brand-gold-dark shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink">{t('plans_why_secure_title', { default: 'Secure payment' })}</p>
            <p className="text-ink-3 text-xs mt-0.5">
              {t('plans_why_secure_body', { default: 'Encrypted checkout. Cards never stored on our servers.' })}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-brand-gold-dark shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink">{t('plans_why_cancel_title', { default: 'Free cancellation' })}</p>
            <p className="text-ink-3 text-xs mt-0.5">
              {t('plans_why_cancel_body', { default: 'Cancel up to 24 hours before for a full refund.' })}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-brand-gold-dark shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink">{t('plans_why_local_title', { default: 'Local experts' })}</p>
            <p className="text-ink-3 text-xs mt-0.5">
              {t('plans_why_local_body', { default: 'Vetted local providers at every airport.' })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
