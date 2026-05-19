import Stripe from 'stripe';
import { prisma } from '@airportfaster/db';
import type { InitiateAdminRefundBody, ListRefundsQuery } from './validators.js';
import {
  listRefunds,
  findRefundById,
  findPaymentByBookingId,
  createRefundWithHistory,
  updateRefundStatus,
} from './repository.js';
import type { RefundRecord } from './repository.js';
import {
  createStatusHistoryEntry,
  createBookingEvent,
  updateBookingStatus,
} from '../bookings/repository.js';
import { createPaymentTransaction } from '../payments/repository.js';

// ── Stripe client ─────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

// ── Error class ───────────────────────────────────────────────────────────────

export class RefundError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'RefundError';
  }
}

// ── List Refunds ──────────────────────────────────────────────────────────────

export async function listRefundsService(
  query: ListRefundsQuery,
): Promise<{ items: RefundRecord[]; nextCursor: string | null }> {
  return listRefunds(query);
}

// ── Get Refund by ID ──────────────────────────────────────────────────────────

export async function getRefundByIdService(id: string): Promise<RefundRecord> {
  const refund = await findRefundById(id);
  if (!refund) {
    throw new RefundError('Refund not found', 'REFUND_NOT_FOUND', 404);
  }
  return refund;
}

// ── Initiate Admin Refund ─────────────────────────────────────────────────────

export async function initiateAdminRefundService(
  body: InitiateAdminRefundBody,
  actorId?: string,
): Promise<RefundRecord> {
  // 1. Load booking — must be paid/completed/confirmed
  const booking = await prisma.booking.findUnique({
    where: { id: body.bookingId },
  });

  if (!booking) {
    throw new RefundError('Booking not found', 'BOOKING_NOT_FOUND', 404);
  }

  const refundableStatuses = ['paid', 'completed', 'confirmed', 'cancelled', 'supplier_assigned', 'pending_supplier_assignment', 'pending_supplier_confirmation', 'in_progress'];
  if (!refundableStatuses.includes(booking.status)) {
    throw new RefundError(
      `Booking status '${booking.status}' is not eligible for a refund`,
      'INVALID_BOOKING_STATUS',
      422,
    );
  }

  // 2. Load payment by bookingId
  const payment = await findPaymentByBookingId(body.bookingId);

  if (!payment) {
    throw new RefundError('No payment found for this booking', 'PAYMENT_NOT_FOUND', 404);
  }

  if (!payment.stripePaymentIntentId) {
    throw new RefundError(
      'Payment has no associated Stripe PaymentIntent',
      'NO_STRIPE_INTENT',
      422,
    );
  }

  // 3. Validate amount <= original payment amount
  if (body.amountMinorUnits > payment.amountMinor) {
    throw new RefundError(
      `Refund amount (${body.amountMinorUnits}) exceeds original payment amount (${payment.amountMinor})`,
      'AMOUNT_EXCEEDS_PAYMENT',
      422,
    );
  }

  // 4. Call Stripe refunds.create
  const stripe = getStripe();
  const stripeRefund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    amount: body.amountMinorUnits,
  });

  // 5. Create Refund record with status 'processing' + RefundStatusHistory entry
  const refund = await createRefundWithHistory({
    bookingId: body.bookingId,
    paymentId: payment.id,
    type: body.type,
    requestedAmountMinor: body.amountMinorUnits,
    approvedAmountMinor: body.amountMinorUnits,
    currency: payment.currency,
    reason: body.reason,
    stripeRefundId: stripeRefund.id,
    actorId,
  });

  // 6. Create PaymentTransaction (type: 'refund')
  await createPaymentTransaction({
    paymentId: payment.id,
    type: 'refund',
    amountMinor: body.amountMinorUnits,
    currency: payment.currency,
    stripeObjectId: stripeRefund.id,
  });

  // 7. If full refund: update Booking.status → 'refunded', create BookingStatusHistory
  if (body.type === 'full') {
    await updateBookingStatus(body.bookingId, 'refunded');
    await createStatusHistoryEntry({
      bookingId: body.bookingId,
      fromStatus: booking.status,
      toStatus: 'refunded',
      actorType: 'staff',
      actorId,
      reason: body.reason,
    });
    await createBookingEvent({
      bookingId: body.bookingId,
      type: 'booking_refunded',
      payload: {
        actorType: 'staff',
        refundId: refund.id,
        stripeRefundId: stripeRefund.id,
        amountMinor: body.amountMinorUnits,
      },
    });
  }

  return refund;
}

// ── Cancel Refund (pending only) ──────────────────────────────────────────────

export async function cancelRefundService(
  id: string,
  actorId?: string,
): Promise<RefundRecord> {
  const refund = await getRefundByIdService(id);

  // Only 'requested' status refunds can be cancelled (not yet processed by Stripe)
  if (refund.status !== 'requested') {
    throw new RefundError(
      `Cannot cancel refund in status '${refund.status}'. Only 'requested' refunds can be cancelled.`,
      'CANNOT_CANCEL_REFUND',
      422,
    );
  }

  return updateRefundStatus(id, refund.status, 'rejected', actorId, 'Cancelled by staff');
}
