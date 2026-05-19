import { z } from 'zod';

export const SUPPORTED_TRANSLATION_LOCALES = ['ar', 'zh', 'fr', 'de', 'es', 'ja', 'ru'] as const;
export type SupportedTranslationLocale = (typeof SUPPORTED_TRANSLATION_LOCALES)[number];

export const GenerateTranslationBodySchema = z.object({
  entityType: z.enum(['airport', 'service', 'page']),
  entityId: z.string().uuid(),
  targetLocale: z.enum(SUPPORTED_TRANSLATION_LOCALES),
  fields: z.array(z.string().min(1)).min(1),
});

export const WorkflowIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const ListTranslationWorkflowsQuerySchema = z.object({
  status: z.enum(['draft', 'in_review', 'approved', 'published', 'rejected']).optional(),
});

export type GenerateTranslationBody = z.infer<typeof GenerateTranslationBodySchema>;
export type ListTranslationWorkflowsQuery = z.infer<typeof ListTranslationWorkflowsQuerySchema>;
