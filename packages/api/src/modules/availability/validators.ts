import { z } from 'zod';

export const AvailabilityStatusSchema = z.enum(['active', 'inactive']);
export const BlackoutScopeTypeSchema = z.enum(['airport', 'airport_service']);

export const TimeWindowSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
});

export const CreateAvailabilityRuleSchema = z.object({
  airportServiceId: z.string().uuid(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  timeWindows: z.array(TimeWindowSchema).min(1),
  cutOffMinutes: z.number().int().min(0).default(120),
  minNoticeMinutes: z.number().int().min(0).default(60),
  capacityPerSlot: z.number().int().min(1).optional().nullable(),
  status: AvailabilityStatusSchema.default('active'),
});

export const UpdateAvailabilityRuleSchema = CreateAvailabilityRuleSchema.partial();

export const CreateBlackoutDateSchema = z.object({
  scopeType: BlackoutScopeTypeSchema,
  scopeId: z.string().uuid(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reason: z.string().optional(),
});

export const CheckAvailabilityQuerySchema = z.object({
  airportServiceId: z.string().uuid(),
  dateTime: z.string().datetime(),
  passengers: z.coerce.number().int().min(1).default(1),
});

export type CreateAvailabilityRule = z.infer<typeof CreateAvailabilityRuleSchema>;
export type CheckAvailabilityQuery = z.infer<typeof CheckAvailabilityQuerySchema>;
