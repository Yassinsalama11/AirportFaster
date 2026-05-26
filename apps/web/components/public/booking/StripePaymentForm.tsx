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

    if (stripeError) {
      setError(stripeError.message ?? 'An unexpected payment error occurred.');
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Stripe Payment Element */}
      <div className="bg-white border border-[#E8E2D6] rounded-2xl shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#111]">Payment Details</h2>
          <div className="flex items-center gap-1.5 text-xs text-[#888]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 11.5a1 1 0 00-1 1V15a1 1 0 102 0v-2.5a1 1 0 00-1-1z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7 8V6a5 5 0 0110 0v2h1a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2h1zm2 0V6a3 3 0 016 0v2H9z"
                fill="currentColor"
              />
            </svg>
            Secure
          </div>
        </div>

        <PaymentElement options={{ layout: 'tabs' }} />

        {/* Stripe brand line */}
        <div className="flex items-center justify-end gap-1.5 mt-5 pt-4 border-t border-[#F0EAD8]">
          <span className="text-[10px] text-[#888] uppercase tracking-wider">Powered by</span>
          <svg viewBox="0 0 60 25" className="h-3.5 text-[#635BFF]" fill="currentColor">
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.63l.21 1.03a4.7 4.7 0 0 1 3.23-1.2c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.5-5.65 7.5zM39.97 9.4c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.4h-3.14l.01 5.55zm-4.91.7c0 2.94-2.39 4.65-5.87 4.65A11.2 11.2 0 0 1 0 19.45v-3.93c1.43.78 3.27 1.36 4.61 1.36.9 0 1.55-.24 1.55-.99 0-1.94-6.3-1.21-6.3-5.81 0-2.9 2.07-4.81 5.5-4.81 1.43 0 2.86.22 4.29.79v3.88a9.73 9.73 0 0 0-4.3-1.08c-.84 0-1.36.24-1.36.89 0 1.83 6.34.96 6.34 5.97z" />
          </svg>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-[#991B1B]">{error}</p>
        </div>
      )}

      {/* Pay button */}
      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#B89244] hover:bg-[#A37F35] text-white font-semibold text-base rounded-xl shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {processing ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing payment…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 11.5a1 1 0 00-1 1V15a1 1 0 102 0v-2.5a1 1 0 00-1-1z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7 8V6a5 5 0 0110 0v2h1a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2v-9a2 2 0 012-2h1zm2 0V6a3 3 0 016 0v2H9z"
                fill="currentColor"
              />
            </svg>
            Pay {formatAmount(amountMinorUnits, currency)} securely
          </>
        )}
      </button>

      {/* Reassurance */}
      <div className="space-y-2.5 text-xs text-[#666]">
        <div className="flex items-start gap-2">
          <span className="text-[#B89244] mt-0.5">✓</span>
          <p>Your card details are encrypted and processed securely by Stripe. We never store raw card numbers.</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[#B89244] mt-0.5">✓</span>
          <p>You'll be charged only once your booking is confirmed.</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[#B89244] mt-0.5">✓</span>
          <p>Full refund available up to 24 hours before service.</p>
        </div>
      </div>
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
          theme: 'stripe',
          variables: {
            colorPrimary: '#B89244',
            colorBackground: '#FFFFFF',
            colorText: '#111111',
            colorTextSecondary: '#666666',
            colorDanger: '#DC2626',
            fontFamily: 'inherit',
            spacingUnit: '4px',
            borderRadius: '10px',
            fontSizeBase: '15px',
          },
          rules: {
            '.Input': {
              border: '1px solid #E8E2D6',
              boxShadow: 'none',
              backgroundColor: '#FAF7F2',
            },
            '.Input:focus': {
              border: '1px solid #B89244',
              boxShadow: '0 0 0 1px #B89244',
            },
            '.Label': {
              fontWeight: '500',
              color: '#444',
            },
            '.Tab': {
              border: '1px solid #E8E2D6',
              backgroundColor: '#FFFFFF',
            },
            '.Tab:hover': {
              backgroundColor: '#FAF7F2',
            },
            '.Tab--selected': {
              border: '1px solid #B89244',
              backgroundColor: '#FAF7F2',
            },
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
