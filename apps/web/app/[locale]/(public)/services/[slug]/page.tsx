import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SchemaScript } from '@/components/public/SchemaScript';
import { serviceSchema, breadcrumbSchema, faqSchema } from '@/lib/schema';
import { localeAlternates, ogLocales } from '@/lib/seo';

export const revalidate = 3600;

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface AirportSearchResult {
  id: string;
  iataCode: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  services: Array<{
    id: string;
    slug: string;
    name: string;
    fromPriceMinorUnits: number;
    currency: string;
  }>;
}

interface HowItWorksStep { step: string; title: string; description: string; }
interface FaqItem { question: string; answer: string; }

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function getService(slug: string): Promise<Service | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/services/${slug}`, {
      next: { revalidate: 3600, tags: ['services'] },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; data: { service: Service } };
    return data.success ? data.data.service : null;
  } catch {
    return null;
  }
}

async function getAirportsForService(slug: string): Promise<AirportSearchResult[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/public/search?service=${encodeURIComponent(slug)}`,
      { next: { revalidate: 3600, tags: ['airports', 'services'] } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { success: boolean; data: { results: AirportSearchResult[] } };
    return data.success ? data.data.results : [];
  } catch {
    return [];
  }
}

async function getAllServiceSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/services`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { success: boolean; data: { services: Array<{ slug: string }> } };
    return data.success ? data.data.services.map((s) => s.slug) : [];
  } catch {
    return [];
  }
}

// ── Static params & metadata ──────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const service = await getService(slug);
  if (!service) return { title: 'Not Found' };
  const name =
    service.translations.find((t) => t.locale === locale)?.name ??
    service.translations.find((t) => t.locale === 'en')?.name ??
    service.slug;
  const title = `${name} | AirportFaster`;
  const description =
    service.translations.find((t) => t.locale === locale)?.description ??
    service.translations.find((t) => t.locale === 'en')?.description ??
    `Book ${name} at airports worldwide. Skip the queues and enjoy a premium travel experience.`;
  return {
    title,
    description,
    openGraph: { title, description, url: `${BASE_URL}/${locale}/services/${slug}`, ...ogLocales(locale) },
    alternates: localeAlternates(`/services/${slug}`, locale),
  };
}

// ── i18n helpers ──────────────────────────────────────────────────────────────

/** Normalise URL slug variants (fast-track / fast_track) to the translation namespace key. */
function slugToKey(slug: string): 'fast_track' | 'meet_and_greet' | 'lounge_access' | 'default' {
  const s = slug.replace(/-/g, '_');
  if (s === 'fast_track' || s === 'meet_and_greet' || s === 'lounge_access') return s;
  return 'default';
}

type Tr = (key: string) => string;

function buildHowItWorks(t: Tr, key: string): HowItWorksStep[] {
  return [1, 2, 3].map((i) => ({
    step: String(i).padStart(2, '0'),
    title: t(`${key}.step${i}_title`),
    description: t(`${key}.step${i}_desc`),
  }));
}

function buildFaqs(t: Tr, key: string): FaqItem[] {
  return [1, 2, 3, 4].map((i) => ({
    question: t(`${key}.faq${i}_q`),
    answer: t(`${key}.faq${i}_a`),
  }));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ServiceLandingPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const [service, airports] = await Promise.all([getService(slug), getAirportsForService(slug)]);
  if (!service) notFound();

  const tPages = await getTranslations('service_pages');
  const tCommon = await getTranslations('common');

  const name =
    service.translations.find((t) => t.locale === locale)?.name ??
    service.translations.find((t) => t.locale === 'en')?.name ??
    service.slug;
  const description =
    service.translations.find((t) => t.locale === locale)?.description ??
    service.translations.find((t) => t.locale === 'en')?.description ??
    tPages('default.intro', { name });

  const key = slugToKey(slug);
  const howItWorks = buildHowItWorks(tPages, key);
  const faqs = buildFaqs(tPages, key);

  const breadcrumb = breadcrumbSchema([
    { name: tCommon('home'), url: BASE_URL },
    { name: tPages('services_breadcrumb'), url: `${BASE_URL}/services` },
    { name, url: `${BASE_URL}/services/${slug}` },
  ]);
  const svcSchema = serviceSchema({ name, description, slug });
  const faqSchemaData = faqSchema(faqs);

  return (
    <>
      <SchemaScript schema={svcSchema} />
      <SchemaScript schema={breadcrumb} />
      <SchemaScript schema={faqSchemaData} />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">{tCommon('home')}</Link>
          <span>/</span>
          <Link href="/services" className="hover:text-ink transition-colors">{tPages('services_breadcrumb')}</Link>
          <span>/</span>
          <span className="text-ink">{name}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-navy to-brand-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{name}</h1>
          <p className="text-gray-300 text-lg max-w-2xl mb-4">{description}</p>
          <p className="text-brand-gold text-sm font-medium">
            {tPages('available_at_count', { count: airports.length })}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-ink mb-10">{tPages('how_it_works')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorks.map((item) => (
            <div key={item.step} className="bg-surface border border-line rounded-2xl p-6 shadow-card">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/15 text-brand-gold-dark text-sm font-bold mb-4">
                {item.step}
              </span>
              <h3 className="font-semibold text-ink mb-2">{item.title}</h3>
              <p className="text-sm text-ink-2">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Airports Grid */}
      {airports.length > 0 && (
        <section className="bg-surface-2 border-y border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-2xl font-bold text-ink mb-8">
              {tPages('airports_offering', { name })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {airports.map((airport) => {
                const svc = airport.services.find((s) => s.slug === slug);
                const priceDisplay = svc
                  ? `${tCommon('from')} €${(svc.fromPriceMinorUnits / 100).toFixed(0)}`
                  : null;
                return (
                  <div key={airport.id} className="bg-surface border border-line rounded-2xl p-6 shadow-card hover:shadow-card-hover hover:border-brand-gold/30 transition-all flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span dir="ltr" className="inline-flex px-2.5 py-1 bg-brand-gold/15 text-brand-gold-dark text-sm font-mono font-bold rounded">
                        {airport.iataCode}
                      </span>
                      <div>
                        <div className="font-semibold text-ink text-sm">{airport.name}</div>
                        <div className="text-xs text-ink-3">{airport.city}, {airport.country}</div>
                      </div>
                    </div>
                    {priceDisplay && (
                      <p className="text-brand-gold-dark text-sm font-medium" dir="ltr">{priceDisplay}</p>
                    )}
                    <Link
                      href={`/airports/${airport.slug}/${slug}`}
                      className="inline-flex items-center gap-1 text-sm text-brand-gold-dark hover:text-brand-gold font-medium transition-colors mt-auto"
                    >
                      {tPages('book_cta')} <span className="rtl:rotate-180">→</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-surface border-t border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-ink mb-8">{tPages('faqs_title')}</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="bg-surface-2 border border-line rounded-2xl">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-ink">{faq.question}</span>
                  <span className="text-brand-gold-dark ms-4 flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-ink-2 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
