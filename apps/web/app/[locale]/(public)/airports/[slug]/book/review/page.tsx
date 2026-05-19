import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { BookingStepIndicator } from '@/components/public/booking/BookingStepIndicator';
import { ReviewStep } from '@/components/public/booking/ReviewStep';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface AirportTranslation { locale: string; name: string; }
interface ServiceTranslation { locale: string; name: string; }
interface PricingRule { basePriceMinor: number | null; currency: string; passengerPricing?: Record<string, number> | null; }
interface Service { id: string; slug: string; translations: ServiceTranslation[]; }
interface AirportService {
  id: string;
  isActive: boolean;
  service: Service;
  pricingRules?: PricingRule[];
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

type ReviewPageProps = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ serviceId?: string; service?: string }>;
};

async function getAirport(slug: string): Promise<Airport | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/airports/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; data: { airport: Airport } };
    return data.success ? data.data.airport : null;
  } catch {
    return null;
  }
}

function getLocalName(translations: AirportTranslation[], locale: string) {
  return translations.find((t) => t.locale === locale)?.name
    ?? translations.find((t) => t.locale === 'en')?.name
    ?? 'Airport';
}

function getServiceName(service: Service, locale: string) {
  return service.translations.find((t) => t.locale === locale)?.name
    ?? service.translations.find((t) => t.locale === 'en')?.name
    ?? service.slug;
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const airport = await getAirport(slug);
  if (!airport) return { title: 'Review Booking — AirportFaster' };
  const name = getLocalName(airport.translations, locale);
  return { title: `Review Booking — ${name} (${airport.iataCode}) — AirportFaster` };
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { slug, locale } = await params;
  const { serviceId, service } = await searchParams;

  const airport = await getAirport(slug);
  if (!airport || airport.status !== 'active') {
    notFound();
  }

  const t = await getTranslations('booking');
  const tCommon = await getTranslations('common');

  const name = getLocalName(airport.translations, locale);
  const selectedService = serviceId
    ? airport.airportServices.find((as) => as.id === serviceId)
    : service
      ? airport.airportServices.find((as) => as.service.slug === service)
      : airport.airportServices.find((as) => as.isActive);
  const selectedAirportServiceId = selectedService?.id;

  return (
    <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-3 mb-8">
        <Link href="/" className="hover:text-ink transition-colors">{tCommon('home')}</Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <Link href={`/airports/${slug}`} className="hover:text-ink transition-colors" dir="ltr">
          {airport.iataCode}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <Link
          href={`/airports/${slug}/book${selectedAirportServiceId ? `?serviceId=${selectedAirportServiceId}` : ''}`}
          className="hover:text-ink transition-colors"
        >
          {t('step_details')}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <span className="text-ink font-medium">{t('step_review')}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-ink tracking-tight mb-2">
          {t('page_review_title')}
        </h1>
        <p className="text-ink-2">
          {name} (<span dir="ltr">{airport.iataCode}</span>) · {airport.city}, {airport.country}
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-10">
        <BookingStepIndicator
          currentStep={2}
          labels={{
            details: t('step_details'),
            review: t('step_review'),
            payment: t('step_payment'),
            confirmation: t('step_confirmation'),
          }}
        />
      </div>

      {/* Review content */}
      <ReviewStep
        slug={slug}
        airportName={name}
        iataCode={airport.iataCode}
        city={airport.city}
        country={airport.country}
        {...(selectedAirportServiceId !== undefined && { serviceId: selectedAirportServiceId })}
        {...(selectedService != null && { serviceName: getServiceName(selectedService.service, locale) })}
        {...(selectedService?.pricingRules != null && { pricingRules: selectedService.pricingRules })}
      />
    </div>
  );
}
