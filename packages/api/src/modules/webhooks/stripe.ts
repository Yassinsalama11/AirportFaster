import Stripe from 'stripe';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@airportfaster/db';
import { logger } from '../../lib/logger.js';
import {
  findWebhookEventByStripeId,
  createWebhookEvent,
  markWebhookEventProcessed,
  markWebhookEventFailed,
  findPaymentByStripeIntentId,
  updatePaymentStatus,
  createPaymentTransaction,
  updateRefundByStripeRefundId,
} from '../payments/repository.js';
import {
  createStatusHistoryEntry,
  createBookingEvent,
  updateBookingStatus,
} from '../bookings/repository.js';
import { advanceToSupplierAssignment } from '../bookings/service.js';
import { sendBookingPaidNotifications } from '../notifications/service.js';

function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

function getWebhookSecret(): string {
  const secret = process.env['STRIPE_WEBHOOK_SECRET'];
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

// ── Stripe webhook route ──────────────────────────────────────────────────────

export async function stripeWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  // Override content-type parser for this route scope to capture raw body
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    function (_req, body, done) {
      try {
        const json = JSON.parse(body.toString()) as Record<string, unknown>;
        done(null, { parsed: json, raw: body });
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  fastify.post('/', async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return reply.status(400).send({ error: 'Missing stripe-signature header' });
    }

    const body = request.body as { parsed: Record<string, unknown>; raw: Buffer };

    // 1. Validate Stripe signature
    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body.raw, sig, getWebhookSecret());
    } catch (err) {
      logger.warn({ err }, 'Stripe webhook signature validation failed');
      return reply.status(400).send({ error: 'Invalid webhook signature' });
    }

    // 2. Check idempotency
    const existing = await findWebhookEventByStripeId(event.id);
    if (existing && existing.processingStatus === 'processed') {
      logger.info({ stripeEventId: event.id }, 'Webhook event already processed, skipping');
      return reply.status(200).send({ received: true });
    }

    // 3. Persist event record (or use existing if received but not processed)
    let webhookRecord = existing;
    if (!webhookRecord) {
      webhookRecord = await createWebhookEvent({
        stripeEventId: event.id,
        type: event.type,
        payload: event as unknown as Record<string, unknown>,
      });
    }

    // 4. Process event
    try {
      await processStripeEvent(event);
      await markWebhookEventProcessed(webhookRecord.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ err, stripeEventId: event.id }, 'Failed to process Stripe webhook event');
      await markWebhookEventFailed(webhookRecord.id, errorMessage);
      // Still return 200 to prevent Stripe from retrying events we've recorded
      return reply.status(200).send({ received: true, error: errorMessage });
    }

    return reply.status(200).send({ received: true });
  });
}

// ── Event processing ──────────────────────────────────────────────────────────

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;

    default:
      logger.info({ eventType: event.type }, 'Unhandled Stripe event type — ignoring');
  }
}

// ── payment_intent.succeeded ──────────────────────────────────────────────────

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const payment = await findPaymentByStripeIntentId(paymentIntent.id);
  if (!payment) {
    logger.warn(
      { stripePaymentIntentId: paymentIntent.id },
      'No payment found for succeeded PaymentIntent',
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Update Payment status → succeeded
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'succeeded', capturedAt: new Date() },
    });

    // Create PaymentTransaction (charge)
    await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        type: 'charge',
        amountMinor: paymentIntent.amount_received,
        currency: payment.currency,
        stripeObjectId: paymentIntent.latest_charge as string | null,
      },
    });

    // Update Booking status → paid
    const currentBooking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (currentBooking) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'paid' },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: payment.bookingId,
          fromStatus: currentBooking.status,
          toStatus: 'paid',
          actorType: 'system',
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: payment.bookingId,
          type: 'payment_confirmed',
          payload: {
            actorType: 'system',
            stripePaymentIntentId: paymentIntent.id,
            amountMinor: paymentIntent.amount_received,
          },
        },
      });
    }
  });

  // Trigger supplier assignment (runs after transaction commits)
  await advanceToSupplierAssignment(payment.bookingId);

  // Send booking confirmation to customer + alert admin team. Runs AFTER supplier
  // assignment so the customer email includes the supplier name when available.
  // Fire-and-forget — failure here must never propagate, the payment is already captured.
  void sendBookingPaidNotifications(payment.bookingId);
}

// ── payment_intent.payment_failed ─────────────────────────────────────────────

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const payment = await findPaymentByStripeIntentId(paymentIntent.id);
  if (!payment) {
    logger.warn(
      { stripePaymentIntentId: paymentIntent.id },
      'No payment found for failed PaymentIntent',
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Update Payment status → failed
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });

    // Update Booking status → failed
    const currentBooking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
    if (currentBooking) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'failed' },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: payment.bookingId,
          fromStatus: currentBooking.status,
          toStatus: 'failed',
          actorType: 'system',
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: payment.bookingId,
          type: 'payment_failed',
          payload: {
            actorType: 'system',
            stripePaymentIntentId: paymentIntent.id,
            failureMessage: paymentIntent.last_payment_error?.message ?? null,
          },
        },
      });
    }
  });
}

// ── charge.refunded ───────────────────────────────────────────────────────────

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  // Find the payment via the PaymentIntent
  if (!charge.payment_intent || typeof charge.payment_intent !== 'string') {
    logger.warn({ chargeId: charge.id }, 'charge.refunded has no payment_intent reference');
    return;
  }

  const payment = await findPaymentByStripeIntentId(charge.payment_intent);
  if (!payment) {
    logger.warn(
      { stripePaymentIntentId: charge.payment_intent },
      'No payment found for refunded charge',
    );
    return;
  }

  // Determine if fully refunded
  const isFullyRefunded = charge.refunded && charge.amount_refunded >= charge.amount;
  const newPaymentStatus = isFullyRefunded ? 'refunded' : 'partially_refunded';

  await updatePaymentStatus(payment.id, newPaymentStatus);

  // Update Refund records by stripeRefundId for each refund in the charge
  for (const refund of charge.refunds?.data ?? []) {
    if (refund.status === 'succeeded') {
      await updateRefundByStripeRefundId(refund.id, 'completed');
    }
  }
}
