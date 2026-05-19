import { prisma, Prisma } from '@airportfaster/db';
import type { RefundStatus } from '@airportfaster/db';
import type { ListRefundsQuery } from './validators.js';

// ── Include shape ────────────────────────────────────────────────────────────

const refundInclude = {
  booking: {
    include: {
      customer: true,
      priceSnapshot: true,
    },
  },
  payment: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.RefundInclude;

export type RefundRecord = Prisma.RefundGetPayload<{
  include: typeof refundInclude;
}>;

// ── List ─────────────────────────────────────────────────────────────────────

export async function listRefunds(query: ListRefundsQuery): Promise<{
  items: RefundRecord[];
  nextCursor: string | null;
}> {
  const where: Prisma.RefundWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.bookingId ? { bookingId: query.bookingId } : {}),
    createdAt: {
      gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
      lte: query.dateTo ? new Date(`${query.dateTo}T23:59:59Z`) : undefined,
    },
  };

  const items = await prisma.refund.findMany({
    where,
    include: refundInclude,
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

// ── Find by ID ───────────────────────────────────────────────────────────────

export async function findRefundById(id: string): Promise<RefundRecord | null> {
  return prisma.refund.findUnique({
    where: { id },
    include: refundInclude,
  });
}

// ── Find payment by bookingId ─────────────────────────────────────────────────

export async function findPaymentByBookingId(bookingId: string) {
  return prisma.payment.findFirst({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Create Refund + Status History (in transaction) ──────────────────────────

export async function createRefundWithHistory(data: {
  bookingId: string;
  paymentId: string | null;
  type: 'full' | 'partial';
  requestedAmountMinor: number;
  approvedAmountMinor: number;
  currency: string;
  reason: string;
  stripeRefundId: string;
  actorId?: string;
}): Promise<RefundRecord> {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.create({
      data: {
        bookingId: data.bookingId,
        paymentId: data.paymentId,
        type: data.type,
        requestedAmountMinor: data.requestedAmountMinor,
        approvedAmountMinor: data.approvedAmountMinor,
        currency: data.currency,
        reason: data.reason,
        requestedBy: 'staff',
        status: 'processing',
        stripeRefundId: data.stripeRefundId,
      },
      include: refundInclude,
    });

    await tx.refundStatusHistory.create({
      data: {
        refundId: refund.id,
        fromStatus: null,
        toStatus: 'processing',
        actorId: data.actorId ?? null,
        note: 'Refund initiated by staff',
      },
    });

    return refund;
  });
}

// ── Update Refund Status ──────────────────────────────────────────────────────

export async function updateRefundStatus(
  id: string,
  fromStatus: RefundStatus,
  toStatus: RefundStatus,
  actorId?: string,
  note?: string,
): Promise<RefundRecord> {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.update({
      where: { id },
      data: { status: toStatus },
      include: refundInclude,
    });

    await tx.refundStatusHistory.create({
      data: {
        refundId: id,
        fromStatus,
        toStatus,
        actorId: actorId ?? null,
        note: note ?? null,
      },
    });

    return refund;
  });
}
