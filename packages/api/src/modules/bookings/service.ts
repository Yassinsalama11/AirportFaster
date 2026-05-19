import crypto from 'crypto';
import { prisma } from '@airportfaster/db';
import { quote } from '../pricing/service.js';
import { calculateTax } from '../tax/service.js';
import type { CreateBookingBody, PatchBookingStatusBody, PublicCancelBookingBody } from './validators.js';
import type { BookingRecord } from './repository.js';
import {
  upsertCustomer,
  findAirportServiceById,
  generateUniqueReference,
  createBookingRecord,
  createPriceSnapshot,
  createStatusHistoryEntry,
  createPassengers,
  createFlight,
  createBookingEvent,
  findBookingById,
  findBookingByManageTokenHash,
  updateBookingStatus,
  createNote,
} from './repository.js';
import type { BookingStatus, PassengerType } from '@airportfaster/db';
import {
  sendBookingConfirmedEmail,
  sendBookingCancelledEmail,
  sendBookingAssignedToSupplierEmail,
} from '../notifications/service.js';
import type { BookingNotificationData } from '../notifications/types.js';

// ── Error class ───────────────────────────────────────────────────────────────

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

// ── Allowed status transitions ────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<string, BookingStatus[]> = {
  draft: ['pending_payment', 'cancelled'],
  pending_payment: ['paid', 'cancelled', 'failed'],
  paid: ['pending_supplier_assignment', 'cancelled', 'refunded'],
  pending_supplier_assignment: ['supplier_assigned', 'cancelled'],
  supplier_assigned: ['pending_supplier_confirmation', 'cancelled'],
  pending_supplier_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
  failed: ['cancelled'],
};

function isTransitionAllowed(from: BookingStatus, to: BookingStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Create Booking ────────────────────────────────────────────────────────────

export async function createBookingService(data: CreateBookingBody): Promise<{
  bookingId: string;
  bookingReference: string;
  manageToken: string;
  totalMinorUnits: number;
  currency: string;
  status: string;
}> {
  // 1. Validate airport service exists and is active.
  const airportService = await findAirportServiceById(data.airportServiceId);
  if (!airportService || !airportService.isActive) {
    throw new BookingError(
      'Airport service not found or inactive',
      'AIRPORT_SERVICE_NOT_FOUND',
      404,
    );
  }

  // 2. Compute price via shared quote().
  const priceResult = await quote({
    airportServiceId: data.airportServiceId,
    passengers: data.passengers.length,
    currency: 'EUR',
  });

  if (!priceResult) {
    throw new BookingError(
      'No pricing available for this service',
      'NO_PRICING_AVAILABLE',
      422,
    );
  }

  // 2b. Calculate tax based on airport country.
  const taxResult = await calculateTax(
    airportService.airport.country,
    airportService.service.slug,
    priceResult.customerPriceMinor,
  ).catch(() => ({
    taxRatePercent: 0,
    taxMinorUnits: 0,
    totalWithTaxMinorUnits: priceResult.customerPriceMinor,
    taxType: 'none',
  }));

  const totalWithTax = taxResult.totalWithTaxMinorUnits;

  // 3. Upsert customer.
  const customer = await upsertCustomer({
    email: data.contact.email,
    phone: data.contact.phone,
    fullName: `${data.contact.firstName} ${data.contact.lastName}`.trim(),
    locale: data.locale,
  });

  // 4. Generate reference and manage token.
  const reference = await generateUniqueReference();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  // 5. Determine service datetime from serviceDate.
  const serviceDateTime = new Date(`${data.serviceDate}T00:00:00Z`);

  // 6. Create booking record.
  const booking = await createBookingRecord({
    reference,
    customerId: customer.id,
    airportServiceId: data.airportServiceId,
    direction: data.direction,
    serviceDateTime,
    passengerCount: data.passengers.length,
    specialRequests: data.specialRequests,
    locale: data.locale,
    currency: priceResult.displayCurrency,
    totalMinor: totalWithTax,
    manageTokenHash: tokenHash,
  });

  // 7. Snapshot price.
  await createPriceSnapshot({
    bookingId: booking.id,
    basePriceMinor: priceResult.customerPriceMinor,
    supplierCostMinor: priceResult.supplierCostMinor,
    markupMinor: priceResult.markupMinor,
    discountMinor: priceResult.discountMinor,
    taxEstimateMinor: taxResult.taxMinorUnits,
    totalMinor: totalWithTax,
    marginMinor: priceResult.marginMinor,
    currency: priceResult.displayCurrency,
    pricingRuleId: priceResult.appliedRuleId,
  });

  // 8. Create initial status history entry.
  await createStatusHistoryEntry({
    bookingId: booking.id,
    fromStatus: null,
    toStatus: 'draft',
    actorType: 'system',
  });

  // 9. Create passenger records.
  // Note: BookingPassenger only has fullName, type, notes in schema.
  // We concatenate firstName+lastName and store passport/nationality in notes JSON.
  await createPassengers(
    booking.id,
    data.passengers.map((p) => {
      const extra: Record<string, string> = {};
      if (p.passportNumber) extra['passportNumber'] = p.passportNumber;
      if (p.nationality) extra['nationality'] = p.nationality;
      return {
        fullName: `${p.firstName} ${p.lastName}`.trim(),
        type: p.type as PassengerType,
        notes: Object.keys(extra).length ? JSON.stringify(extra) : undefined,
      };
    }),
  );

  // 10. Create flight if provided.
  if (data.flight) {
    await createFlight({
      bookingId: booking.id,
      flightNumber: data.flight.flightNumber.toUpperCase(),
      airlineCode: data.flight.airline?.toUpperCase(),
      scheduledTime: new Date(data.flight.scheduledAt),
      terminal: data.flight.terminal,
    });
  }

  // 11. Create booking_created event.
  await createBookingEvent({
    bookingId: booking.id,
    type: 'booking_created',
    payload: { actorType: 'system', reference },
  });

  return {
    bookingId: booking.id,
    bookingReference: booking.reference,
    manageToken: rawToken,
    totalMinorUnits: totalWithTax,
    currency: priceResult.displayCurrency,
    status: booking.status,
  };
}

// ── Get booking by manage token ───────────────────────────────────────────────

export async function getBookingByManageTokenService(
  rawToken: string,
): Promise<BookingRecord> {
  const tokenHash = hashToken(rawToken);
  const booking = await findBookingByManageTokenHash(tokenHash);
  if (!booking) {
    throw new BookingError('Booking not found', 'BOOKING_NOT_FOUND', 404);
  }
  return booking;
}

// ── Admin: get booking ────────────────────────────────────────────────────────

export async function getBookingByIdService(id: string): Promise<BookingRecord> {
  const booking = await findBookingById(id);
  if (!booking) {
    throw new BookingError('Booking not found', 'BOOKING_NOT_FOUND', 404);
  }
  return booking;
}

// ── Notification helpers ──────────────────────────────────────────────────────

async function buildNotificationData(booking: BookingRecord): Promise<BookingNotificationData> {
  const enTranslation =
    booking.airportService.airport.translations.find((t) => t.locale === 'en') ??
    booking.airportService.airport.translations[0];
  const svcTranslation =
    booking.airportService.service.translations.find((t) => t.locale === 'en') ??
    booking.airportService.service.translations[0];

  // Load supplier primary contact if supplier is assigned
  let supplierName: string | undefined;
  let supplierContactEmail: string | undefined;
  if (booking.supplierId) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: booking.supplierId },
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });
    if (supplier) {
      supplierName = supplier.name;
      const primaryContact = supplier.contacts[0];
      supplierContactEmail = primaryContact?.email ?? undefined;
    }
  }

  const fullName = booking.customer.fullName ?? '';
  const nameParts = fullName.split(' ');
  const customerFirstName = nameParts[0] ?? fullName;
  const customerLastName = nameParts.slice(1).join(' ') || customerFirstName;

  return {
    bookingId: booking.id,
    bookingReference: booking.reference,
    customerFirstName,
    customerLastName,
    customerEmail: booking.customer.email ?? '',
    airportName: enTranslation?.name ?? booking.airportService.airport.city,
    airportIataCode: booking.airportService.airport.iataCode,
    serviceName: svcTranslation?.name ?? booking.airportService.service.slug,
    serviceDateTime: booking.serviceDateTime,
    totalMinorUnits: booking.totalMinor,
    currency: booking.currency,
    supplierName,
    supplierContactEmail,
  };
}

async function dispatchBookingNotification(
  newStatus: BookingStatus,
  booking: BookingRecord,
): Promise<void> {
  try {
    const data = await buildNotificationData(booking);
    if (newStatus === 'confirmed') {
      await sendBookingConfirmedEmail(data);
    } else if (newStatus === 'cancelled') {
      await sendBookingCancelledEmail(data);
    } else if (newStatus === 'supplier_assigned') {
      await sendBookingAssignedToSupplierEmail(data);
    }
  } catch (error) {
    // Notification failures must never block status transitions
    const { logger } = await import('../../lib/logger.js');
    logger.error({ error, bookingId: booking.id, newStatus }, 'Notification dispatch failed');
  }
}

// ── Admin: update status ──────────────────────────────────────────────────────

export async function patchBookingStatusService(
  id: string,
  body: PatchBookingStatusBody,
  actorId?: string,
): Promise<BookingRecord> {
  const booking = await getBookingByIdService(id);
  const currentStatus = booking.status;
  const newStatus = body.status as BookingStatus;

  if (!isTransitionAllowed(currentStatus, newStatus)) {
    throw new BookingError(
      `Transition from '${currentStatus}' to '${newStatus}' is not allowed`,
      'INVALID_STATUS_TRANSITION',
      422,
    );
  }

  const updated = await updateBookingStatus(id, newStatus);

  await createStatusHistoryEntry({
    bookingId: id,
    fromStatus: currentStatus,
    toStatus: newStatus,
    actorType: 'staff',
    actorId,
    reason: body.reason,
  });

  await createBookingEvent({
    bookingId: id,
    type: 'status_changed',
    payload: { from: currentStatus, to: newStatus, actorType: 'staff', actorId: actorId ?? null },
  });

  // Fire-and-forget notifications (best-effort, never block status transition)
  void dispatchBookingNotification(newStatus, updated);

  return updated;
}

// ── Booking Lifecycle: advance to supplier assignment ─────────────────────────

export async function advanceToSupplierAssignment(bookingId: string): Promise<void> {
  const { findBestSupplier } = await import('../suppliers/assignment-rules.js');

  // 1. Load booking with airportService (to get airportId)
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      airportService: {
        select: { airportId: true },
      },
    },
  });

  if (!booking) {
    throw new BookingError('Booking not found', 'BOOKING_NOT_FOUND', 404);
  }

  // 2. Use rule-based engine to find the best eligible supplier
  const supplierId = await findBestSupplier({
    airportServiceId: booking.airportServiceId,
    airportId: booking.airportService.airportId,
    serviceDate: booking.serviceDateTime,
    passengerCount: booking.passengerCount,
  });

  if (supplierId) {
    // 3. Eligible supplier found — auto-assign
    await prisma.$transaction(async (tx) => {
      // Create BookingSupplierAssignment
      await tx.bookingSupplierAssignment.create({
        data: {
          bookingId,
          supplierId,
          assignmentMethod: 'rule_based',
          status: 'offered',
        },
      });

      // Update Booking.supplierId and status
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          supplierId,
          status: 'supplier_assigned',
        },
      });

      // Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus: 'supplier_assigned',
          actorType: 'system',
        },
      });

      // Create BookingEvent
      await tx.bookingEvent.create({
        data: {
          bookingId,
          type: 'supplier_auto_assigned',
          payload: {
            actorType: 'system',
            supplierId,
          },
        },
      });
    });

    // Fire-and-forget notification to supplier (best-effort, load full booking for data)
    void getBookingByIdService(bookingId)
      .then((fullBooking) => dispatchBookingNotification('supplier_assigned', fullBooking))
      .catch(() => undefined);
  } else {
    // 4. No eligible supplier found — stay pending_supplier_assignment, emit event for manual assignment
    await createBookingEvent({
      bookingId,
      type: 'awaiting_manual_assignment',
      payload: {
        actorType: 'system',
        airportServiceId: booking.airportServiceId,
        reason: 'no_eligible_supplier',
      },
    });
  }
}

// ── Admin: manual supplier assignment ────────────────────────────────────────

export async function assignSupplierService(
  bookingId: string,
  supplierId: string,
  assignedBy?: string,
): Promise<BookingRecord> {
  const booking = await getBookingByIdService(bookingId);

  // Validate supplier exists and has coverage for this airportService
  const coverage = await prisma.supplierCoverage.findFirst({
    where: {
      supplierId,
      airportServiceId: booking.airportServiceId,
    },
    include: { supplier: true },
  });

  if (!coverage) {
    throw new BookingError(
      'Supplier does not have coverage for this airport service',
      'NO_SUPPLIER_COVERAGE',
      422,
    );
  }

  const previousStatus = booking.status;

  await prisma.$transaction(async (tx) => {
    // Create BookingSupplierAssignment (manual)
    await tx.bookingSupplierAssignment.create({
      data: {
        bookingId,
        supplierId,
        assignedBy: assignedBy ?? null,
        assignmentMethod: 'manual',
        status: 'offered',
      },
    });

    // Update Booking.supplierId and status
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        supplierId,
        status: 'supplier_assigned',
      },
    });

    // Create BookingStatusHistory
    await tx.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: previousStatus,
        toStatus: 'supplier_assigned',
        actorType: 'staff',
        actorId: assignedBy ?? null,
      },
    });

    // Create BookingEvent
    await tx.bookingEvent.create({
      data: {
        bookingId,
        type: 'supplier_manually_assigned',
        payload: {
          actorType: 'staff',
          supplierId,
          assignedBy: assignedBy ?? null,
        },
      },
    });
  });

  const updated = await getBookingByIdService(bookingId);

  // Fire-and-forget notification to supplier contact (best-effort)
  void dispatchBookingNotification('supplier_assigned', updated);

  return updated;
}

// ── Public: cancel booking via manage token ───────────────────────────────────

export async function publicCancelBookingService(
  body: PublicCancelBookingBody,
): Promise<{ success: boolean }> {
  // 1. Validate manage token (hash + lookup)
  const tokenHash = hashToken(body.token);
  const booking = await findBookingByManageTokenHash(tokenHash);

  if (!booking) {
    throw new BookingError('Invalid or expired manage token', 'INVALID_TOKEN', 401);
  }

  if (booking.id !== body.bookingId) {
    throw new BookingError('Token does not match booking', 'TOKEN_MISMATCH', 403);
  }

  // 2. Check booking is cancellable (not completed/cancelled/refunded/failed)
  const nonCancellableStatuses: BookingStatus[] = ['completed', 'cancelled', 'refunded', 'failed'];
  if (nonCancellableStatuses.includes(booking.status)) {
    throw new BookingError(
      `Booking cannot be cancelled in status '${booking.status}'`,
      'BOOKING_NOT_CANCELLABLE',
      422,
    );
  }

  // 2b. 24-hour rule: cancellation requests within 24h of service are blocked.
  //     Customer should be shown a notice from the UI before calling this endpoint;
  //     this is the server-side enforcement.
  const hoursUntilService = (booking.serviceDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilService < 24 && hoursUntilService > 0) {
    throw new BookingError(
      `Cancellation is no longer available — service is in less than 24 hours. Please contact support.`,
      'WITHIN_24H_WINDOW',
      422,
    );
  }

  // 3. Update booking status → 'cancelled'
  await updateBookingStatus(booking.id, 'cancelled');
  await createStatusHistoryEntry({
    bookingId: booking.id,
    fromStatus: booking.status,
    toStatus: 'cancelled',
    actorType: 'customer',
    reason: body.reason,
  });
  await createBookingEvent({
    bookingId: booking.id,
    type: 'status_changed',
    payload: {
      from: booking.status,
      to: 'cancelled',
      actorType: 'customer',
      reason: body.reason ?? null,
    },
  });

  // 4. Initiate automatic refund (best-effort — failure does not block cancellation)
  try {
    const { initiateAdminRefundService } = await import('../refunds/service.js');
    const { findPaymentByBookingId } = await import('../refunds/repository.js');
    const payment = await findPaymentByBookingId(booking.id);
    if (payment && payment.amountMinor > 0 && payment.stripePaymentIntentId) {
      await initiateAdminRefundService(
        {
          bookingId: booking.id,
          type: 'full',
          amountMinorUnits: payment.amountMinor,
          reason: body.reason ?? 'Customer requested cancellation',
        },
        undefined, // no actor (customer action)
      );
    }
  } catch (refundError) {
    const { logger } = await import('../../lib/logger.js');
    logger.error({ refundError, bookingId: booking.id }, 'Auto-refund on cancellation failed');
  }

  // 5. Notify admin team (fire-and-forget — never block customer cancellation)
  try {
    const { sendCancellationAdminNotification } = await import('../notifications/service.js');
    void sendCancellationAdminNotification(booking.id, body.reason);
  } catch {
    /* swallow */
  }

  return { success: true };
}

// ── Admin: add note ───────────────────────────────────────────────────────────

export async function addNoteService(
  id: string,
  body: { body: string; visibility: 'internal' | 'customer' },
  authorUserId?: string,
) {
  await getBookingByIdService(id);

  return createNote({
    bookingId: id,
    body: body.body,
    visibility: body.visibility,
    authorUserId,
  });
}

// ── Public: lookup booking by reference + email ───────────────────────────────

/**
 * Customer-facing lookup. Returns the booking plus a fresh manage token so the
 * UI can authenticate subsequent edit/cancel/complaint calls without asking the
 * user to enter their reference each time.
 */
export async function lookupBookingByReferenceService(
  reference: string,
  email: string,
): Promise<{ booking: BookingRecord; manageToken: string }> {
  const trimmedRef = reference.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  const booking = await prisma.booking.findFirst({
    where: {
      reference: trimmedRef,
      customer: { email: normalizedEmail },
    },
    include: {
      customer: true,
      airportService: {
        include: {
          airport: { include: { translations: true } },
          service: { include: { translations: true } },
        },
      },
      passengers: true,
      flights: true,
      priceSnapshot: true,
      supplier: { select: { id: true, name: true } },
    },
  });

  if (!booking) {
    // Generic message — don't leak whether the reference or email was wrong.
    throw new BookingError(
      'No booking found with that reference and email.',
      'BOOKING_NOT_FOUND',
      404,
    );
  }

  // Mint a fresh manage token (7 days) so the customer doesn't need to keep
  // sending their email/reference for every action.
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      manageTokenHash: tokenHash,
      manageTokenExpiresAt: expiresAt,
    },
  });

  const fullBooking = await findBookingById(booking.id);
  if (!fullBooking) {
    throw new BookingError('Booking lookup failed', 'INTERNAL_ERROR', 500);
  }

  return { booking: fullBooking, manageToken: rawToken };
}

// ── Public: edit booking (passenger names + service date) ─────────────────────

export interface PublicEditBookingBody {
  token: string;
  bookingId: string;
  serviceDateTime?: string; // ISO
  passengers?: Array<{ id: string; fullName: string }>;
}

export async function publicEditBookingService(
  body: PublicEditBookingBody,
): Promise<{ success: boolean }> {
  const tokenHash = hashToken(body.token);
  const booking = await findBookingByManageTokenHash(tokenHash);
  if (!booking) {
    throw new BookingError('Invalid or expired manage token', 'INVALID_TOKEN', 401);
  }
  if (booking.id !== body.bookingId) {
    throw new BookingError('Token does not match booking', 'TOKEN_MISMATCH', 403);
  }

  // Block edits on terminal states
  const lockedStatuses: BookingStatus[] = ['completed', 'cancelled', 'refunded', 'failed', 'in_progress'];
  if (lockedStatuses.includes(booking.status)) {
    throw new BookingError(
      `Booking can't be edited in status '${booking.status}'.`,
      'BOOKING_LOCKED',
      422,
    );
  }

  // 24h rule on date changes too — protects supplier scheduling.
  if (body.serviceDateTime) {
    const newDate = new Date(body.serviceDateTime);
    if (Number.isNaN(newDate.getTime())) {
      throw new BookingError('Invalid serviceDateTime', 'INVALID_DATE', 422);
    }
    const hoursUntilNew = (newDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const hoursUntilCurrent = (booking.serviceDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilNew < 24 || hoursUntilCurrent < 24) {
      throw new BookingError(
        'Date changes are not available within 24 hours of service. Please contact support.',
        'WITHIN_24H_WINDOW',
        422,
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    if (body.serviceDateTime) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { serviceDateTime: new Date(body.serviceDateTime) },
      });
    }
    if (body.passengers && body.passengers.length > 0) {
      for (const p of body.passengers) {
        await tx.bookingPassenger.update({
          where: { id: p.id },
          data: { fullName: p.fullName.trim() },
        });
      }
    }
    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: 'booking_edited',
        payload: {
          actorType: 'customer',
          changes: {
            serviceDateTime: body.serviceDateTime ?? null,
            passengerCount: body.passengers?.length ?? 0,
          },
        },
      },
    });
  });

  return { success: true };
}

// ── Public: submit complaint → creates incident + emails admin ────────────────

export interface PublicComplaintBody {
  token: string;
  bookingId: string;
  category:
    | 'service_complaint'
    | 'supplier_no_show'
    | 'wrong_terminal'
    | 'communication_failure'
    | 'other';
  message: string;
}

export async function publicSubmitComplaintService(
  body: PublicComplaintBody,
): Promise<{ success: boolean; incidentId: string }> {
  const tokenHash = hashToken(body.token);
  const booking = await findBookingByManageTokenHash(tokenHash);
  if (!booking) {
    throw new BookingError('Invalid or expired manage token', 'INVALID_TOKEN', 401);
  }
  if (booking.id !== body.bookingId) {
    throw new BookingError('Token does not match booking', 'TOKEN_MISMATCH', 403);
  }

  const { createIncidentService } = await import('../incidents/service.js');
  const incident = await createIncidentService({
    bookingId: booking.id,
    type: body.category,
    severity: 'medium',
    description: body.message,
  });

  // Email admin team (fire-and-forget)
  try {
    const { sendComplaintAdminNotification } = await import('../notifications/service.js');
    void sendComplaintAdminNotification(booking.id, body.category, body.message);
  } catch {
    /* swallow */
  }

  return { success: true, incidentId: incident.id };
}

