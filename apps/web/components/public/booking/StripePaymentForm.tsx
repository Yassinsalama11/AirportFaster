'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] ?? '');

interface StripePaymentFormProps {
  clientSecret: string;
  bookingId: string;
  bookingReference: string;
  currency: string;
  amountMinorUnits: number;
  locale: string;
}

function formatAmount(minorUnits: number, _currency: string): string {
  // Platform-wide: always show Euros regardless of per-record currency.
  return `€${(minorUnits / 100).toFixed(2)}`;
}

interface InnerFormProps {
  bookingId: string;
  bookingReference: string;
  currency: string;
  amountMinorUnits: number;
  locale: string;
}

function InnerPaymentForm({ bookingId, bookingReference, currency, amountMinorUnits, locale }: InnerFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const returnUrl =
      `${origin}/${locale}/book/${bookingId}/confirmation` +
      `?ref=${encodeURIComponent(bookingReference)}` +
      `&amount=${amountMinorUnits}` +
      `&currency=${encodeURIComponent(currency)}`;

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    // If we reach here, an error occurred (success redirects automatically)
    if (stripeError) {
      setError(stripeError.message ?? 'An unexpected payment error occurred.');
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Price summary */}
      <div className="bg-brand-navy border border-line rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4 py-1.5 border-b border-line">
          <span className="text-sm text-ink-3">Booking reference</span>
          <span className="text-sm font-mono font-bold text-brand-gold">{bookingReference}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-ink">Total</span>
          <span className="text-xl font-bold text-brand-gold">
            {formatAmount(amountMinorUnits, currency)}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-brand-navy border border-line rounded-xl p-5">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Pay Now */}
      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-gold text-brand-black font-bold text-base rounded-xl hover:bg-brand-gold-light transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {processing ? (
          <>
            <svg className="animate-spin h-5 w-5 text-brand-black" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing…
          </>
        ) : (
          <>
            Pay Now
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      <p className="text-center text-xs text-ink-3">
        Payments are processed securely via Stripe. Your card details are never stored.
      </p>
    </form>
  );
}

export function StripePaymentForm({
  clientSecret,
  bookingId,
  bookingReference,
  currency,
  amountMinorUnits,
  locale,
}: StripePaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#C9A84C',
            colorBackground: '#0D1B2A',
            colorText: '#FFFFFF',
            colorDanger: '#f87171',
            fontFamily: 'inherit',
            borderRadius: '8px',
          },
        },
      }}
    >
      <InnerPaymentForm
        bookingId={bookingId}
        bookingReference={bookingReference}
        currency={currency}
        amountMinorUnits={amountMinorUnits}
        locale={locale}
      />
    </Elements>
  );
}
