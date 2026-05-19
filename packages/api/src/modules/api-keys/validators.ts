import { z } from 'zod';

export const VALID_SCOPES = ['search', 'bookings.read', 'bookings.write', 'pricing.read'] as const;
export type ApiScope = (typeof VALID_SCOPES)[number];

export const CreateApiKeyBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  supplierId: z.string().uuid().optional(),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1),
  rateLimit: z.number().int().min(1).max(100000).default(1000),
  expiresAt: z.string().datetime().optional(),
});

export const ApiKeyIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateApiKeyBody = z.infer<typeof CreateApiKeyBodySchema>;
