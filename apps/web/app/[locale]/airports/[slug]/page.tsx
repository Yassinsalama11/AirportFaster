import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Zap, Users, Coffee, Star, Search, Shield, Plane, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getInternalLinksForEntity } from '@/lib/internal-links';
import { localeAlternates, ogLocales } from '@/lib/seo';
import { SchemaScript } from '@/components/public/SchemaScript';
import { airportSchema, breadcrumbSchema } from '@/lib/schema';
import {
  selectPricingRule,
  calculatePriceMinor,
  formatCurrency,
  getPricingRuleDisplayName,
  getPricingRuleDescription,
  type BookingPricingRule,
} from '@/lib/booking-pricing';

// Revalidate the page itself every 60s — combined with per-fetch tags this means
// admin edits (`revalidateTag('airport-<slug>')`) propagate immediately, while normal
// traffic hits a fully cached HTML.
export const revalidate = 60;

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

interface AirportTranslation {
  locale: string;
  name: string;
  description?: string;
}

interface AirportImage {
  url: string;
  altText?: string;
  isPrimary: boolean;
}

interface ServiceTranslation {
  locale: string;
  name: string;
  description?: string;
}

interface Service {
  id: string;
  slug: string;
  icon?: string;
  translations: ServiceTranslation[];
}

interface AirportServiceRow {
  id: string;
  isActive: boolean;
  service: Service;
  pricingRules?: BookingPricingRule[];
}

interface AirportSeo {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
}

interface Airport {
  id: string;
  iataCode: string;
  icaoCode?: string | null;
  slug: string;
  city: string;
  country: string;
  status: string;
  translations: AirportTranslation[];
  images: AirportImage[];
  seo?: AirportSeo | null;
  airportServices: AirportServiceRow[];
}

async function getAirport(slug: string): Promise<Airport | null> {
  try {
    // 60s revalidate — admin edits show up within a minute, page is cached otherwise.
    const res = await fetch(`${API_BASE}/api/public/airports/${slug}`, {
      next: { revalidate: 60, tags: ['airport', `airport-${slug}`] },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; data: { airport: Airport } };
    return data.success ? data.data.airport : null;
  } catch {
    return null;
  }
}

async function getAllSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/airports`, {
      next: { revalidate: 600, tags: ['airports'] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { success: boolean; data: { airports: Airport[] } };
    return data.success ? data.data.airports.map((a) => a.slug) : [];
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

function getLocalName(translations: AirportTranslation[], locale: string) {
  return (
    translations.find((t) => t.locale === locale)?.name ??
    translations.find((t) => t.locale === 'en')?.name ??
    'Airport'
  );
}

function getLocalDescription(translations: AirportTranslation[], locale: string) {
  return (
    translations.find((t) => t.locale === locale)?.description ??
    translations.find((t) => t.locale === 'en')?.description
  );
}

function getEnName(translations: AirportTranslation[]) {
  return translations.find((t) => t.locale === 'en')?.name ?? 'Airport';
}

function getServiceLocalName(service: Service, locale: string) {
  return (
    service.translations.find((t) => t.locale === locale)?.name ??
    service.translations.find((t) => t.locale === 'en')?.name ??
    service.slug
  );
}

function getServiceLocalDescription(service: Service, locale: string) {
  return (
    service.translations.find((t) => t.locale === locale)?.description ??
    service.translations.find((t) => t.locale === 'en')?.description
  );
}

function ServiceIcon({ slug }: { slug: string }) {
  if (slug === 'fast_track') return <Zap className="w-6 h-6" />;
  if (slug === 'meet_and_greet') return <Users className="w-6 h-6" />;
  if (slug === 'lounge_access') return <Coffee className="w-6 h-6" />;
  return <Star className="w-6 h-6" />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const airport = await getAirport(slug);

  if (!airport) return { title: 'Airport Not Found' };

  const name =
    airport.translations.find((t) => t.locale === locale)?.name ??
    getEnName(airport.translations);
  const seo = airport.seo;
  const tMeta = await getTranslations('airport');
  const title =
    seo?.metaTitle ??
    `${name} (${airport.iataCode}) — ${tMeta('service_meta_page_title_suffix')}`;
  const description =
    seo?.metaDescription ??
    `${tMeta('service_meta_page_description', { name, iata: airport.iataCode, city: airport.city })}`;

  return {
    title,
    description,
    openGraph: {
      title: seo?.ogTitle ?? title,
      description: seo?.ogDescription ?? description,
      images: seo?.ogImage ? [{ url: seo.ogImage }] : [],
      url: seo?.canonicalUrl ?? `${BASE_URL}/${locale}/airports/${slug}`,
      ...ogLocales(locale),
    },
    alternates: seo?.canonicalUrl
      ? { canonical: seo.canonicalUrl }
      : localeAlternates(`/airports/${slug}`, locale),
  };
}

export default async function AirportLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ date?: string; adults?: string; children?: string; infants?: string }>;
}) {
  const { slug, locale } = await params;
  const sp = await searchParams;
  // Forward the home-composer query params to every Book CTA so the user
  // doesn't lose their date / passenger selections when picking a plan.
  const forwardedSearch = new URLSearchParams();
  if (sp.date) forwardedSearch.set('date', sp.date);
  if (sp.adults) forwardedSearch.set('adults', sp.adults);
  if (sp.children) forwardedSearch.set('children', sp.children);
  if (sp.infants) forwardedSearch.set('infants', sp.infants);
  const forwardedQuery = forwardedSearch.toString();
  const airport = await getAirport(slug);

  if (!airport || airport.status !== 'active') {
    notFound();
  }

  const t = await getTranslations('airport');

  const name = getLocalName(airport.translations, locale);
  const description = getLocalDescription(airport.translations, locale);
  const primaryImage = airport.images.find((i) => i.isPrimary) ?? airport.images[0];
  const activeServices = airport.airportServices.filter((as) => as.isActive);

  const HOW_IT_WORKS = [
    { Icon: Search, text: t('how_step1') },
    { Icon: Shield, text: t('how_step2') },
    { Icon: Plane, text: t('how_step3') },
  ];

  const STATIC_FAQS = [
    { question: t('faq_q1'), answer: t('faq_a1') },
    { question: t('faq_q2'), answer: t('faq_a2') },
  ];

  const TRUST_STATS = [
    { value: t('stat_bookings_value'), label: t('stat_bookings_label') },
    { value: t('stat_airports_value'), label: t('stat_airports_label') },
    { value: t('stat_rating_value'), label: t('stat_rating_label') },
    { value: t('stat_support_value'), label: t('stat_support_label') },
  ];

  // T-053: Fetch internal links for related entities
  const relatedLinks = await getInternalLinksForEntity('airport', airport.id);

  return (
    <>
      <SchemaScript schema={airportSchema({ name, iataCode: airport.iataCode, city: airport.city, country: airport.country, slug })} />
      <SchemaScript schema={breadcrumbSchema([
        { name: t('breadcrumb_home'), url: `${BASE_URL}/en` },
        { name: t('breadcrumb_airports'), url: `${BASE_URL}/en/airports` },
        { name: `${name} (${airport.iataCode})`, url: `${BASE_URL}/en/airports/${slug}` },
      ])} />

      {/* ── Breadcrumb ── */}
      <div className="border-b border-line/60 bg-surface">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-ink-3">
            <Link href="/" className="hover:text-ink transition-colors">{t('breadcrumb_home')}</Link>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 text-ink-3/60" />
            <Link href="/airports" className="hover:text-ink transition-colors">{t('breadcrumb_airports')}</Link>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 text-ink-3/60" />
            <span className="text-ink font-medium truncate">{name}</span>
          </nav>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-10 pb-14 lg:pt-16 lg:pb-20">
        {/* Soft gold + warm background blobs (marketplace 2026) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-brand-gold/12 blur-3xl opacity-70" />
          <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-100/50 blur-3xl opacity-60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* ── Content (left) ── */}
            <div className="lg:col-span-7">
              <Badge variant="gold" className="mb-5">
                <Plane className="w-3 h-3 me-1.5" />
                {t('breadcrumb_airports')}
              </Badge>

              <h1 className="text-display-lg font-bold text-ink leading-[1.05] tracking-tight text-balance mb-5">
                {name}
              </h1>

              {/* Meta row: IATA + ICAO + Location */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span
                  dir="ltr"
                  className="inline-flex items-center px-3.5 py-1.5 bg-ink text-bg text-sm font-mono font-bold rounded-full"
                >
                  {airport.iataCode}
                </span>
                {airport.icaoCode && (
                  <span
                    dir="ltr"
                    className="inline-flex items-center px-3 py-1.5 bg-surface-2 border border-line text-ink-2 text-xs font-mono font-semibold rounded-full"
                  >
                    {airport.icaoCode}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-ink-2 text-sm">
                  <MapPin className="w-4 h-4 text-brand-gold-dark shrink-0" />
                  {airport.city}, {airport.country}
                </span>
              </div>

              {/* Description */}
              {description && (
                <p className="text-body-lg text-ink-2 leading-relaxed max-w-2xl mb-8 text-balance">
                  {description}
                </p>
              )}

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                {activeServices.length > 0 && (
                  <Button variant="gold" size="lg" asChild>
                    <a href="#services" className="inline-flex items-center gap-2">
                      {t('cta_button', { iata: airport.iataCode })}
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </a>
                  </Button>
                )}
                {activeServices.length > 0 && (
                  <span className="text-sm text-ink-3">
                    {activeServices.length} {activeServices.length === 1 ? 'service' : 'services'} available
                  </span>
                )}
              </div>
            </div>

            {/* ── Image card (right) ── */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[4/5] rounded-3xl overflow-hidden shadow-card-hover border border-line">
                {primaryImage ? (
                  <Image
                    src={primaryImage.url}
                    alt={primaryImage.altText ?? name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="absolute inset-0 img-placeholder-2" />
                )}

                {/* Bottom gradient — subtle, just for the floating chip */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />

                {/* Floating IATA chip */}
                <div className="absolute top-4 start-4">
                  <span
                    dir="ltr"
                    className="inline-flex items-center px-3 py-1.5 bg-bg/95 backdrop-blur-md text-ink text-xs font-mono font-bold rounded-full shadow-pill"
                  >
                    {airport.iataCode}
                  </span>
                </div>

                {/* Bottom city overlay */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-white/90 text-sm font-medium drop-shadow">
                    {airport.city}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      {activeServices.length > 0 && (
        <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-ink mb-8">{t('services_at', { name })}</h2>
          <div className="space-y-10">
            {activeServices.map((as) => {
              const svcName = getServiceLocalName(as.service, locale);
              const svcDesc = getServiceLocalDescription(as.service, locale);
              const activeRules = (as.pricingRules ?? []).filter((r) => (r as unknown as { status: string }).status !== 'inactive');
              const sortedRules = [...activeRules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

              return (
                <div key={as.id} className="bg-surface border border-line rounded-2xl shadow-card overflow-hidden">
                  {/* Service header */}
                  <div className="p-6 flex items-start gap-4 border-b border-line/60">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-gold/15 text-brand-gold-dark shrink-0">
                      <ServiceIcon slug={as.service.slug} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-ink mb-1">{svcName}</h3>
                      {svcDesc && <p className="text-sm text-ink-2 leading-relaxed">{svcDesc}</p>}
                    </div>
                  </div>

                  {/* Experience options */}
                  {sortedRules.length > 0 ? (
                    <div className="divide-y divide-line/60">
                      {sortedRules.map((rule) => {
                        const ruleName = getPricingRuleDisplayName(rule, svcName);
                        const ruleDesc = getPricingRuleDescription(rule);
                        const priceMinor = calculatePriceMinor(rule, { adults: 1, children: 0, infants: 0 });
                        const priceStr = priceMinor > 0 ? formatCurrency(priceMinor, rule.currency) : null;

                        const ruleQuery = new URLSearchParams();
                        ruleQuery.set('serviceId', as.id);
                        ruleQuery.set('ruleId', rule.id ?? '');
                        if (forwardedQuery) {
                          for (const [k, v] of new URLSearchParams(forwardedQuery).entries()) {
                            ruleQuery.set(k, v);
                          }
                        }

                        return (
                          <div key={rule.id} className="flex items-center gap-4 px-6 py-4 hover:bg-brand-gold/5 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-ink text-sm">{ruleName}</p>
                              <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">{ruleDesc}</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              {priceStr ? (
                                <span className="text-sm font-bold text-ink whitespace-nowrap">
                                  {t('from_price', { price: priceStr })}
                                </span>
                              ) : (
                                <span className="text-xs text-ink-3">{t('price_on_request')}</span>
                              )}
                              <Button asChild variant="gold" size="sm">
                                <Link href={`/airports/${slug}/book?${ruleQuery.toString()}`}>
                                  {t('book_this_service')}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-6 py-4">
                      <span className="text-sm text-ink-3">{t('price_on_request')}</span>
                      <Button asChild variant="gold" size="sm">
                        <Link href={`/airports/${slug}/book?serviceId=${as.id}${forwardedQuery ? `&${forwardedQuery}` : ''}`}>
                          {t('book_this_service')}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Primary Book Now CTA ── */}
      <section className="bg-surface-2 border-y border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-ink mb-2">{t('cta_title')}</h2>
          <p className="text-ink-2 mb-8">{t('cta_subtitle', { name })}</p>
          <Button asChild variant="gold" size="xl">
            <Link
              href={
                forwardedQuery
                  ? `/airports/${slug}/book?${forwardedQuery}`
                  : `/airports/${slug}/book`
              }
            >
              {t('cta_button', { iata: airport.iataCode })}
            </Link>
          </Button>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-ink mb-10">{t('how_it_works')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ Icon, text }, i) => (
            <div key={i} className="flex flex-col items-start gap-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-gold/15 text-brand-gold-dark">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-brand-gold-dark uppercase tracking-widest">
                {t('step_label', { n: String(i + 1).padStart(2, '0') })}
              </span>
              <p className="text-sm text-ink-2 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="bg-surface-2 border-t border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-ink mb-8">{t('faq')}</h2>
          <div className="space-y-3">
            {STATIC_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="bg-surface border border-line rounded-2xl group"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none select-none">
                  <span className="font-medium text-ink">{faq.question}</span>
                  <span className="text-brand-gold-dark ml-4 flex-shrink-0 text-xl leading-none group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm text-ink-2 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust stats ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {TRUST_STATS.map((stat) => (
            <div key={stat.label} className="bg-surface border border-line rounded-2xl p-6 shadow-card">
              <div className="text-2xl font-bold text-brand-gold-dark">{stat.value}</div>
              <div className="text-xs text-ink-3 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── T-053: Related pages via internal links ── */}
      {relatedLinks.length > 0 && (
        <section className="border-t border-line bg-surface-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-xl font-bold text-ink mb-6">{t('related')}</h2>
            <div className="flex flex-wrap gap-3">
              {relatedLinks.slice(0, 4).map((link) => {
                const isOutbound = link.fromPage.airportId === airport.id;
                const targetPage = isOutbound ? link.toPage : link.fromPage;
                const href = targetPage.airportId
                  ? `/airports/${targetPage.slug}`
                  : `/services/${targetPage.slug}`;
                return (
                  <Link
                    key={link.id}
                    href={href}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-surface border border-line rounded-full text-sm text-ink-2 hover:text-brand-gold-dark hover:border-brand-gold/30 transition-all shadow-pill"
                  >
                    {link.anchorText} &rarr;
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Browse all airports ── */}
      <section className="border-t border-line bg-surface-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/airports"
            className="inline-flex items-center gap-1 text-sm text-brand-gold-dark hover:underline transition-colors"
          >
            {t('browse_all')} &rarr;
          </Link>
        </div>
      </section>
    </>
  );
}
