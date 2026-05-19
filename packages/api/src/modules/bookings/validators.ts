import { z } from 'zod';

// ── Passenger ────────────────────────────────────────────────────────────────

export const PassengerSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  type: z.enum(['adult', 'child', 'infant']),
  passportNumber: z.string().trim().max(30).optional(),
  nationality: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/)
    .optional(),
});

// ── Contact ──────────────────────────────────────────────────────────────────

export const ContactSchema = z.object({
  email: z.string().email(),
  phone: z.string().trim().min(4).max(30),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

// ── Flight ───────────────────────────────────────────────────────────────────

export const FlightSchema = z.object({
  direction: z.enum(['arrival', 'departure']),
  flightNumber: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{2,10}$/i)
    .max(10),
  airline: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{2,3}$/i)
    .max(3)
    .optional(), // IATA airline code
  scheduledAt: z.string().datetime({ offset: true }),
  origin: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/i)
    .optional(),
  destination: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/i)
    .optional(),
  terminal: z.string().trim().max(20).optional(),
});

// ── Create Booking ───────────────────────────────────────────────────────────

export const CreateBookingBodySchema = z.object({
  airportServiceId: z.string().uuid(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'serviceDate must be YYYY-MM-DD'),
  direction: z.enum(['arrival', 'departure', 'transit']).default('departure'),
  passengers: z.array(PassengerSchema).min(1).max(20),
  contact: ContactSchema,
  flight: FlightSchema.optional(),
  specialRequests: z.string().trim().max(2000).optional(),
  locale: z.string().min(2).max(10).default('en'),
  sessionId: z.string().trim().max(128).optional(),
});

export type CreateBookingBody = z.infer<typeof CreateBookingBodySchema>;

// ── Admin: Patch Status ──────────────────────────────────────────────────────

export const PatchBookingStatusBodySchema = z.object({
  status: z.enum([
    'pending_payment',
    'paid',
    'pending_supplier_assignment',
    'supplier_assigned',
    'pending_supplier_confirmation',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'refunded',
    'failed',
  ]),
  reason: z.string().trim().max(1000).optional(),
});

export type PatchBookingStatusBody = z.infer<typeof PatchBookingStatusBodySchema>;

// ── Admin: Add Note ──────────────────────────────────────────────────────────

export const AddNoteBodySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  visibility: z.enum(['internal', 'customer']),
});

export type AddNoteBody = z.infer<typeof AddNoteBodySchema>;

// ── Admin: List Bookings ─────────────────────────────────────────────────────

export const ListBookingsQuerySchema = z.object({
  status: z
    .enum([
      'draft',
      'pending_payment',
      'paid',
      'pending_supplier_assignment',
      'supplier_assigned',
      'pending_supplier_confirmation',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'refunded',
      'failed',
    ])
    .optional(),
  airportId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().max(200).optional(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListBookingsQuery = z.infer<typeof ListBookingsQuerySchema>;

// ── Params ───────────────────────────────────────────────────────────────────

export const BookingIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ManageTokenQuerySchema = z.object({
  token: z.string().min(1),
});

// ── Admin: Assign Supplier ───────────────────────────────────────────────────

export const AssignSupplierBodySchema = z.object({
  supplierId: z.string().uuid(),
});

export type AssignSupplierBody = z.infer<typeof AssignSupplierBodySchema>;

// ── Admin: List Customers ────────────────────────────────────────────────────

export const ListCustomersQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>;

export const CustomerIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ── Public: Cancel Booking via Manage Token ──────────────────────────────────

export const PublicCancelBookingBodySchema = z.object({
  token: z.string().min(1),
  bookingId: z.string().uuid(),
  reason: z.string().trim().max(1000).optional(),
});

export type PublicCancelBookingBody = z.infer<typeof PublicCancelBookingBodySchema>;
