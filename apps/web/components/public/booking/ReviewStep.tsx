'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import type { BookingFormData } from './PassengersStep';
import {
  calculatePriceMinor,
  formatCurrency,
  getPassengerCounts,
  getPricingRuleDisplayName,
  selectPricingRule,
  type BookingPricingRule,
} from '@/lib/booking-pricing';

const API_BASE = '/api/public';
const BOOKING_FORM_KEY = 'airportfaster_booking_form';
const BOOKING_SERVICE_KEY = 'airportfaster_booking_serviceId';
const DRAFT_BOOKING_KEY = 'airportfaster_draft_booking';
const MANAGE_TOKEN_KEY = 'airportfaster_manage_token';

interface ReviewStepProps {
  slug: string;
  airportName: string;
  iataCode: string;
  city: string;
  country: string;
  airportTimezone: string;
  serviceId?: string;
  serviceName?: string;
  pricingRules?: BookingPricingRule[];
  labels: ReviewStepLabels;
}

export interface ReviewStepLabels {
  serviceAirport: string;
  airport: string;
  location: string;
  service: string;
  category: string;
  passengers: string;
  passenger: string;
  contactDetails: string;
  name: string;
  email: string;
  phone: string;
  flightDetails: string;
  direction: string;
  arrival: string;
  departure: string;
  flight: string;
  dateTime: string;
  terminal: string;
  originDest: string;
  specialRequests: string;
  priceSummary: string;
  total: string;
  pricingTbc: string;
  backToDetails: string;
  confirmAndPay: string;
  processing: string;
  adult: string;
  child: string;
  infant: string;
  errorBookingFailed: string;
  errorUnexpected: string;
  errorServiceRequired: string;
  errorDraftPreparing: string;
  errorChooseDate: string;
  errorChooseDirection: string;
  errorMissingId: string;
}

interface CreateBookingResponse {
  success: boolean;
  data?: {
    bookingId?: string;
    bookingReference?: string;
    manageToken?: string;
    totalMinorUnits?: number;
    currency?: string;
  };
  error?: string | { code?: string; message?: string; details?: unknown };
  message?: string;
}

interface DraftBookingSession {
  bookingId: string;
  bookingReference: string;
  currency: string;
  serviceId: string;
  fingerprint: string;
  totalMinorUnits: number;
}

function formatDateTime(dt: string, locale: string, timeZone: string): string {
  if (!dt) return '';
  try {
    return new Date(dt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    });
  } catch {
    return dt;
  }
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore unavailable sessionStorage; the booking can still proceed.
  }
}

function safeSessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore unavailable sessionStorage.
  }
}

function buildDraftFingerprint(form: BookingFormData, serviceId: string): string {
  return JSON.stringify({
    serviceId,
    pricingRuleId: form.selectedPricingRuleId ?? null,
    serviceDate: form.serviceDate,
    passengers: form.passengers.map((passenger) => ({
      firstName: passenger.firstName.trim(),
      lastName: passenger.lastName.trim(),
      type: passenger.type,
      passportNumber: passenger.passportNumber.trim(),
      nationality: passenger.nationality.trim().toUpperCase(),
    })),
    contact: {
      email: form.contact.email.trim().toLowerCase(),
      phone: form.contact.phone.trim(),
      firstName: form.contact.firstName.trim(),
      lastName: form.contact.lastName.trim(),
    },
    flight: {
      direction: form.flight.direction,
      flightNumber: form.flight.flightNumber.trim().toUpperCase(),
      dateTime: form.flight.dateTime.trim(),
      terminal: form.flight.terminal.trim(),
      originDestIata: form.flight.originDestIata.trim().toUpperCase(),
    },
    specialRequests: form.specialRequests.trim(),
  });
}

function getApiErrorMessage(data: CreateBookingResponse, fallback: string): string {
  if (data.message) return data.message;
  if (typeof data.error === 'string') return data.error;
  if (data.error?.message) return data.error.message;
  return fallback;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-brand-gold-dark uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-line last:border-0">
      <span className="text-sm text-ink-3 flex-shrink-0">{label}</span>
      <span className="text-sm text-ink text-right">{value}</span>
    </div>
  );
}

export function ReviewStep({
  slug,
  airportName,
  iataCode,
  city,
  country,
  airportTimezone,
  serviceId,
  serviceName,
  pricingRules,
  labels,
}: ReviewStepProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.['locale'] as string | undefined) ?? 'en';
  const [form, setForm] = useState<BookingFormData | null>(null);
  const [draftBooking, setDraftBooking] = useState<DraftBookingSession | null>(null);
  const [draftLoading, setDraftLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = safeSessionGet(BOOKING_FORM_KEY);
    if (!stored) {
      // No form data — redirect back to details
      router.replace(`/${locale}/airports/${slug}/book${serviceId ? `?serviceId=${serviceId}` : ''}`);
      return;
    }
    try {
      setForm(JSON.parse(stored) as BookingFormData);
    } catch {
      router.replace(`/${locale}/airports/${slug}/book${serviceId ? `?serviceId=${serviceId}` : ''}`);
    }
  }, [slug, locale, serviceId, router]);

  useEffect(() => {
    if (!form || !serviceId) {
      setDraftLoading(false);
      return;
    }

    const currentForm = form;
    const currentServiceId = serviceId;
    const currentFingerprint = buildDraftFingerprint(currentForm, currentServiceId);
    let cancelled = false;

    async function ensureDraftBooking() {
      setDraftLoading(true);
      setError(null);

      const storedDraft = safeSessionGet(DRAFT_BOOKING_KEY);
      if (storedDraft) {
        try {
          const parsed = JSON.parse(storedDraft) as DraftBookingSession;
          if (
            parsed.bookingId &&
            parsed.serviceId === currentServiceId &&
            parsed.fingerprint === currentFingerprint &&
            typeof parsed.totalMinorUnits === 'number'
          ) {
            if (!cancelled) setDraftBooking(parsed);
            if (!cancelled) setDraftLoading(false);
            return;
          }
          safeSessionRemove(DRAFT_BOOKING_KEY);
        } catch {
          safeSessionRemove(DRAFT_BOOKING_KEY);
        }
      }

      try {
        if (!currentForm.serviceDate) {
          throw new Error(labels.errorChooseDate);
        }

        if (!currentForm.flight.direction) {
          throw new Error(labels.errorChooseDirection);
        }

        const flightDirection = currentForm.flight.direction;
        const iata = currentForm.flight.originDestIata.trim().toUpperCase();
        const shouldSendFlight =
          currentForm.flight.flightNumber.trim() !== '' &&
          currentForm.flight.dateTime.trim() !== '';

        const payload = {
          airportServiceId: currentServiceId,
          ...(currentForm.selectedPricingRuleId && { pricingRuleId: currentForm.selectedPricingRuleId }),
          serviceDate: currentForm.serviceDate,
          direction: flightDirection,
          passengers: currentForm.passengers.map((passenger) => {
            const passportNumber = trimOrUndefined(passenger.passportNumber);
            const nationality = passenger.nationality.trim().toUpperCase();
            return {
              firstName: passenger.firstName.trim(),
              lastName: passenger.lastName.trim(),
              type: passenger.type,
              ...(passportNumber !== undefined && { passportNumber }),
              ...(/^[A-Z]{2}$/.test(nationality) && { nationality }),
            };
          }),
          contact: {
            email: currentForm.contact.email.trim(),
            phone: currentForm.contact.phone.trim(),
            firstName: currentForm.contact.firstName.trim(),
            lastName: currentForm.contact.lastName.trim(),
          },
          ...(shouldSendFlight && {
            flight: {
              direction: currentForm.flight.direction,
              flightNumber: currentForm.flight.flightNumber.trim().toUpperCase(),
              scheduledAt: new Date(currentForm.flight.dateTime).toISOString(),
              ...(trimOrUndefined(currentForm.flight.terminal) !== undefined && {
                terminal: trimOrUndefined(currentForm.flight.terminal),
              }),
              ...(iata.length === 3 &&
                (currentForm.flight.direction === 'arrival'
                  ? { origin: iata }
                  : { destination: iata })),
            },
          }),
          ...(trimOrUndefined(currentForm.specialRequests) !== undefined && {
            specialRequests: trimOrUndefined(currentForm.specialRequests),
          }),
          locale,
        };

        const res = await fetch(`${API_BASE}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = (await res.json()) as CreateBookingResponse;
        if (!res.ok || !data.success) {
          throw new Error(getApiErrorMessage(data, labels.errorBookingFailed));
        }

        const bookingId = data.data?.bookingId;
        if (!bookingId) {
          throw new Error(labels.errorMissingId);
        }

        const draft: DraftBookingSession = {
          bookingId,
          bookingReference: data.data?.bookingReference ?? 'PENDING',
          currency: data.data?.currency ?? 'EUR',
          serviceId: currentServiceId,
          fingerprint: currentFingerprint,
          totalMinorUnits: data.data?.totalMinorUnits ?? 0,
        };

        if (data.data?.manageToken) {
          safeSessionSet(MANAGE_TOKEN_KEY, data.data.manageToken);
        }
        safeSessionSet(DRAFT_BOOKING_KEY, JSON.stringify(draft));
        if (!cancelled) setDraftBooking(draft);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : labels.errorUnexpected);
        }
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    }

    void ensureDraftBooking();

    return () => {
      cancelled = true;
    };
  }, [form, serviceId, locale]);

  if (!form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  const baseRule = selectPricingRule(pricingRules, form.flight.direction, form.selectedPricingRuleId);
  const currency = draftBooking?.currency ?? baseRule?.currency ?? 'EUR';
  const pricingOptionName = getPricingRuleDisplayName(baseRule, serviceName);
  const passengerCounts = getPassengerCounts(form.passengers);
  const subtotalMinor = calculatePriceMinor(baseRule, passengerCounts);
  const totalMinor = draftBooking?.totalMinorUnits ?? subtotalMinor;

  async function handleConfirm() {
    if (!form) return;
    setLoading(true);
    setError(null);

    try {
      if (!serviceId) {
        throw new Error(labels.errorServiceRequired);
      }
      if (!draftBooking) {
        throw new Error(labels.errorDraftPreparing);
      }
      safeSessionRemove(BOOKING_FORM_KEY);
      safeSessionRemove(BOOKING_SERVICE_KEY);
      safeSessionRemove(DRAFT_BOOKING_KEY);

      router.push(
        `/${locale}/book/${draftBooking.bookingId}/payment?currency=${encodeURIComponent(draftBooking.currency)}&ref=${encodeURIComponent(draftBooking.bookingReference)}`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : labels.errorUnexpected);
      setLoading(false);
    }
  }

  const passengerTypeLabel: Record<string, string> = {
    adult: labels.adult,
    child: labels.child,
    infant: labels.infant,
  };

  return (
    <div className="space-y-6">
      {/* Service + Airport */}
      <section className="bg-surface border border-line rounded-2xl p-6">
        <SectionTitle>{labels.serviceAirport}</SectionTitle>
        <Row label={labels.airport} value={`${airportName} (${iataCode})`} />
        <Row label={labels.location} value={`${city}, ${country}`} />
        {serviceName && <Row label={labels.service} value={serviceName} />}
        {baseRule && <Row label={labels.category} value={pricingOptionName} />}
      </section>

      {/* Passengers */}
      <section className="bg-surface border border-line rounded-2xl p-6">
        <SectionTitle>{labels.passengers} ({form.passengerCount})</SectionTitle>
        {form.passengers.map((p, i) => (
          <Row
            key={i}
            label={`${labels.passenger} ${i + 1}`}
            value={
              <span>
                {p.firstName} {p.lastName}{' '}
                <span className="text-ink-3 text-xs">
                  ({passengerTypeLabel[p.type] ?? p.type})
                </span>
              </span>
            }
          />
        ))}
      </section>

      {/* Contact */}
      <section className="bg-surface border border-line rounded-2xl p-6">
        <SectionTitle>{labels.contactDetails}</SectionTitle>
        <Row label={labels.name} value={`${form.contact.firstName} ${form.contact.lastName}`} />
        <Row label={labels.email} value={form.contact.email} />
        <Row label={labels.phone} value={form.contact.phone} />
      </section>

      {/* Flight info */}
      {form.flight.direction && (
        <section className="bg-surface border border-line rounded-2xl p-6">
          <SectionTitle>{labels.flightDetails}</SectionTitle>
          {form.flight.direction && (
            <Row
              label={labels.direction}
              value={form.flight.direction === 'arrival' ? labels.arrival : labels.departure}
            />
          )}
          {form.flight.flightNumber && <Row label={labels.flight} value={form.flight.flightNumber} />}
          {form.flight.dateTime && (
            <Row label={labels.dateTime} value={formatDateTime(form.flight.dateTime, locale, airportTimezone)} />
          )}
          {form.flight.terminal && <Row label={labels.terminal} value={form.flight.terminal} />}
          {form.flight.originDestIata && <Row label={labels.originDest} value={form.flight.originDestIata} />}
        </section>
      )}

      {/* Special requests */}
      {form.specialRequests && (
        <section className="bg-surface border border-line rounded-2xl p-6">
        <SectionTitle>{labels.specialRequests}</SectionTitle>
        <p className="text-sm text-ink-2">{form.specialRequests}</p>
      </section>
      )}

      {/* Price breakdown */}
      <section className="bg-surface border border-line rounded-2xl p-6">
        <SectionTitle>{labels.priceSummary}</SectionTitle>
        {subtotalMinor > 0 ? (
          <div className="space-y-0">
            <Row
              label={pricingOptionName}
              value={formatCurrency(subtotalMinor, currency)}
            />
            <div className="flex items-center justify-between pt-3 mt-1">
              <span className="text-base font-bold text-ink">{labels.total}</span>
              <span className="text-xl font-bold text-brand-gold">{formatCurrency(totalMinor, currency)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-3">{labels.pricingTbc}</p>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* WhatsApp helper — quick lane to customer service before paying */}
      <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-4 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
        <div className="flex items-center gap-3 flex-1">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] text-white shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/>
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Need help with your booking?</p>
            <p className="text-xs text-ink-2 mt-0.5">Chat with our concierge team on WhatsApp — we usually reply in minutes.</p>
          </div>
        </div>
        <a
          href={`https://wa.me/441748220006?text=${encodeURIComponent(
            `Hello, I'm reviewing a booking on AirportFaster for ${airportName} (${iataCode})${serviceName ? ` — ${serviceName}` : ''}${form?.serviceDate ? ` on ${form.serviceDate}` : ''}. I have a question before paying.`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1eb95c] text-white font-semibold rounded-xl text-sm shadow-sm transition-colors whitespace-nowrap"
        >
          Chat on WhatsApp
        </a>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Link
          href={`/${locale}/airports/${slug}/book${serviceId ? `?serviceId=${serviceId}` : ''}`}
          className="inline-flex items-center gap-2 text-sm text-ink-3 hover:text-ink transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {labels.backToDetails}
        </Link>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading || draftLoading || !draftBooking}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[160px] justify-center"
        >
          {loading || draftLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-brand-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {labels.processing}
            </>
          ) : (
            <>
              {labels.confirmAndPay}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
