import { z } from 'zod';

export const GenerateAirportDescriptionBodySchema = z.object({
  airportId: z.string().uuid(),
  locale: z.string().min(2).max(10).optional().default('en'),
});

export const GenerateMetaBodySchema = z.object({
  entityType: z.enum(['airport', 'service', 'airport_service']),
  entityId: z.string().uuid(),
  locale: z.string().min(2).max(10).optional().default('en'),
});

export const GenerateFaqBodySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  count: z.number().int().min(1).max(10).optional().default(5),
});

export const WorkflowIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type GenerateAirportDescriptionBody = z.infer<typeof GenerateAirportDescriptionBodySchema>;
export type GenerateMetaBody = z.infer<typeof GenerateMetaBodySchema>;
export type GenerateFaqBody = z.infer<typeof GenerateFaqBodySchema>;
