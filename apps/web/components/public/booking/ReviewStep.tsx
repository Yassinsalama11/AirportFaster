'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import type { BookingFormData } from './PassengersStep';

const API_BASE = '/api/public';

interface PricingRule {
  basePriceMinor: number | null;
  currency: string;
  passengerPricing?: Record<string, number> | null;
}

interface ReviewStepProps {
  slug: string;
  airportName: string;
  iataCode: string;
  city: string;
  country: string;
  serviceId?: string;
  serviceName?: string;
  pricingRules?: PricingRule[];
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
}

function formatDateTime(dt: string): string {
  if (!dt) return '';
  try {
    return new Date(dt).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

function formatCurrency(amount: number, _currency: string): string {
  // Platform-wide: always show Euros regardless of the per-record currency.
  return `€${amount.toFixed(2)}`;
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getApiErrorMessage(data: CreateBookingResponse): string {
  if (data.message) return data.message;
  if (typeof data.error === 'string') return data.error;
  if (data.error?.message) return data.error.message;
  return 'Booking failed. Please try again.';
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
  serviceId,
  serviceName,
  pricingRules,
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
    const stored = sessionStorage.getItem('airportfaster_booking_form');
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
    let cancelled = false;

    async function ensureDraftBooking() {
      setDraftLoading(true);
      setError(null);

      const storedDraft = sessionStorage.getItem('airportfaster_draft_booking');
      if (storedDraft) {
        try {
          const parsed = JSON.parse(storedDraft) as DraftBookingSession;
          if (parsed.bookingId && parsed.serviceId === currentServiceId) {
            if (!cancelled) setDraftBooking(parsed);
            if (!cancelled) setDraftLoading(false);
            return;
          }
        } catch {
          sessionStorage.removeItem('airportfaster_draft_booking');
        }
      }

      try {
        if (!currentForm.serviceDate) {
          throw new Error('Please go back and choose a service date.');
        }

        const flightDirection = currentForm.flight.direction || 'departure';
        const iata = currentForm.flight.originDestIata.trim().toUpperCase();
        const shouldSendFlight =
          currentForm.flight.direction !== '' &&
          currentForm.flight.flightNumber.trim() !== '' &&
          currentForm.flight.dateTime.trim() !== '';

        const payload = {
          airportServiceId: currentServiceId,
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
          throw new Error(getApiErrorMessage(data));
        }

        const bookingId = data.data?.bookingId;
        if (!bookingId) {
          throw new Error('Booking created but ID missing. Please contact support.');
        }

        const draft: DraftBookingSession = {
          bookingId,
          bookingReference: data.data?.bookingReference ?? 'PENDING',
          currency: data.data?.currency ?? 'EUR',
          serviceId: currentServiceId,
        };

        if (data.data?.manageToken) {
          sessionStorage.setItem('airportfaster_manage_token', data.data.manageToken);
        }
        sessionStorage.setItem('airportfaster_draft_booking', JSON.stringify(draft));
        if (!cancelled) setDraftBooking(draft);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
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

  // Price calculation
  const baseRule = pricingRules && pricingRules.length > 0
    ? [...pricingRules].sort((a, b) => (a.basePriceMinor ?? 0) - (b.basePriceMinor ?? 0))[0]
    : null;

  const currency = baseRule?.currency ?? 'EUR';
  const pp = baseRule?.passengerPricing;
  const hasPerType = pp != null && ('adult' in pp || 'child' in pp || 'infant' in pp);

  interface PassengerBreakdownLine {
    label: string;
    count: number;
    unitPrice: number;
    lineTotal: number;
  }
  let subtotal = 0;
  let perTypeBreakdown: PassengerBreakdownLine[] = [];

  if (hasPerType && pp != null) {
    const adultPriceMinor = pp['adult'] ?? baseRule?.basePriceMinor ?? 0;
    const childPriceMinor = pp['child'] != null ? pp['child'] : adultPriceMinor;
    const infantPriceMinor = pp['infant'] != null ? pp['infant'] : adultPriceMinor;
    const counts = { adult: 0, child: 0, infant: 0 };
    form.passengers.forEach((p) => {
      if (p.type === 'adult') counts.adult++;
      else if (p.type === 'child') counts.child++;
      else if (p.type === 'infant') counts.infant++;
    });
    const lines: PassengerBreakdownLine[] = [];
    if (counts.adult > 0) {
      const lineTotal = (adultPriceMinor / 100) * counts.adult;
      subtotal += lineTotal;
      lines.push({ label: 'Adult', count: counts.adult, unitPrice: adultPriceMinor / 100, lineTotal });
    }
    if (counts.child > 0) {
      const lineTotal = (childPriceMinor / 100) * counts.child;
      subtotal += lineTotal;
      lines.push({ label: 'Child', count: counts.child, unitPrice: childPriceMinor / 100, lineTotal });
    }
    if (counts.infant > 0) {
      const lineTotal = (infantPriceMinor / 100) * counts.infant;
      subtotal += lineTotal;
      lines.push({ label: 'Infant', count: counts.infant, unitPrice: infantPriceMinor / 100, lineTotal });
    }
    perTypeBreakdown = lines;
  } else {
    const basePrice = (baseRule?.basePriceMinor ?? 0) / 100;
    subtotal = basePrice * form.passengerCount;
  }

  const serviceFee = subtotal > 0 ? parseFloat((subtotal * 0.05).toFixed(2)) : 0;
  const total = subtotal + serviceFee;

  async function handleConfirm() {
    if (!form) return;
    setLoading(true);
    setError(null);

    try {
      if (!serviceId) {
        throw new Error('Please choose a service before confirming your booking.');
      }
      if (!draftBooking) {
        throw new Error('Your draft booking is still being prepared. Please try again.');
      }
      sessionStorage.removeItem('airportfaster_booking_form');
      sessionStorage.removeItem('airportfaster_booking_serviceId');

      router.push(
        `/${locale}/book/${draftBooking.bookingId}/payment?currency=${encodeURIComponent(draftBooking.currency)}&ref=${encodeURIComponent(draftBooking.bookingReference)}`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
    }
  }

  const passengerTypeLabel: Record<string, string> = {
    adult: 'Adult',
    child: 'Child',
    infant: 'Infant',
  };

  return (
    <div className="space-y-6">
      {/* Service + Airport */}
      <section className="bg-surface border border-line rounded-2xl p-6">
        <SectionTitle>Service &amp; Airport</SectionTitle>
        <Row label="Airport" value={`${airportName} (${iataCode})`} />
        <Row label="Location" value={`${city}, ${country}`} />
        {serviceName && <Row label="Service" value={serviceName} />}
      </section>

      {/* Passengers */}
      <section className="bg-surface border border-line rounded-2xl p-6">
        <SectionTitle>Passengers ({form.passengerCount})</SectionTitle>
        {form.passengers.map((p, i) => (
          <Row
            key={i}
            label={`Passenger ${i + 1}`}
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
        <SectionTitle>Contact Details</SectionTitle>
        <Row label="Name" value={`${form.contact.firstName} ${form.contact.lastName}`} />
        <Row label="Email" value={form.contact.email} />
        <Row label="Phone" value={form.contact.phone} />
      </section>

      {/* Flight info */}
      {form.flight.direction && (
        <section className="bg-surface border border-line rounded-2xl p-6">
          <SectionTitle>Flight Details</SectionTitle>
          {form.flight.direction && (
            <Row label="Direction" value={form.flight.direction.charAt(0).toUpperCase() + form.flight.direction.slice(1)} />
          )}
          {form.flight.flightNumber && <Row label="Flight" value={form.flight.flightNumber} />}
          {form.flight.dateTime && <Row label="Date &amp; Time" value={formatDateTime(form.flight.dateTime)} />}
          {form.flight.terminal && <Row label="Terminal" value={form.flight.terminal} />}
          {form.flight.originDestIata && <Row label="Origin/Dest" value={form.flight.originDestIata} />}
        </section>
      )}

      {/* Special requests */}
      {form.specialRequests && (
        <section className="bg-surface border border-line rounded-2xl p-6">
          <SectionTitle>Special Requests</SectionTitle>
          <p className="text-sm text-ink-2">{form.specialRequests}</p>
        </section>
      )}

      {/* Price breakdown */}
      <section className="bg-surface border border-line rounded-2xl p-6">
        <SectionTitle>Price Summary</SectionTitle>
        {subtotal > 0 ? (
          <div className="space-y-0">
            {hasPerType ? (
              perTypeBreakdown.map((line) => (
                <Row
                  key={line.label}
                  label={
                    line.unitPrice === 0
                      ? `${line.label} × ${line.count} (Free)`
                      : `${line.label} × ${line.count} (${formatCurrency(line.unitPrice, currency)} each)`
                  }
                  value={line.unitPrice === 0 ? 'Free' : formatCurrency(line.lineTotal, currency)}
                />
              ))
            ) : (
              <Row
                label={`Base price × ${form.passengerCount} passenger${form.passengerCount !== 1 ? 's' : ''}`}
                value={formatCurrency(subtotal, currency)}
              />
            )}
            <Row label="Service fee (5%)" value={formatCurrency(serviceFee, currency)} />
            <div className="flex items-center justify-between pt-3 mt-1">
              <span className="text-base font-bold text-ink">Total</span>
              <span className="text-xl font-bold text-brand-gold">{formatCurrency(total, currency)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-3">Pricing will be confirmed after booking.</p>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Link
          href={`/${locale}/airports/${slug}/book${serviceId ? `?serviceId=${serviceId}` : ''}`}
          className="inline-flex items-center gap-2 text-sm text-ink-3 hover:text-ink transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Details
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
              Processing…
            </>
          ) : (
            <>
              Confirm &amp; Pay
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
