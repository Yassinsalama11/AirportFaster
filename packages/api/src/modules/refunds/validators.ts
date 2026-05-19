import { z } from 'zod';

// Schema mapping notes:
// RefundType (schema): full | partial | none — spec's 'goodwill' mapped to 'partial' with reason
// RefundStatus (schema): requested | admin_approved | finance_approved | processing | completed | rejected
//   spec's pending→requested, succeeded→completed, failed/cancelled→rejected

// ── List Refunds Query ───────────────────────────────────────────────────────

export const ListRefundsQuerySchema = z.object({
  status: z
    .enum(['requested', 'admin_approved', 'finance_approved', 'processing', 'completed', 'rejected'])
    .optional(),
  bookingId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListRefundsQuery = z.infer<typeof ListRefundsQuerySchema>;

// ── Refund ID Params ─────────────────────────────────────────────────────────

export const RefundIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ── Initiate Refund Body ─────────────────────────────────────────────────────

export const InitiateAdminRefundBodySchema = z.object({
  bookingId: z.string().uuid(),
  // type: schema supports 'full' | 'partial' | 'none'; goodwill is handled as partial
  type: z.enum(['full', 'partial']),
  amountMinorUnits: z.number().int().min(1),
  reason: z.string().trim().min(1).max(1000),
});

export type InitiateAdminRefundBody = z.infer<typeof InitiateAdminRefundBodySchema>;
