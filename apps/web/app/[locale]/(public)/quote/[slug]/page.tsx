import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { QuoteRequestForm } from '@/components/public/booking/QuoteRequestForm';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface AirportTranslation { locale: string; name: string; }
interface ServiceTranslation { locale: string; name: string; }
interface AirportService {
  id: string;
  isActive: boolean;
  service: { id: string; slug: string; translations: ServiceTranslation[] };
}
interface Airport {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  status: string;
  translations: AirportTranslation[];
  airportServices: AirportService[];
}

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ service?: string; date?: string; passengers?: string }>;
};

async function getAirport(slug: string): Promise<Airport | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/airports/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; data: { airport: Airport } };
    return data.success ? data.data.airport : null;
  } catch {
    return null;
  }
}

function getLocalName(translations: { locale: string; name: string }[], locale: string, fallback: string) {
  return (
    translations.find((t) => t.locale === locale)?.name ??
    translations.find((t) => t.locale === 'en')?.name ??
    fallback
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const airport = await getAirport(slug);
  if (!airport) return { title: 'Request Quote — AirportFaster' };
  const name = getLocalName(airport.translations, locale, airport.city);
  return {
    title: `Request a quote — ${name} (${airport.iataCode}) | AirportFaster`,
    description: `Tell us about your trip and our concierge team will reply within 24 hours with a tailored price for ${name}.`,
  };
}

export default async function QuotePage({ params, searchParams }: Props) {
  const { slug, locale } = await params;
  const sp = await searchParams;

  const airport = await getAirport(slug);
  if (!airport || airport.status !== 'active') notFound();

  const name = getLocalName(airport.translations, locale, airport.city);
  const activeServices = airport.airportServices
    .filter((as) => as.isActive)
    .map((as) => ({
      slug: as.service.slug,
      name: getLocalName(as.service.translations, locale, as.service.slug),
    }));

  const presetService = sp.service && activeServices.find((s) => s.slug === sp.service)?.slug;

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-3 mb-6">
        <Link href="/" className="hover:text-ink transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <Link href="/airports" className="hover:text-ink transition-colors">Airports</Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <Link href={`/airports/${slug}`} className="hover:text-ink transition-colors" dir="ltr">
          {airport.iataCode}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <span className="text-ink font-medium">Request quote</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-gold-dark mb-2">
          Personal Quote
        </p>
        <h1 className="text-3xl lg:text-4xl font-bold text-ink tracking-tight mb-3">
          Request a quote — {name} ({airport.iataCode})
        </h1>
        <p className="text-body-md text-ink-2 max-w-2xl leading-relaxed">
          Share a few details about your trip and our customer service team will get back to you
          with a <strong className="text-ink">tailored price within minutes</strong>. No payment is
          taken at this stage — we simply confirm availability and price first.
        </p>
      </header>

      <QuoteRequestForm
        airportSlug={slug}
        airportName={name}
        iataCode={airport.iataCode}
        services={activeServices}
        {...(presetService && { presetService })}
        {...(sp.date && { presetDate: sp.date })}
        {...(sp.passengers && { presetPassengers: sp.passengers })}
      />
    </div>
  );
}
