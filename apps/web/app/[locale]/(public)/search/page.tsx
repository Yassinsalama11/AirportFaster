import Link from 'next/link';
import { Search, MapPin, Calendar, Users, X, Zap, Coffee, Sparkles, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface AirportTranslation { locale: string; name: string; }
interface ServiceTranslation { locale: string; name: string; }
interface PricingRule { basePriceMinor: number | null; currency: string; status?: string; }
interface SearchService {
  id: string;
  slug: string;
  name: string;
  fromPriceMinorUnits: number;
  currency: string;
}
interface Service { id: string; slug: string; translations: ServiceTranslation[]; }
interface AirportService { id: string; isActive: boolean; service: Service; pricingRules?: PricingRule[]; }
interface Airport {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  name?: string;
  translations?: AirportTranslation[];
  airportServices?: AirportService[];
  services?: SearchService[];
}

type SearchPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; service?: string; date?: string; passengers?: string }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q ?? '';
  return {
    title: q ? `Search: ${q} — AirportFaster` : 'Search Airports — AirportFaster',
    description: 'Find premium airport services — fast track, meet & greet, and lounge access.',
  };
}

async function searchAirports(q: string, service?: string, date?: string, passengers?: string) {
  try {
    const url = new URL(`${API_BASE}/api/public/search`);
    if (q) url.searchParams.set('q', q);
    if (service) url.searchParams.set('service', service);
    if (date) url.searchParams.set('date', date);
    if (passengers) url.searchParams.set('passengers', passengers);
    // Short revalidate so admin edits propagate, but search is still fast and shareable.
    const res = await fetch(url.toString(), { next: { revalidate: 120, tags: ['airports'] } });
    if (!res.ok) return { airports: [] as Airport[], total: 0 };
    const data = (await res.json()) as {
      success: boolean;
      data?: { airports?: Airport[]; results?: Airport[]; total?: number };
    };
    if (!data.success) return { airports: [], total: 0 };
    const airports = data.data?.airports ?? data.data?.results ?? [];
    return { airports, total: data.data?.total ?? airports.length };
  } catch {
    return { airports: [] as Airport[], total: 0 };
  }
}

function getAirportName(airport: Airport, locale: string) {
  return (
    airport.translations?.find((t) => t.locale === locale)?.name ??
    airport.translations?.find((t) => t.locale === 'en')?.name ??
    airport.name ??
    airport.city
  );
}

function getServiceName(service: Service, locale: string) {
  return (
    service.translations.find((t) => t.locale === locale)?.name ??
    service.translations.find((t) => t.locale === 'en')?.name ??
    service.slug
  );
}

function getMinPriceMinor(pricingRules?: PricingRule[]): number | null {
  if (!pricingRules || pricingRules.length === 0) return null;
  const valid = pricingRules
    .filter((r) => r.status !== 'inactive' && r.basePriceMinor != null && r.basePriceMinor > 0)
    .sort((a, b) => (a.basePriceMinor ?? 0) - (b.basePriceMinor ?? 0));
  return valid[0]?.basePriceMinor ?? null;
}

function ServiceIcon({ slug, className }: { slug: string; className?: string }) {
  if (slug.includes('fast')) return <Zap className={className} />;
  if (slug.includes('meet')) return <Users className={className} />;
  if (slug.includes('lounge')) return <Coffee className={className} />;
  return <Sparkles className={className} />;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = sp.q ?? '';
  const service = sp.service;
  const date = sp.date;
  const passengers = sp.passengers;

  const t = await getTranslations('search');
  const tCommon = await getTranslations('common');

  const { airports, total } = await searchAirports(q, service, date, passengers);

  const SERVICE_OPTIONS: Array<{ value: string; label: string; slug: string }> = [
    { value: 'fast_track', label: t('svc_fast_track'), slug: 'fast_track' },
    { value: 'meet_and_greet', label: t('svc_meet_greet'), slug: 'meet_and_greet' },
    { value: 'lounge_access', label: t('svc_lounge'), slug: 'lounge_access' },
  ];

  const hasFilters = Boolean(service || date || passengers);

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Search bar (clean light marketplace 2026 style) ─────────── */}
      <div className="border-b border-line bg-surface sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <form method="GET" action="/search" className="flex items-center gap-2 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
              <input
                name="q"
                defaultValue={q}
                placeholder={t('search_placeholder')}
                className="w-full ps-10 pe-4 h-11 bg-surface-2 border border-line rounded-full text-ink placeholder:text-ink-3 text-sm focus:border-brand-gold focus:bg-surface outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 inline-flex items-center gap-2 rounded-full bg-brand-gold text-brand-black text-sm font-bold hover:bg-brand-gold-light transition-colors"
            >
              {t('search_btn')}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-ink tracking-tight">
            {q ? (
              <>
                {t('results_for')}{' '}
                <span className="text-brand-gold-dark">&ldquo;{q}&rdquo;</span>
              </>
            ) : (
              t('all_airports')
            )}
          </h1>
          <p className="text-sm text-ink-3 mt-2">
            {total === 0
              ? t('no_match')
              : t('results_count', { count: total })}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Filters sidebar ──────────────────────────────────────── */}
          <aside className="lg:w-64 flex-shrink-0">
            <form method="GET" action="/search" className="lg:sticky lg:top-36">
              {q && <input type="hidden" name="q" value={q} />}

              <div className="bg-surface border border-line rounded-2xl shadow-card p-5 space-y-5">
                {/* Service type */}
                <div>
                  <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3">
                    {t('filter_service')}
                  </h3>
                  <div className="space-y-2.5">
                    {SERVICE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2.5 text-sm text-ink-2 cursor-pointer hover:text-ink transition-colors"
                      >
                        <input
                          type="radio"
                          name="service"
                          value={opt.value}
                          defaultChecked={service === opt.value}
                          className="w-4 h-4 accent-brand-gold-dark"
                        />
                        <ServiceIcon slug={opt.slug} className="w-3.5 h-3.5 text-brand-gold-dark" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-line" />

                {/* Date */}
                <div>
                  <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {t('filter_date')}
                  </h3>
                  <input
                    type="date"
                    name="date"
                    defaultValue={date}
                    dir="ltr"
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-xl text-ink text-sm focus:border-brand-gold outline-none transition-colors"
                  />
                </div>

                <div className="border-t border-line" />

                {/* Passengers */}
                <div>
                  <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {t('filter_passengers')}
                  </h3>
                  <select
                    name="passengers"
                    defaultValue={passengers ?? '1'}
                    dir="ltr"
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-xl text-ink text-sm focus:border-brand-gold outline-none transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-brand-gold text-brand-black text-sm font-bold rounded-full hover:bg-brand-gold-light transition-colors"
                >
                  {t('apply_filters')}
                </button>

                {hasFilters && (
                  <Link
                    href={q ? `/search?q=${encodeURIComponent(q)}` : '/search'}
                    className="flex items-center justify-center gap-1.5 text-xs text-ink-3 hover:text-ink transition-colors"
                  >
                    <X className="w-3 h-3" /> {t('clear_filters')}
                  </Link>
                )}
              </div>
            </form>
          </aside>

          {/* ── Results ──────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {airports.length === 0 ? (
              <div className="bg-surface border border-line rounded-2xl shadow-card p-10 text-center">
                <div className="inline-flex w-14 h-14 rounded-full bg-brand-gold/10 text-brand-gold-dark items-center justify-center mb-5">
                  <Search className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-ink mb-2">
                  {q ? t('empty_q_title', { q }) : t('empty_title')}
                </h2>
                <p className="text-sm text-ink-3 max-w-sm mx-auto mb-6">{t('empty_hint')}</p>
                <ul className="text-sm text-ink-2 inline-block text-start list-disc list-inside mb-6 space-y-1">
                  <li>{t('tip_iata')}</li>
                  <li>{t('tip_city')}</li>
                  <li>{t('tip_partial')}</li>
                </ul>
                <div>
                  <Link
                    href="/airports"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-gold-dark hover:text-brand-gold transition-colors"
                  >
                    {t('browse_all')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {airports.map((airport) => {
                  const name = getAirportName(airport, locale);
                  const apiServices = airport.services ?? [];
                  const activeServices = airport.airportServices?.filter((as) => as.isActive) ?? [];
                  const hasPrices = apiServices.length > 0 || activeServices.length > 0;

                  // Pick a "from" price across all services
                  let fromMinor: number | null = null;
                  if (apiServices.length > 0) {
                    fromMinor = Math.min(...apiServices.map((s) => s.fromPriceMinorUnits));
                  } else if (activeServices.length > 0) {
                    const mins = activeServices
                      .map((as) => getMinPriceMinor(as.pricingRules))
                      .filter((v): v is number => v != null);
                    if (mins.length > 0) fromMinor = Math.min(...mins);
                  }

                  return (
                    <Link
                      key={airport.id}
                      href={`/airports/${airport.slug}`}
                      className="block bg-surface border border-line rounded-2xl shadow-card hover:shadow-card-hover hover:border-brand-gold/30 transition-all group p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <span
                              dir="ltr"
                              className="inline-flex items-center px-3 py-1 bg-ink text-bg text-xs font-mono font-bold rounded-full"
                            >
                              {airport.iataCode}
                            </span>
                            <h2 className="text-base font-semibold text-ink group-hover:text-brand-gold-dark transition-colors truncate">
                              {name}
                            </h2>
                          </div>
                          <p className="text-sm text-ink-3 flex items-center gap-1.5 mb-3">
                            <MapPin className="w-3.5 h-3.5 text-brand-gold-dark shrink-0" />
                            {airport.city}, {airport.country}
                          </p>

                          {hasPrices && (
                            <div className="flex flex-wrap gap-1.5">
                              {(apiServices.length > 0
                                ? apiServices.map((s) => ({ id: s.id, label: s.name, slug: s.slug }))
                                : activeServices.map((as) => ({
                                    id: as.id,
                                    label: getServiceName(as.service, locale),
                                    slug: as.service.slug,
                                  }))
                              ).map((chip) => (
                                <span
                                  key={chip.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-line rounded-full text-xs text-ink-2"
                                >
                                  <ServiceIcon slug={chip.slug} className="w-3 h-3 text-brand-gold-dark" />
                                  {chip.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* From price + arrow */}
                        <div className="flex sm:flex-col items-end gap-3 sm:gap-1 shrink-0">
                          {fromMinor != null && (
                            <div className="text-end" dir="ltr">
                              <p className="text-[10px] text-ink-3 uppercase tracking-wider">
                                {tCommon('from')}
                              </p>
                              <p className="text-lg font-bold text-ink leading-tight">
                                €{Math.round(fromMinor / 100)}
                              </p>
                            </div>
                          )}
                          <span className="inline-flex w-9 h-9 rounded-full bg-brand-gold/15 text-brand-gold-dark items-center justify-center group-hover:bg-brand-gold group-hover:text-brand-black transition-colors">
                            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
