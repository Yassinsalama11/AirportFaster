import { z } from 'zod';

// Schema mapping notes:
// IncidentType (schema): flight_delay | supplier_no_show | passenger_no_show | wrong_terminal |
//   communication_failure | payment_issue | service_complaint | other
// IncidentStatus (schema): created | assigned | in_progress | waiting_external | resolved | closed
//   spec's 'open'→created, 'investigating'→in_progress
// IncidentSeverity (schema): low | medium | high | critical  (matches spec)
// Incident has no 'title' or 'description' columns — description goes into first IncidentUpdate.body

// ── List Incidents Query ─────────────────────────────────────────────────────

export const ListIncidentsQuerySchema = z.object({
  status: z
    .enum(['created', 'assigned', 'in_progress', 'waiting_external', 'resolved', 'closed'])
    .optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  bookingId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListIncidentsQuery = z.infer<typeof ListIncidentsQuerySchema>;

// ── Incident ID Params ───────────────────────────────────────────────────────

export const IncidentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ── Create Incident Body ─────────────────────────────────────────────────────

export const CreateIncidentBodySchema = z.object({
  bookingId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  type: z.enum([
    'flight_delay',
    'supplier_no_show',
    'passenger_no_show',
    'wrong_terminal',
    'communication_failure',
    'payment_issue',
    'service_complaint',
    'other',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  // description goes into the first IncidentUpdate.body (no 'title'/'description' on Incident)
  description: z.string().trim().min(1).max(5000),
});

export type CreateIncidentBody = z.infer<typeof CreateIncidentBodySchema>;

// ── Add Update Body ──────────────────────────────────────────────────────────

export const AddIncidentUpdateBodySchema = z.object({
  note: z.string().trim().min(1).max(5000),
  // statusChange: use schema enum values
  statusChange: z
    .enum(['created', 'assigned', 'in_progress', 'waiting_external', 'resolved', 'closed'])
    .optional(),
});

export type AddIncidentUpdateBody = z.infer<typeof AddIncidentUpdateBodySchema>;

// ── Assign Body ──────────────────────────────────────────────────────────────

export const AssignIncidentBodySchema = z.object({
  userId: z.string().uuid().optional(),
  team: z
    .enum(['operations', 'support', 'finance', 'supplier_manager'])
    .optional(),
});

export type AssignIncidentBody = z.infer<typeof AssignIncidentBodySchema>;

// ── Resolve Body ─────────────────────────────────────────────────────────────

export const ResolveIncidentBodySchema = z.object({
  resolution: z.string().trim().min(1).max(5000),
});

export type ResolveIncidentBody = z.infer<typeof ResolveIncidentBodySchema>;
