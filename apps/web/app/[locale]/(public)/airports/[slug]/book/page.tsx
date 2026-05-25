import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { BookingStepIndicator } from '@/components/public/booking/BookingStepIndicator';
import { PassengersStep } from '@/components/public/booking/PassengersStep';
import { BeginCheckoutTracker } from '@/components/public/BeginCheckoutTracker';
import { formatCurrency, selectPricingRule, type BookingPricingRule } from '@/lib/booking-pricing';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface AirportTranslation { locale: string; name: string; }
interface ServiceTranslation { locale: string; name: string; }
interface Service { id: string; slug: string; translations: ServiceTranslation[]; }
interface AirportService {
  id: string;
  isActive: boolean;
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
  airportServices: AirportService[];
}

type BookPageProps = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{
    serviceId?: string;
    service?: string;
    date?: string;
    adults?: string;
    children?: string;
    infants?: string;
  }>;
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

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const airport = await getAirport(slug);
  if (!airport) return { title: 'Book — AirportFaster' };
  const name = getLocalName(airport.translations, locale);
  return {
    title: `Book at ${name} (${airport.iataCode}) — AirportFaster`,
    description: `Complete your booking for premium airport services at ${name}.`,
  };
}

export default async function BookPage({ params, searchParams }: BookPageProps) {
  const { slug, locale } = await params;
  const { serviceId, service, date, adults, children, infants } = await searchParams;

  const prefill = {
    ...(date && { date }),
    ...(adults && { adults: Math.max(1, parseInt(adults, 10) || 1) }),
    ...(children && { children: Math.max(0, parseInt(children, 10) || 0) }),
    ...(infants && { infants: Math.max(0, parseInt(infants, 10) || 0) }),
  };

  const airport = await getAirport(slug);
  if (!airport || airport.status !== 'active') {
    notFound();
  }

  const t = await getTranslations('booking');
  const tCommon = await getTranslations('common');
  const tAirport = await getTranslations('airport');

  const name = getLocalName(airport.translations, locale);
  const selectedService = serviceId
    ? airport.airportServices.find((as) => as.id === serviceId)
    : service
      ? airport.airportServices.find((as) => as.service.slug === service)
      : airport.airportServices.find((as) => as.isActive);
  const selectedAirportServiceId = selectedService?.id;

  const serviceName = selectedService ? getServiceName(selectedService.service, locale) : undefined;
  const firstPrice = selectPricingRule(selectedService?.pricingRules);
  const primaryImage = airport.images?.find((image) => image.isPrimary) ?? airport.images?.[0];
  const fromPriceDisplay = firstPrice?.basePriceMinor != null
    ? formatCurrency(firstPrice.basePriceMinor, firstPrice.currency)
    : undefined;

  return (
    <div className="max-w-6xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-3 mb-8">
        <Link href="/" className="hover:text-ink transition-colors">{tCommon('home')}</Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <Link href="/airports" className="hover:text-ink transition-colors">{tAirport('breadcrumb_airports')}</Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <Link href={`/airports/${slug}`} className="hover:text-ink transition-colors" dir="ltr">
          {airport.iataCode}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <span className="text-ink font-medium">{t('step_details')}</span>
      </nav>

      {/* Step indicator */}
      <div className="mb-10">
        <BookingStepIndicator
          currentStep={1}
          labels={{
            details: t('step_details'),
            review: t('step_review'),
            payment: t('step_payment'),
            confirmation: t('step_confirmation'),
          }}
        />
      </div>

      {/* Form */}
      <BeginCheckoutTracker
        airportSlug={slug}
        {...(selectedService?.service.slug && { serviceSlug: selectedService.service.slug })}
        {...(serviceName && { serviceName })}
        {...(firstPrice?.basePriceMinor != null && { priceMinorUnits: firstPrice.basePriceMinor })}
        currency={firstPrice?.currency ?? 'EUR'}
      />
      <PassengersStep
        slug={slug}
        {...(selectedAirportServiceId !== undefined && { serviceId: selectedAirportServiceId })}
        {...(firstPrice?.passengerPricing != null && { passengerPricing: firstPrice.passengerPricing })}
        {...(selectedService?.pricingRules != null && { pricingRules: selectedService.pricingRules })}
        {...(Object.keys(prefill).length > 0 && { prefill })}
        summary={{
          ...(serviceName && { serviceName }),
          airportName: name,
          iataCode: airport.iataCode,
          city: airport.city,
          country: airport.country,
          ...(fromPriceDisplay && { fromPriceDisplay }),
          ...(primaryImage?.url && { imageUrl: primaryImage.url }),
          ...(primaryImage?.altText && { imageAlt: primaryImage.altText }),
          pricingCurrency: firstPrice?.currency ?? 'EUR',
          imgVariant: 2,
        }}
        labels={{
          sectionPassengers: t('section_passengers'),
          serviceDate: t('service_date'),
          sectionLeadPassenger: t('section_lead_passenger'),
          sectionPassenger: t('section_passenger'),
          sectionContact: t('section_contact'),
          sectionFlight: t('section_flight'),
          sectionFlightHelp: t('section_flight_help'),
          sectionExperience: t('section_experience'),
          sectionExperienceHelp: t('section_experience_help'),
          includedTravelers: t('included_travelers'),
          extraTraveler: t('extra_traveler'),
          selectedOption: t('selected_option'),
          sectionSpecial: t('special_requests'),
          firstName: t('first_name'),
          lastName: t('last_name'),
          email: t('email'),
          phone: t('phone'),
          passengerType: t('passenger_type'),
          adult: t('adult'),
          child: t('child'),
          infant: t('infant'),
          passport: t('passport'),
          nationality: t('nationality'),
          direction: t('direction'),
          selectDirection: t('select_direction'),
          arrival: t('arrival'),
          departure: t('departure'),
          flightNumber: t('flight_number'),
          dateTime: t('date_time'),
          terminal: t('terminal'),
          originDest: t('origin_dest'),
          specialPlaceholder: t('special_placeholder'),
          optional: tCommon('optional'),
          continueButton: t('continue_to_review'),
          summaryTitle: t('summary'),
          summaryService: t('service'),
          summaryAirport: t('airport'),
          summaryFrom: tCommon('from'),
          trustSecure: t('secure_payment'),
          trustCancel: t('refund_policy'),
          trustSupport: t('support_24_7'),
          errorRequired: tCommon('error_required'),
          errorEmail: tCommon('error_email'),
          errorServiceRequired: t('error_service_required'),
          errorPricingRequired: t('error_pricing_required'),
        }}
      />
    </div>
  );
}
