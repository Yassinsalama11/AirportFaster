import { prisma, Prisma } from '@airportfaster/db';
import type { PaymentStatus, TransactionType } from '@airportfaster/db';
import type { ListPaymentsQuery } from './validators.js';

// ── Include shape ────────────────────────────────────────────────────────────

const paymentInclude = {
  booking: {
    include: {
      customer: true,
      priceSnapshot: true,
    },
  },
  transactions: { orderBy: { createdAt: 'asc' } },
  refunds: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.PaymentInclude;

export type PaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;

// ── Create ───────────────────────────────────────────────────────────────────

export async function createPayment(data: {
  bookingId: string;
  stripePaymentIntentId: string;
  amountMinor: number;
  currency: string;
}): Promise<PaymentRecord> {
  return prisma.payment.create({
    data: {
      bookingId: data.bookingId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      amountMinor: data.amountMinor,
      currency: data.currency,
      status: 'requires_payment',
    },
    include: paymentInclude,
  });
}

// ── Retrieval ─────────────────────────────────────────────────────────────────

export async function findPaymentById(id: string): Promise<PaymentRecord | null> {
  return prisma.payment.findUnique({
    where: { id },
    include: paymentInclude,
  });
}

export async function findPaymentByStripeIntentId(
  stripePaymentIntentId: string,
): Promise<PaymentRecord | null> {
  return prisma.payment.findUnique({
    where: { stripePaymentIntentId },
    include: paymentInclude,
  });
}

export async function findLatestPaymentByBookingId(bookingId: string): Promise<PaymentRecord | null> {
  return prisma.payment.findFirst({
    where: { bookingId },
    include: paymentInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function listPayments(query: ListPaymentsQuery): Promise<{
  items: PaymentRecord[];
  nextCursor: string | null;
}> {
  const where: Prisma.PaymentWhereInput = {
    status: query.status,
    bookingId: query.bookingId,
    createdAt: {
      gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
      lte: query.dateTo ? new Date(`${query.dateTo}T23:59:59Z`) : undefined,
    },
  };

  const items = await prisma.payment.findMany({
    where,
    include: paymentInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    take: query.pageSize + 1,
  });

  const hasMore = items.length > query.pageSize;
  if (hasMore) items.pop();

  return {
    items,
    nextCursor: hasMore && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
  };
}

// ── Status update ─────────────────────────────────────────────────────────────

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  capturedAt?: Date,
): Promise<PaymentRecord> {
  return prisma.payment.update({
    where: { id },
    data: {
      status,
      ...(capturedAt ? { capturedAt } : {}),
    },
    include: paymentInclude,
  });
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function createPaymentTransaction(data: {
  paymentId: string;
  type: TransactionType;
  amountMinor: number;
  currency: string;
  stripeObjectId?: string;
}) {
  return prisma.paymentTransaction.create({
    data: {
      paymentId: data.paymentId,
      type: data.type,
      amountMinor: data.amountMinor,
      currency: data.currency,
      stripeObjectId: data.stripeObjectId ?? null,
    },
  });
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export async function createRefundRecord(data: {
  bookingId: string;
  paymentId: string;
  requestedAmountMinor: number;
  approvedAmountMinor: number;
  currency: string;
  reason: string;
  stripeRefundId: string;
}) {
  return prisma.refund.create({
    data: {
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      type: 'partial',
      requestedAmountMinor: data.requestedAmountMinor,
      approvedAmountMinor: data.approvedAmountMinor,
      currency: data.currency,
      reason: data.reason,
      requestedBy: 'staff',
      status: 'processing',
      stripeRefundId: data.stripeRefundId,
    },
  });
}

export async function updateRefundByStripeRefundId(
  stripeRefundId: string,
  status: 'completed' | 'rejected',
) {
  return prisma.refund.updateMany({
    where: { stripeRefundId },
    data: {
      status,
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
    },
  });
}

// ── Webhook events ────────────────────────────────────────────────────────────

export async function findWebhookEventByStripeId(stripeEventId: string) {
  return prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId },
  });
}

export async function createWebhookEvent(data: {
  stripeEventId: string;
  type: string;
  payload: Record<string, unknown>;
}) {
  return prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: data.stripeEventId,
      type: data.type,
      payload: data.payload as Prisma.InputJsonValue,
      processingStatus: 'received',
    },
  });
}

export async function markWebhookEventProcessed(id: string) {
  return prisma.stripeWebhookEvent.update({
    where: { id },
    data: {
      processingStatus: 'processed',
      processedAt: new Date(),
    },
  });
}

export async function markWebhookEventFailed(id: string, error: string) {
  return prisma.stripeWebhookEvent.update({
    where: { id },
    data: {
      processingStatus: 'failed',
      error,
    },
  });
}
