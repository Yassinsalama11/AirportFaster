import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  service: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
  passengers: z.coerce.number().int().min(1).max(100).default(1),
  locale: z.string().min(2).max(10).default('en'),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
