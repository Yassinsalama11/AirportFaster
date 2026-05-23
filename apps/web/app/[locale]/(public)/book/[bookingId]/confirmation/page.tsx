import type { Metadata } from 'next';
import Link from 'next/link';
import { PurchaseTracker } from '@/components/public/PurchaseTracker';

export const metadata: Metadata = {
  title: 'Booking Confirmation — AirportFaster',
};

type ConfirmationPageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{
    redirect_status?: string;
    ref?: string;
    amount?: string;
    currency?: string;
    payment_intent?: string;
    payment_intent_client_secret?: string;
  }>;
};

function formatAmount(minorUnits: number, _currency: string): string {
  // Platform-wide: always show Euros regardless of per-record currency.
  return `€${(minorUnits / 100).toFixed(2)}`;
}

export default async function ConfirmationPage({ params, searchParams }: ConfirmationPageProps) {
  const { bookingId } = await params;
  const { redirect_status, ref, amount, currency = 'EUR' } = await searchParams;

  const succeeded = redirect_status === 'succeeded';
  const amountMinorUnits = amount ? parseInt(amount, 10) : null;

  if (succeeded) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full">
          {amountMinorUnits !== null && amountMinorUnits > 0 && (
            <PurchaseTracker
              bookingId={bookingId}
              {...(ref && { bookingRef: ref })}
              amountMinorUnits={amountMinorUnits}
              currency={currency}
            />
          )}
          {/* Gold checkmark icon */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-brand-gold/10 border-2 border-brand-gold/40">
              <svg
                className="w-12 h-12 text-brand-gold"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-3xl font-bold text-ink text-center mb-3">
            Booking Confirmed!
          </h1>

          {/* Booking reference badge */}
          {ref && (
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-gold/10 border border-brand-gold/30 rounded-xl">
                <span className="text-xs text-ink-3 uppercase tracking-wide">Booking Reference</span>
                <span className="text-base font-mono font-bold text-brand-gold">{ref}</span>
              </div>
            </div>
          )}

          {/* Amount */}
          {amountMinorUnits !== null && amountMinorUnits > 0 && (
            <div className="flex justify-center mb-6">
              <span className="text-sm text-ink-3">
                Amount paid:{' '}
                <span className="text-ink font-semibold">
                  {formatAmount(amountMinorUnits, currency)}
                </span>
              </span>
            </div>
          )}

          {/* Email notice */}
          <p className="text-center text-ink-3 text-sm mb-8">
            You will receive a confirmation email shortly.
          </p>

          {/* What happens next */}
          <div className="bg-brand-navy border border-line rounded-xl p-6 mb-8">
            <h2 className="text-sm font-semibold text-brand-gold uppercase tracking-wider mb-4">
              What happens next?
            </h2>
            <ol className="space-y-4">
              {[
                {
                  step: '1',
                  title: 'Email confirmation sent',
                  desc: 'Check your inbox for a booking confirmation with full details.',
                },
                {
                  step: '2',
                  title: 'Dedicated specialist assigned',
                  desc: "We'll assign your personal airport specialist within a few hours.",
                },
                {
                  step: '3',
                  title: 'Final confirmation 24h before',
                  desc: "You'll receive a final confirmation message the day before your service.",
                },
              ].map(({ step, title, desc }) => (
                <li key={step} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-gold">{step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{title}</p>
                    <p className="text-xs text-ink-3 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors text-sm"
            >
              Search more airports
            </Link>
            {ref && (
              <Link
                href={`/manage?ref=${encodeURIComponent(ref)}`}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-line/80 text-gray-300 font-medium rounded-xl hover:border-brand-gold/30 hover:text-ink transition-colors text-sm"
              >
                Manage your booking
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Failure screen
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {/* Red X icon */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30">
            <svg
              className="w-12 h-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-ink mb-3">Payment Failed</h1>
        <p className="text-ink-3 mb-8">
          Your booking has not been confirmed. No charge has been made.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/book/${bookingId}/payment${ref ? `?ref=${encodeURIComponent(ref)}` : ''}${currency ? `&currency=${encodeURIComponent(currency)}` : ''}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors text-sm"
          >
            Try again
          </Link>
          <a
            href="mailto:support@airportfaster.com"
            className="inline-flex items-center gap-2 px-6 py-3 border border-line/80 text-gray-300 font-medium rounded-xl hover:border-brand-gold/30 hover:text-ink transition-colors text-sm"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
