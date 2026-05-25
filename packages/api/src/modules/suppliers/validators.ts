import { z } from 'zod';

// The DB enum is: pending | verified | suspended
export const SupplierStatusSchema = z.enum(['pending', 'verified', 'suspended']);

export const CreateSupplierBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  legalName: z.string().trim().min(1).max(300).optional(),
  countryCode: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2}$/, 'Country code must be ISO 3166-1 alpha-2')
    .transform((v) => v.toUpperCase())
    .optional(),
  payoutCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase())
    .optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  notes: z.string().trim().max(5000).optional(),
});

export const UpdateSupplierBodySchema = CreateSupplierBodySchema.partial().extend({
  status: SupplierStatusSchema.optional(),
});

export const ListSuppliersQuerySchema = z.object({
  status: SupplierStatusSchema.optional(),
  country: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2}$/)
    .transform((v) => v.toUpperCase())
    .optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const SupplierIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const SupplierContactIdParamsSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid(),
});

export const SupplierAirportParamsSchema = z.object({
  id: z.string().uuid(),
  airportId: z.string().uuid(),
});

export const SupplierServiceParamsSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
});

export const SupplierCoverageParamsSchema = z.object({
  id: z.string().uuid(),
  coverageId: z.string().uuid(),
});

export const CreateContactBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  isPrimary: z.boolean().optional(),
});

export const LinkAirportBodySchema = z.object({
  airportId: z.string().uuid(),
});

export const LinkServiceBodySchema = z.object({
  serviceId: z.string().uuid(),
});

export const AddCoverageBodySchema = z.object({
  airportServiceId: z.string().uuid(),
  priority: z.number().int().min(0).default(0),
});

export const DayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
  message: 'Time must be HH:MM (24h)',
});

export const SupplierAvailabilityDaySchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  openTime: timeStringSchema,
  closeTime: timeStringSchema,
  isAvailable: z.boolean(),
});

export const PutSupplierAvailabilityBodySchema = z.object({
  schedule: z.array(SupplierAvailabilityDaySchema).min(1).max(7),
});

export type CreateSupplierBody = z.infer<typeof CreateSupplierBodySchema>;
export type UpdateSupplierBody = z.infer<typeof UpdateSupplierBodySchema>;
export type ListSuppliersQuery = z.infer<typeof ListSuppliersQuerySchema>;
export type CreateContactBody = z.infer<typeof CreateContactBodySchema>;
export type AddCoverageBody = z.infer<typeof AddCoverageBodySchema>;
export type SupplierAvailabilityDay = z.infer<typeof SupplierAvailabilityDaySchema>;
export type PutSupplierAvailabilityBody = z.infer<typeof PutSupplierAvailabilityBodySchema>;
