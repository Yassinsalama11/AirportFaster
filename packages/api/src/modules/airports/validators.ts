import { z } from 'zod';

const optionalDecimalNumber = z
  .number()
  .finite()
  .optional();

export const AirportStatusSchema = z.enum(['draft', 'active', 'inactive']);

export const AirportTranslationSchema = z.object({
  locale: z.string().min(2).max(10),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).optional(),
});

export const AirportImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().trim().max(240).optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const AirportServiceSchema = z.object({
  serviceId: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export const CreateAirportBodySchema = z.object({
  iataCode: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{3}$/, 'IATA code must be 3 letters')
    .transform((value) => value.toUpperCase()),
  icaoCode: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{4}$/, 'ICAO code must be 4 letters')
    .transform((value) => value.toUpperCase())
    .optional(),
  country: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2}$/, 'Country must be an ISO 3166-1 alpha-2 code')
    .transform((value) => value.toUpperCase()),
  city: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(80),
  latitude: optionalDecimalNumber,
  longitude: optionalDecimalNumber,
  translations: z.array(AirportTranslationSchema).min(1),
  images: z.array(AirportImageSchema).optional(),
  airportServices: z.array(AirportServiceSchema).optional(),
});

export const UpdateAirportBodySchema = CreateAirportBodySchema.partial().extend({
  status: AirportStatusSchema.optional(),
  regenerateSlug: z.boolean().optional(),
});

export const ListAirportsQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: AirportStatusSchema.optional(),
  country: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2}$/)
    .transform((value) => value.toUpperCase())
    .optional(),
  serviceId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['createdAt', 'city', 'country', 'iataCode']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

export const AirportIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateAirportBody = z.infer<typeof CreateAirportBodySchema>;
export type UpdateAirportBody = z.infer<typeof UpdateAirportBodySchema>;
export type ListAirportsQuery = z.infer<typeof ListAirportsQuerySchema>;
