import Stripe from 'stripe';
import { prisma } from '@airportfaster/db';
import type { CreatePaymentIntentBody, InitiateRefundBody } from './validators.js';
import {
  createPayment,
  findLatestPaymentByBookingId,
  findPaymentById,
  listPayments,
  updatePaymentStatus,
  createPaymentTransaction,
  createRefundRecord,
} from './repository.js';
import type { PaymentRecord } from './repository.js';
import type { ListPaymentsQuery } from './validators.js';
import {
  createStatusHistoryEntry,
  createBookingEvent,
  updateBookingStatus,
} from '../bookings/repository.js';

// ── Stripe client ─────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

// ── Error class ───────────────────────────────────────────────────────────────

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// ── Create Payment Intent ─────────────────────────────────────────────────────

export async function createPaymentIntentService(data: CreatePaymentIntentBody): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}> {
  // 1. Load booking — must exist and be in 'draft' status
  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { priceSnapshot: true },
  });

  if (!booking) {
    throw new PaymentError('Booking not found', 'BOOKING_NOT_FOUND', 404);
  }

  if (booking.status === 'pending_payment') {
    const existingPayment = await findLatestPaymentByBookingId(booking.id);
    if (
      existingPayment?.stripePaymentIntentId &&
      existingPayment.status === 'requires_payment'
    ) {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(existingPayment.stripePaymentIntentId);
      if (!paymentIntent.client_secret) {
        throw new PaymentError('Stripe did not return a client_secret', 'STRIPE_ERROR', 500);
      }
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: existingPayment.amountMinor,
        currency: existingPayment.currency,
      };
    }
  }

  if (booking.status !== 'draft') {
    throw new PaymentError(
      `Booking is not in draft status (current: ${booking.status})`,
      'INVALID_BOOKING_STATUS',
      422,
    );
  }

  if (!booking.priceSnapshot) {
    throw new PaymentError('Booking has no price snapshot', 'NO_PRICE_SNAPSHOT', 422);
  }

  // 2. Use the booking's snapshot currency. (We accept an optional `data.currency`
  //    parameter but ignore mismatches — the snapshot is authoritative since that's
  //    what Stripe will be charged in. Multi-currency display is handled separately.)
  const amount = booking.priceSnapshot.totalMinor;
  const currency = booking.priceSnapshot.currency.toLowerCase();

  // 3. Create Stripe PaymentIntent
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata: {
      bookingId: booking.id,
      bookingReference: booking.reference,
    },
    automatic_payment_methods: { enabled: true },
  });

  if (!paymentIntent.client_secret) {
    throw new PaymentError('Stripe did not return a client_secret', 'STRIPE_ERROR', 500);
  }

  // 4. Create Payment record in DB
  await createPayment({
    bookingId: booking.id,
    stripePaymentIntentId: paymentIntent.id,
    amountMinor: amount,
    currency: booking.priceSnapshot.currency,
  });

  // 5. Update booking status: draft → pending_payment
  await updateBookingStatus(booking.id, 'pending_payment');
  await createStatusHistoryEntry({
    bookingId: booking.id,
    fromStatus: 'draft',
    toStatus: 'pending_payment',
    actorType: 'system',
  });

  // 6. Create BookingEvent
  await createBookingEvent({
    bookingId: booking.id,
    type: 'payment_initiated',
    payload: {
      actorType: 'system',
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  // 7. Sales alert (fire-and-forget so payment intent never blocks on email)
  void (async () => {
    try {
      const { sendSalesBookingAlertById } = await import('../notifications/service.js');
      await sendSalesBookingAlertById(booking.id, 'waiting_payment');
    } catch (error) {
      const { logger } = await import('../../lib/logger.js');
      logger.error({ error, bookingId: booking.id }, 'Sales waiting-payment alert failed');
    }
  })();

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
    currency: booking.priceSnapshot.currency,
  };
}

// ── Admin: get payment ────────────────────────────────────────────────────────

export async function getPaymentByIdService(id: string): Promise<PaymentRecord> {
  const payment = await findPaymentById(id);
  if (!payment) {
    throw new PaymentError('Payment not found', 'PAYMENT_NOT_FOUND', 404);
  }
  return payment;
}

// ── Admin: list payments ──────────────────────────────────────────────────────

export async function listPaymentsService(
  query: ListPaymentsQuery,
): Promise<{ items: PaymentRecord[]; nextCursor: string | null }> {
  return listPayments(query);
}

// ── Admin: initiate refund ────────────────────────────────────────────────────

export async function initiateRefundService(
  paymentId: string,
  body: InitiateRefundBody,
): Promise<{ refundId: string; stripeRefundId: string }> {
  const payment = await getPaymentByIdService(paymentId);

  if (!payment.stripePaymentIntentId) {
    throw new PaymentError(
      'Payment has no associated Stripe PaymentIntent',
      'NO_STRIPE_INTENT',
      422,
    );
  }

  if (payment.status === 'refunded') {
    throw new PaymentError('Payment is already fully refunded', 'ALREADY_REFUNDED', 422);
  }

  const stripe = getStripe();

  // Call Stripe to create refund
  const stripeRefund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    amount: body.amountMinorUnits,
  });

  // Create Refund record
  const refund = await createRefundRecord({
    bookingId: payment.bookingId,
    paymentId: payment.id,
    requestedAmountMinor: body.amountMinorUnits,
    approvedAmountMinor: body.amountMinorUnits,
    currency: payment.currency,
    reason: body.reason,
    stripeRefundId: stripeRefund.id,
  });

  // Create PaymentTransaction for the refund
  await createPaymentTransaction({
    paymentId: payment.id,
    type: 'refund',
    amountMinor: body.amountMinorUnits,
    currency: payment.currency,
    stripeObjectId: stripeRefund.id,
  });

  // Determine if this is a full refund
  const isFullRefund = body.amountMinorUnits >= payment.amountMinor;

  // Update payment status
  await updatePaymentStatus(payment.id, isFullRefund ? 'refunded' : 'partially_refunded');

  // If full refund, update booking status to refunded
  if (isFullRefund) {
    await updateBookingStatus(payment.bookingId, 'refunded');
    await createStatusHistoryEntry({
      bookingId: payment.bookingId,
      fromStatus: payment.booking.status,
      toStatus: 'refunded',
      actorType: 'staff',
      reason: body.reason,
    });
    await createBookingEvent({
      bookingId: payment.bookingId,
      type: 'booking_refunded',
      payload: {
        actorType: 'staff',
        refundId: refund.id,
        stripeRefundId: stripeRefund.id,
        amountMinor: body.amountMinorUnits,
      },
    });
  }

  return { refundId: refund.id, stripeRefundId: stripeRefund.id };
}
