import { prisma, Prisma } from '@airportfaster/db';
import type { BookingStatus, NoteVisibility, PassengerType } from '@airportfaster/db';
import type { ListBookingsQuery, ListCustomersQuery } from './validators.js';

// ── Full booking include shape ────────────────────────────────────────────────

const bookingInclude = {
  customer: true,
  passengers: true,
  flights: true,
  priceSnapshot: true,
  statusHistory: { orderBy: { createdAt: 'asc' } },
  notes: { orderBy: { createdAt: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
  airportService: {
    include: {
      airport: { include: { translations: true } },
      service: { include: { translations: true } },
    },
  },
} satisfies Prisma.BookingInclude;

export type BookingRecord = Prisma.BookingGetPayload<{
  include: typeof bookingInclude;
}>;

// ── Customer ──────────────────────────────────────────────────────────────────

export async function upsertCustomer(data: {
  email: string;
  phone: string;
  fullName: string;
  locale: string;
}) {
  return prisma.customer.upsert({
    where: { email: data.email },
    update: {
      phone: data.phone,
      fullName: data.fullName,
      locale: data.locale,
    },
    create: {
      email: data.email,
      phone: data.phone,
      fullName: data.fullName,
      locale: data.locale,
    },
  });
}

// ── Airport Service ───────────────────────────────────────────────────────────

export async function findAirportServiceById(id: string) {
  return prisma.airportService.findUnique({
    where: { id },
    include: {
      airport: true,
      service: true,
    },
  });
}

// ── Reference generation ──────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous O/0/I/1

function generateReferenceCandidate(): string {
  let result = 'AP-';
  for (let i = 0; i < 8; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

export async function generateUniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const ref = generateReferenceCandidate();
    const existing = await prisma.booking.findUnique({ where: { reference: ref } });
    if (!existing) return ref;
  }
  throw new Error('Failed to generate unique booking reference after 10 attempts');
}

// ── Booking creation helpers ──────────────────────────────────────────────────

export async function createBookingRecord(data: {
  reference: string;
  customerId: string;
  airportServiceId: string;
  direction: 'arrival' | 'departure' | 'transit';
  serviceDateTime: Date;
  passengerCount: number;
  specialRequests?: string;
  locale: string;
  currency: string;
  totalMinor: number;
  manageTokenHash: string;
  source?: 'homepage' | 'airport_page' | 'service_page' | 'direct' | 'api' | 'manual';
  initialStatus?:
    | 'draft'
    | 'pending'
    | 'pending_payment'
    | 'paid'
    | 'pending_supplier_assignment'
    | 'supplier_assigned'
    | 'pending_supplier_confirmation'
    | 'confirmed';
}): Promise<BookingRecord> {
  // Token expires 90 days after service date (generous window for post-service queries).
  const manageTokenExpiresAt = new Date(data.serviceDateTime);
  manageTokenExpiresAt.setDate(manageTokenExpiresAt.getDate() + 90);

  const booking = await prisma.booking.create({
    data: {
      reference: data.reference,
      customerId: data.customerId,
      airportServiceId: data.airportServiceId,
      direction: data.direction,
      serviceDateTime: data.serviceDateTime,
      passengerCount: data.passengerCount,
      specialRequests: data.specialRequests ?? null,
      locale: data.locale,
      currency: data.currency,
      totalMinor: data.totalMinor,
      status: data.initialStatus ?? 'draft',
      ...(data.source ? { source: data.source } : {}),
      manageTokenHash: data.manageTokenHash,
      manageTokenExpiresAt,
    },
    include: bookingInclude,
  });
  return booking;
}

export async function createPriceSnapshot(data: {
  bookingId: string;
  basePriceMinor: number;
  supplierCostMinor: number;
  markupMinor: number;
  discountMinor: number;
  taxEstimateMinor: number;
  totalMinor: number;
  marginMinor: number;
  currency: string;
  pricingRuleId?: string;
}) {
  return prisma.bookingPriceSnapshot.create({
    data: {
      bookingId: data.bookingId,
      basePriceMinor: data.basePriceMinor,
      supplierCostMinor: data.supplierCostMinor,
      markupMinor: data.markupMinor,
      discountMinor: data.discountMinor,
      taxEstimateMinor: data.taxEstimateMinor,
      totalMinor: data.totalMinor,
      marginMinor: data.marginMinor,
      currency: data.currency,
      pricingRuleId: data.pricingRuleId ?? null,
    },
  });
}

export async function createStatusHistoryEntry(data: {
  bookingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorType?: 'system' | 'staff' | 'supplier' | 'customer';
  actorId?: string;
  reason?: string;
}) {
  return prisma.bookingStatusHistory.create({
    data: {
      bookingId: data.bookingId,
      fromStatus: data.fromStatus ?? null,
      toStatus: data.toStatus,
      actorType: data.actorType ?? 'system',
      actorId: data.actorId ?? null,
      reason: data.reason ?? null,
    },
  });
}

export async function createPassengers(
  bookingId: string,
  passengers: Array<{
    fullName: string;
    type: PassengerType;
    notes?: string;
  }>,
) {
  return prisma.bookingPassenger.createMany({
    data: passengers.map((p) => ({
      bookingId,
      fullName: p.fullName,
      type: p.type,
      notes: p.notes ?? null,
    })),
  });
}

export async function createFlight(data: {
  bookingId: string;
  flightNumber: string;
  airlineCode?: string;
  scheduledTime: Date;
  terminal?: string;
}) {
  return prisma.bookingFlight.create({
    data: {
      bookingId: data.bookingId,
      flightNumber: data.flightNumber,
      airlineCode: data.airlineCode ?? null,
      scheduledTime: data.scheduledTime,
      terminal: data.terminal ?? null,
    },
  });
}

export async function createBookingEvent(data: {
  bookingId: string;
  type: string;
  payload?: Record<string, unknown>;
}) {
  return prisma.bookingEvent.create({
    data: {
      bookingId: data.bookingId,
      type: data.type,
      payload: data.payload ? (data.payload as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

// ── Retrieval ─────────────────────────────────────────────────────────────────

export async function findBookingById(id: string): Promise<BookingRecord | null> {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
}

export async function findBookingByManageTokenHash(
  tokenHash: string,
): Promise<BookingRecord | null> {
  return prisma.booking.findFirst({
    where: {
      manageTokenHash: tokenHash,
      OR: [
        { manageTokenExpiresAt: null },
        { manageTokenExpiresAt: { gt: new Date() } },
      ],
    },
    include: bookingInclude,
  });
}

export async function listBookings(query: ListBookingsQuery): Promise<{
  items: BookingRecord[];
  nextCursor: string | null;
}> {
  const where: Prisma.BookingWhereInput = {
    status: query.status,
    serviceDateTime: {
      gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
      lte: query.dateTo ? new Date(`${query.dateTo}T23:59:59Z`) : undefined,
    },
    airportService: {
      airportId: query.airportId,
      serviceId: query.serviceId,
    },
    ...(query.search
      ? {
          OR: [
            { reference: { contains: query.search, mode: 'insensitive' } },
            {
              customer: {
                OR: [
                  { email: { contains: query.search, mode: 'insensitive' } },
                  { fullName: { contains: query.search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  // Use Prisma native cursor pagination (cursor + skip:1) for stability.
  // Order by createdAt desc + id desc as tiebreaker.
  const items = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    take: query.pageSize + 1,
  });

  const hasMore = items.length > query.pageSize;
  if (hasMore) items.pop();

  // The cursor is the last item's id — callers pass it back as `cursor` param.
  return {
    items,
    nextCursor: hasMore && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
  };
}

// ── Status update ─────────────────────────────────────────────────────────────

export async function updateBookingStatus(
  id: string,
  newStatus: BookingStatus,
): Promise<BookingRecord> {
  return prisma.booking.update({
    where: { id },
    data: { status: newStatus },
    include: bookingInclude,
  });
}

// ── Note ──────────────────────────────────────────────────────────────────────

export async function createNote(data: {
  bookingId: string;
  body: string;
  visibility: NoteVisibility;
  authorUserId?: string;
}) {
  return prisma.bookingNote.create({
    data: {
      bookingId: data.bookingId,
      body: data.body,
      visibility: data.visibility,
      authorUserId: data.authorUserId ?? null,
    },
  });
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function listCustomers(query: ListCustomersQuery): Promise<{
  items: Array<{
    id: string;
    email: string;
    phone: string | null;
    fullName: string | null;
    locale: string | null;
    isVip: boolean;
    createdAt: Date;
    _count: { bookings: number };
    lastBookingDate: Date | null;
  }>;
  nextCursor: string | null;
}> {
  const where: Prisma.CustomerWhereInput = query.search
    ? {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { fullName: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {};

  const rawItems = await prisma.customer.findMany({
    where,
    include: {
      _count: { select: { bookings: true } },
      bookings: {
        select: { serviceDateTime: true },
        orderBy: { serviceDateTime: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    take: query.pageSize + 1,
  });

  const hasMore = rawItems.length > query.pageSize;
  if (hasMore) rawItems.pop();

  const items = rawItems.map((c) => ({
    id: c.id,
    email: c.email,
    phone: c.phone,
    fullName: c.fullName,
    locale: c.locale,
    isVip: c.isVip,
    createdAt: c.createdAt,
    _count: c._count,
    lastBookingDate: c.bookings[0]?.serviceDateTime ?? null,
  }));

  return {
    items,
    nextCursor: hasMore && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
  };
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          airportService: {
            include: {
              airport: { include: { translations: true } },
              service: { include: { translations: true } },
            },
          },
        },
        orderBy: { serviceDateTime: 'desc' },
      },
    },
  });
}
