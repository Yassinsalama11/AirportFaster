import { z } from 'zod';

// ── Create Payment Intent ────────────────────────────────────────────────────

export const CreatePaymentIntentBodySchema = z.object({
  bookingId: z.string().uuid(),
  // Optional override — when omitted, the booking's snapshot currency is used.
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/i)
    .transform((v) => v.toUpperCase())
    .optional(),
});

export type CreatePaymentIntentBody = z.infer<typeof CreatePaymentIntentBodySchema>;

// ── Admin: List Payments ─────────────────────────────────────────────────────

export const ListPaymentsQuerySchema = z.object({
  status: z
    .enum(['requires_payment', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded'])
    .optional(),
  bookingId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListPaymentsQuery = z.infer<typeof ListPaymentsQuerySchema>;

// ── Admin: Payment ID Params ─────────────────────────────────────────────────

export const PaymentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ── Admin: Initiate Refund ───────────────────────────────────────────────────

export const InitiateRefundBodySchema = z.object({
  amountMinorUnits: z.number().int().min(1),
  reason: z.string().trim().min(1).max(1000),
});

export type InitiateRefundBody = z.infer<typeof InitiateRefundBodySchema>;
