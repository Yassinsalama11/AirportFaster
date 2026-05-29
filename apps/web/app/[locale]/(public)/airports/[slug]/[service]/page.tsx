import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { localeAlternates, ogLocales } from '@/lib/seo';
import { SchemaScript } from '@/components/public/SchemaScript';
import { BookNowButton } from '@/components/public/BookNowButton';
import { airportSchema, breadcrumbSchema, howToSchema, offerSchema, speakableSchema, webPageSchema } from '@/lib/schema';
import { selectPricingRule, type BookingPricingRule } from '@/lib/booking-pricing';

export const revalidate = 3600;

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  icon?: string;
  translations: ServiceTranslation[];
}

interface AirportServiceRow {
  id: string;
  isActive: boolean;
  service: Service;
  pricingRules?: BookingPricingRule[];
}

interface AirportImage {
  url: string;
  altText?: string | null;
  isPrimary?: boolean;
}

interface Airport {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  status: string;
  translations: AirportTranslation[];
  airportServices: AirportServiceRow[];
  images?: AirportImage[];
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

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

async function getAllPublishedAirports(): Promise<Airport[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/airports`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { success: boolean; data: { airports: Airport[] } };
    return data.success ? data.data.airports : [];
  } catch {
    return [];
  }
}

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams(): Promise<{ slug: string; service: string }[]> {
  const airports = await getAllPublishedAirports();
  const params: { slug: string; service: string }[] = [];
  for (const airport of airports) {
    for (const as of airport.airportServices) {
      if (as.isActive) {
        params.push({ slug: airport.slug, service: as.service.slug });
      }
    }
  }
  return params;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; service: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, service: serviceSlug, locale } = await params;
  setRequestLocale(locale);
  const airport = await getAirport(slug);
  if (!airport) return { title: 'Not Found' };

  const airportName =
    airport.translations.find((t) => t.locale === locale)?.name ??
    airport.translations.find((t) => t.locale === 'en')?.name ??
    airport.city;
  const serviceRow = airport.airportServices.find((as) => as.service.slug === serviceSlug);
  const serviceName =
    serviceRow?.service.translations.find((t) => t.locale === locale)?.name ??
    serviceRow?.service.translations.find((t) => t.locale === 'en')?.name ??
    serviceSlug;

  const tMeta = await getTranslations('airport');
  const title = tMeta('service_meta_title', { service: serviceName, airport: airportName, iata: airport.iataCode });
  const description = tMeta('service_meta_description', { service: serviceName, airport: airportName, iata: airport.iataCode, city: airport.city });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/airports/${slug}/${serviceSlug}`,
      ...ogLocales(locale),
    },
    alternates: localeAlternates(`/airports/${slug}/${serviceSlug}`, locale),
  };
}

// ── Static content ────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Book Online',
    description: 'Complete your booking in minutes with your flight details.',
  },
  {
    step: '02',
    title: 'Meet Your Agent',
    description: 'Your dedicated agent meets you at check-in with a personalised sign.',
  },
  {
    step: '03',
    title: 'Arrive at the Gate',
    description: 'Enjoy priority processing and arrive stress-free at your departure gate.',
  },
];

const STATIC_FAQS = [
  {
    question: 'How far in advance should I book?',
    answer:
      'We recommend booking at least 24–48 hours in advance. For peak travel seasons, booking earlier ensures availability.',
  },
  {
    question: 'What happens if my flight is delayed?',
    answer:
      'Our agents monitor flight times and adjust accordingly. Please contact us if your delay is significant so we can coordinate with the service team.',
  },
  {
    question: 'Can I cancel or modify my booking?',
    answer:
      'Full refunds are available up to 24 hours before the service date. For modifications, please contact support@airportfaster.com as soon as possible.',
  },
  {
    question: 'Is this service available for all airlines?',
    answer:
      'Yes, our services are available for all airlines operating at this airport, regardless of your cabin class or frequent flyer status.',
  },
  {
    question: 'What should I bring?',
    answer:
      'Please bring your booking confirmation (email or QR code), valid travel documents, and your boarding pass or booking reference.',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AirportServicePage({
  params,
}: {
  params: Promise<{ slug: string; service: string; locale: string }>;
}) {
  const { slug, service: serviceSlug, locale } = await params;
  const airport = await getAirport(slug);

  if (!airport || airport.status !== 'active') {
    notFound();
  }

  const serviceRow = airport.airportServices.find(
    (as) => as.isActive && as.service.slug === serviceSlug,
  );

  if (!serviceRow) {
    notFound();
  }

  const airportName =
    airport.translations.find((t) => t.locale === 'en')?.name ?? airport.city;
  const serviceName =
    serviceRow.service.translations.find((t) => t.locale === 'en')?.name ?? serviceSlug;
  const serviceDescription = serviceRow.service.translations.find(
    (t) => t.locale === 'en',
  )?.description;

  // ── Price + image (for structured data) ──────────────────────────────────
  const cheapestRule = selectPricingRule(serviceRow.pricingRules);
  const fromPriceEur =
    cheapestRule?.basePriceMinor != null && cheapestRule.basePriceMinor > 0
      ? cheapestRule.basePriceMinor / 100
      : undefined;
  const primaryImage =
    airport.images?.find((img) => img.isPrimary) ?? airport.images?.[0];
  const primaryImageUrl = primaryImage?.url;

  // ── JSON-LD structured data ───────────────────────────────────────────────

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${serviceName} at ${airportName}`,
    description:
      serviceDescription ??
      `Premium ${serviceName} service at ${airportName} (${airport.iataCode})`,
    provider: {
      '@type': 'Organization',
      name: 'AirportFaster',
      url: BASE_URL,
    },
    areaServed: {
      '@type': 'Airport',
      name: airportName,
      iataCode: airport.iataCode,
      address: {
        '@type': 'PostalAddress',
        addressLocality: airport.city,
        addressCountry: airport.country,
      },
    },
    url: `${BASE_URL}/${locale}/airports/${slug}/${serviceSlug}`,
  };

  return (
    <>
      <SchemaScript schema={serviceJsonLd} />
      <SchemaScript schema={airportSchema({ name: airportName, iataCode: airport.iataCode, city: airport.city, country: airport.country, slug })} />
      <SchemaScript schema={breadcrumbSchema([
        { name: 'Home', url: `${BASE_URL}/${locale}` },
        { name: 'Airports', url: `${BASE_URL}/${locale}/airports` },
        { name: `${airportName} (${airport.iataCode})`, url: `${BASE_URL}/${locale}/airports/${slug}` },
        { name: serviceName, url: `${BASE_URL}/${locale}/airports/${slug}/${serviceSlug}` },
      ])} />
      <SchemaScript schema={howToSchema({
        name: `How to book ${serviceName} at ${airportName}`,
        description: serviceDescription ?? `Premium ${serviceName} service at ${airportName} (${airport.iataCode})`,
        steps: HOW_IT_WORKS.map((s) => ({ name: s.title, text: s.description })),
      })} />
      <SchemaScript schema={offerSchema({
        serviceName,
        airportName,
        iataCode: airport.iataCode,
        slug,
        serviceSlug,
        ...(fromPriceEur != null && { fromPriceEur }),
        ...(primaryImageUrl && { imageUrl: primaryImageUrl }),
        countryCode: airport.country,
        ...(serviceDescription && { description: serviceDescription }),
        locale,
      })} />
      <SchemaScript schema={webPageSchema({
        name: `${serviceName} at ${airportName} (${airport.iataCode})`,
        description: serviceDescription ?? `Book ${serviceName} at ${airportName}. Premium airport assistance with instant confirmation.`,
        url: `${BASE_URL}/${locale}/airports/${slug}/${serviceSlug}`,
        locale,
        ...(primaryImageUrl && { primaryImageUrl }),
        breadcrumb: [
          { name: 'Home', url: `${BASE_URL}/${locale}` },
          { name: 'Airports', url: `${BASE_URL}/${locale}/airports` },
          { name: airportName, url: `${BASE_URL}/${locale}/airports/${slug}` },
          { name: serviceName, url: `${BASE_URL}/${locale}/airports/${slug}/${serviceSlug}` },
        ],
      })} />
      <SchemaScript schema={speakableSchema(['.airport-service-summary', 'h1'])} />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/airports" className="hover:text-ink transition-colors">
            Airports
          </Link>
          <span>/</span>
          <Link href={`/airports/${slug}`} className="hover:text-ink transition-colors">
            {airportName}
          </Link>
          <span>/</span>
          <span className="text-ink">{serviceName}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[36rem] h-[36rem] rounded-full bg-brand-gold/10 blur-3xl opacity-60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="flex items-center gap-3 mb-6">
            <span dir="ltr" className="inline-flex px-3 py-1.5 bg-brand-gold/15 text-brand-gold-dark text-lg font-mono font-bold rounded">
              {airport.iataCode}
            </span>
            <span className="text-ink-3 text-sm">{airportName}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight mb-4">
            {serviceName} at {airportName}
          </h1>
          <p className="airport-service-summary text-ink-2 text-lg max-w-2xl mb-8">
            {serviceDescription ??
              `Experience premium ${serviceName} at ${airportName} (${airport.iataCode}). Skip the queues and travel with confidence.`}
          </p>
          <BookNowButton
            href={`/${locale}/airports/${slug}/book?service=${serviceSlug}`}
            serviceSlug={serviceSlug}
            serviceName={serviceName}
            airportSlug={slug}
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors text-lg"
          >
            Book Now →
          </BookNowButton>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-ink mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((step) => (
            <div
              key={step.step}
              className="bg-surface border border-line rounded-2xl p-6 shadow-card"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/15 text-brand-gold-dark text-sm font-bold mb-4">
                {step.step}
              </span>
              <h3 className="font-semibold text-ink mb-2">{step.title}</h3>
              <p className="text-sm text-ink-2">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Book Now Section */}
      <section className="bg-surface-2 border-y border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-ink mb-2">
            Ready to Book {serviceName}?
          </h2>
          <p className="text-ink-3 mb-8">
            Select your travel date and number of passengers to complete your booking.
          </p>
          <Link
            href={`/airports/${slug}/book?service=${serviceSlug}`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors"
          >
            Book {serviceName} at {airport.iataCode} →
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-surface-2 border-t border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-ink mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {STATIC_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="bg-brand-navy border border-line rounded-xl"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-ink">{faq.question}</span>
                  <span className="text-brand-gold ml-4 flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-ink-3 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
