import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingStepIndicator } from '@/components/public/booking/BookingStepIndicator';
import { StripePaymentForm } from '@/components/public/booking/StripePaymentForm';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const metadata: Metadata = { title: 'Complete Payment — AirportFaster' };

type PaymentPageProps = {
  params: Promise<{ bookingId: string }>;
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
      if (
        res.status === 404 ||
        code === 'BOOKING_NOT_FOUND' ||
        code === 'INVALID_BOOKING_STATUS'
      ) {
        return { redirect: true };
      }
      return { error: data.error?.['message'] ?? 'Unable to initialise payment.' };
    }

    return { intent: data.data };
  } catch {
    return { error: 'Unable to connect to payment service.' };
  }
}

export default async function PaymentPage({ params, searchParams }: PaymentPageProps) {
  const { bookingId } = await params;
  const { currency = 'EUR', ref } = await searchParams;

  const t = await getTranslations('booking');
  const tCommon = await getTranslations('common');

  const result = await createPaymentIntent(bookingId, currency);

  if ('redirect' in result && result.redirect) {
    redirect(`/book/${bookingId}/confirmation`);
  }

  if ('error' in result && result.error) {
    return (
      <div className="max-w-lg mx-auto px-5 lg:px-8 py-16">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border border-red-200 mb-6">
            <X className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">{tCommon('error')}</h1>
          <p className="text-ink-2 mb-8">{result.error}</p>
          <Button variant="gold" asChild>
            <Link href="/">{tCommon('home')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const intent = result.intent;
  if (!intent) {
    redirect('/');
  }

  const bookingReference = ref ?? bookingId;

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-3 mb-8">
        <Link href="/" className="hover:text-ink transition-colors">{tCommon('home')}</Link>
        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        <span className="text-ink font-medium">{t('step_payment')}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-ink tracking-tight mb-2">
          {t('page_payment_title')}
        </h1>
        <p className="text-ink-2">{t('page_payment_sub')}</p>
      </div>

      {/* Step indicator */}
      <div className="mb-10">
        <BookingStepIndicator
          currentStep={3}
          labels={{
            details: t('step_details'),
            review: t('step_review'),
            payment: t('step_payment'),
            confirmation: t('step_confirmation'),
          }}
        />
      </div>

      {/* Payment form */}
      <StripePaymentForm
        clientSecret={intent.clientSecret}
        bookingId={bookingId}
        bookingReference={bookingReference}
        currency={intent.currency}
        amountMinorUnits={intent.amount}
      />
    </div>
  );
}
