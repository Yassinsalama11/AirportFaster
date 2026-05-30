import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { StripePaymentForm } from '@/components/public/booking/StripePaymentForm';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const metadata: Metadata = { title: 'Complete Payment — AirportFaster' };

type PaymentPageProps = {
  params: Promise<{ bookingId: string; locale: string }>;
  searchParams: Promise<{ currency?: string; ref?: string }>;
};

interface CreateIntentResponse {
  success: boolean;
  data?: {
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  };
  error?: { code: string; message: string };
}

interface AirportTranslation { locale: string; name: string; }
interface ServiceTranslation { locale: string; name: string; }

interface BookingSummary {
  id: string;
  reference: string;
  status: string;
  direction: string;
  currency: string;
  totalMinor: number;
  serviceDateTime: string;
  passengerCount: number;
  airport: {
    iataCode: string;
    city: string;
    country: string;
    translations: AirportTranslation[];
  };
  service: { slug: string; translations: ServiceTranslation[] };
  flight: { flightNumber: string; terminal: string | null; scheduledTime: string | null } | null;
}

async function createPaymentIntent(bookingId: string, currency: string) {
  try {
    const res = await fetch(`${API_BASE}/api/public/payments/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, currency }),
      cache: 'no-store',
    });
    const data = (await res.json()) as CreateIntentResponse;
    if (!res.ok || !data.success) {
      const code = data.error?.['code'] ?? '';
      if (res.status === 404 || code === 'BOOKING_NOT_FOUND' || code === 'INVALID_BOOKING_STATUS') {
        return { redirect: true as const };
      }
      return { error: data.error?.['message'] ?? 'Unable to initialise payment.' };
    }
    return { intent: data.data };
  } catch {
    return { error: 'Unable to connect to payment service.' };
  }
}

async function getBookingSummary(bookingId: string): Promise<BookingSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/bookings/${bookingId}/summary`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; data?: { booking: BookingSummary } };
    return data.success ? data.data?.booking ?? null : null;
  } catch {
    return null;
  }
}

function getLocalName<T extends { locale: string; name: string }>(translations: T[], locale: string): string {
  return translations.find((t) => t.locale === locale)?.name ?? translations.find((t) => t.locale === 'en')?.name ?? '';
}

export default async function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const { bookingId, locale } = await params;
  const { currency = 'EUR', ref } = await searchParams;

  const [intentResult, summary] = await Promise.all([
    createPaymentIntent(bookingId, currency),
    getBookingSummary(bookingId),
  ]);

  if ('redirect' in intentResult && intentResult.redirect) {
    redirect(`/${locale}/book/${bookingId}/confirmation`);
  }

  if ('error' in intentResult && intentResult.error) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D6] p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-[#111] mb-2">Payment error</h1>
          <p className="text-sm text-[#555] mb-6">{intentResult.error}</p>
          <a
            href={`/${locale}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-[#111] text-white rounded-xl text-sm font-medium hover:bg-[#222] transition-colors"
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }

  const intent = intentResult.intent;
  if (!intent) redirect('/');

  const bookingReference = ref ?? summary?.reference ?? bookingId;
  const t = await getTranslations('booking');

  const airportName = summary ? getLocalName(summary.airport.translations, locale) || summary.airport.city : '';
  const serviceName = summary ? getLocalName(summary.service.translations, locale) || summary.service.slug : '';
  const serviceDate = summary
    ? new Date(summary.serviceDateTime).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const serviceTime = summary
    ? new Date(summary.serviceDateTime).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Stepper */}
        <div className="mb-8 lg:mb-12">
          <Stepper currentStep={3} labels={{
            details: t('step_details'),
            review: t('step_review'),
            payment: t('step_payment'),
            confirmation: t('step_confirmation'),
          }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-10">
          {/* LEFT: Payment form */}
          <div>
            <header className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-semibold text-[#111] tracking-tight">
                Complete your payment
              </h1>
              <p className="text-sm text-[#555] mt-1">
                Reference{' '}
                <span className="font-mono text-[#111] font-medium">{bookingReference}</span>
              </p>
            </header>

            <StripePaymentForm
              clientSecret={intent.clientSecret}
              bookingId={bookingId}
              bookingReference={bookingReference}
              currency={intent.currency}
              amountMinorUnits={intent.amount}
              locale={locale}
            />
          </div>

          {/* RIGHT: Booking summary */}
          <aside className="order-first lg:order-last">
            <div className="bg-white border border-[#E8E2D6] rounded-2xl shadow-sm overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-[#F0EAD8]">
                <p className="text-xs font-semibold text-[#888] uppercase tracking-wider">
                  Booking Summary
                </p>
              </div>

              <div className="px-5 py-5 space-y-4">
                {summary ? (
                  <>
                    <SummaryRow label="Airport" value={
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-xs bg-[#FAF7F2] text-[#111] px-1.5 py-0.5 rounded border border-[#E8E2D6]">
                          {summary.airport.iataCode}
                        </span>
                        <span className="text-[#111]">{airportName}</span>
                      </span>
                    } />
                    <SummaryRow label="Service" value={<span className="text-[#111]">{serviceName}</span>} />
                    <SummaryRow label="Direction" value={<span className="text-[#111] capitalize">{summary.direction}</span>} />
                    <SummaryRow label="Travelers" value={<span className="text-[#111]">{summary.passengerCount}</span>} />
                    {serviceDate && (
                      <SummaryRow label="Date" value={
                        <span className="text-[#111]">
                          {serviceDate}
                          <span className="text-[#888] ms-1.5">· {serviceTime}</span>
                        </span>
                      } />
                    )}
                    {summary.flight && (
                      <SummaryRow label="Flight" value={
                        <span className="text-[#111] font-mono text-sm">
                          {summary.flight.flightNumber}
                          {summary.flight.terminal && (
                            <span className="text-[#888] ms-1.5 font-sans">· T{summary.flight.terminal}</span>
                          )}
                        </span>
                      } />
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[#888]">Loading booking details…</p>
                )}
              </div>

              <div className="px-5 py-4 bg-[#FAF7F2] border-t border-[#F0EAD8]">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm text-[#555]">Total</span>
                  <span className="text-2xl font-bold text-[#B89244]">
                    {formatPrice(intent.amount, intent.currency)}
                  </span>
                </div>
                <p className="text-xs text-[#888] mt-1">All taxes and fees included</p>
                <p className="text-[11px] text-[#888] mt-1.5 leading-snug">
                  💶 Payment is processed in <strong className="text-[#111]">EUR (€)</strong>.
                  If your card uses a different currency, your bank will apply its own conversion rate.
                </p>
              </div>
            </div>

            {/* Trust signals */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <TrustBadge icon="🔒" label="SSL Secure" />
              <TrustBadge icon="💳" label="Stripe" />
              <TrustBadge icon="↩" label="Refundable" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function formatPrice(minorUnits: number, _currency: string): string {
  return `€${(minorUnits / 100).toFixed(2)}`;
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[#888] shrink-0">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-2 bg-white border border-[#E8E2D6] rounded-lg">
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[10px] text-[#666] font-medium">{label}</span>
    </div>
  );
}

function Stepper({
  currentStep,
  labels,
}: {
  currentStep: number;
  labels: { details: string; review: string; payment: string; confirmation: string };
}) {
  const steps = [labels.details, labels.review, labels.payment, labels.confirmation];
  return (
    <div className="flex items-center gap-2 sm:gap-4 max-w-2xl">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={label} className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full border text-xs font-semibold transition-all ${
                isDone
                  ? 'bg-[#111] border-[#111] text-white'
                  : isActive
                  ? 'bg-[#B89244] border-[#B89244] text-white'
                  : 'bg-white border-[#E8E2D6] text-[#888]'
              }`}
            >
              {isDone ? '✓' : stepNum}
            </div>
            <span
              className={`text-xs sm:text-sm font-medium hidden sm:inline truncate ${
                isActive ? 'text-[#111]' : 'text-[#888]'
              }`}
            >
              {label}
            </span>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px ${isDone ? 'bg-[#111]' : 'bg-[#E8E2D6]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
