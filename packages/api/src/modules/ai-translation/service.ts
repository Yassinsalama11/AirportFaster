import OpenAI from 'openai';
import { prisma } from '@airportfaster/db';
import { writeAuditLog } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import type { GenerateTranslationBody } from './validators.js';

// ── OpenAI client ─────────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

const MODEL = 'gpt-4o-mini';

const TRANSLATION_SYSTEM_PROMPT =
  'You are a professional translator for a premium airport services platform. ' +
  'Translate accurately, maintaining a premium, professional tone. Return only the translated text.';

// ── Source content loaders ────────────────────────────────────────────────────

async function loadAirportSourceContent(
  entityId: string,
  fields: string[],
): Promise<Record<string, string>> {
  const airport = await prisma.airport.findUnique({
    where: { id: entityId },
    include: { translations: { where: { locale: 'en' } } },
  });
  if (!airport) throw new Error(`Airport not found: ${entityId}`);

  const enTranslation = airport.translations[0];
  const result: Record<string, string> = {};

  for (const field of fields) {
    if (field === 'name') {
      result['name'] = enTranslation?.name ?? airport.city;
    } else if (field === 'description') {
      result['description'] = enTranslation?.description ?? '';
    } else {
      result[field] = '';
    }
  }

  return result;
}

async function loadServiceSourceContent(
  entityId: string,
  fields: string[],
): Promise<Record<string, string>> {
  const service = await prisma.service.findUnique({
    where: { id: entityId },
    include: { translations: { where: { locale: 'en' } } },
  });
  if (!service) throw new Error(`Service not found: ${entityId}`);

  const enTranslation = service.translations[0];
  const result: Record<string, string> = {};

  for (const field of fields) {
    if (field === 'name') {
      result['name'] = enTranslation?.name ?? service.slug;
    } else if (field === 'description') {
      result['description'] = enTranslation?.description ?? '';
    } else {
      result[field] = '';
    }
  }

  return result;
}

async function loadPageSourceContent(
  entityId: string,
  fields: string[],
): Promise<Record<string, string>> {
  const page = await prisma.page.findUnique({
    where: { id: entityId },
    include: { translations: { where: { locale: 'en' } } },
  });
  if (!page) throw new Error(`Page not found: ${entityId}`);

  const enTranslation = page.translations[0];
  const result: Record<string, string> = {};

  for (const field of fields) {
    if (field === 'title') {
      result['title'] = enTranslation?.title ?? '';
    } else if (field === 'h1') {
      result['h1'] = enTranslation?.h1 ?? '';
    } else if (field === 'body') {
      result['body'] = enTranslation?.body ?? '';
    } else if (field === 'metaTitle') {
      result['metaTitle'] = enTranslation?.metaTitle ?? '';
    } else if (field === 'metaDescription') {
      result['metaDescription'] = enTranslation?.metaDescription ?? '';
    } else if (field === 'directAnswer') {
      result['directAnswer'] = enTranslation?.directAnswer ?? '';
    } else {
      result[field] = '';
    }
  }

  return result;
}

// ── Translation writer (used on approve) ─────────────────────────────────────

async function writeAirportTranslation(
  entityId: string,
  targetLocale: string,
  translations: Record<string, string>,
): Promise<void> {
  await prisma.airportTranslation.upsert({
    where: { airportId_locale: { airportId: entityId, locale: targetLocale } },
    update: {
      ...(translations['name'] !== undefined ? { name: translations['name'] } : {}),
      ...(translations['description'] !== undefined
        ? { description: translations['description'] }
        : {}),
    },
    create: {
      airportId: entityId,
      locale: targetLocale,
      name: translations['name'] ?? '',
      description: translations['description'] ?? null,
    },
  });
}

async function writeServiceTranslation(
  entityId: string,
  targetLocale: string,
  translations: Record<string, string>,
): Promise<void> {
  await prisma.serviceTranslation.upsert({
    where: { serviceId_locale: { serviceId: entityId, locale: targetLocale } },
    update: {
      ...(translations['name'] !== undefined ? { name: translations['name'] } : {}),
      ...(translations['description'] !== undefined
        ? { description: translations['description'] }
        : {}),
    },
    create: {
      serviceId: entityId,
      locale: targetLocale,
      name: translations['name'] ?? '',
      description: translations['description'] ?? null,
    },
  });
}

async function writePageTranslation(
  entityId: string,
  targetLocale: string,
  translations: Record<string, string>,
): Promise<void> {
  await prisma.pageTranslation.upsert({
    where: { pageId_locale: { pageId: entityId, locale: targetLocale } },
    update: {
      ...(translations['title'] !== undefined ? { title: translations['title'] } : {}),
      ...(translations['h1'] !== undefined ? { h1: translations['h1'] } : {}),
      ...(translations['body'] !== undefined ? { body: translations['body'] } : {}),
      ...(translations['metaTitle'] !== undefined
        ? { metaTitle: translations['metaTitle'] }
        : {}),
      ...(translations['metaDescription'] !== undefined
        ? { metaDescription: translations['metaDescription'] }
        : {}),
      ...(translations['directAnswer'] !== undefined
        ? { directAnswer: translations['directAnswer'] }
        : {}),
    },
    create: {
      pageId: entityId,
      locale: targetLocale,
      title: translations['title'] ?? '',
      h1: translations['h1'] ?? null,
      body: translations['body'] ?? null,
      metaTitle: translations['metaTitle'] ?? null,
      metaDescription: translations['metaDescription'] ?? null,
      directAnswer: translations['directAnswer'] ?? null,
    },
  });
}

// ── Generate translation ──────────────────────────────────────────────────────

export async function generateTranslation(body: GenerateTranslationBody): Promise<{
  workflowId: string;
  targetLocale: string;
  preview: Record<string, string>;
}> {
  // 1. Load source (English) content
  let sourceContent: Record<string, string>;
  if (body.entityType === 'airport') {
    sourceContent = await loadAirportSourceContent(body.entityId, body.fields);
  } else if (body.entityType === 'service') {
    sourceContent = await loadServiceSourceContent(body.entityId, body.fields);
  } else {
    sourceContent = await loadPageSourceContent(body.entityId, body.fields);
  }

  const openai = getOpenAIClient();
  const translations: Record<string, string> = {};

  // 2. Translate each field
  for (const field of body.fields) {
    const sourceText = sourceContent[field] ?? '';
    if (!sourceText.trim()) {
      translations[field] = '';
      continue;
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Translate the following to ${body.targetLocale}:\n\n${sourceText}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    translations[field] = response.choices[0]?.message?.content?.trim() ?? '';
  }

  // 3. Save to ContentApprovalWorkflow with entityType: 'translation_job'
  const workflow = await prisma.contentApprovalWorkflow.create({
    data: {
      entityType: 'translation_job',
      entityId: body.entityId,
      state: 'draft',
      source: 'ai',
      notes: JSON.stringify({
        sourceEntityType: body.entityType,
        targetLocale: body.targetLocale,
        fields: body.fields,
        translations,
        sourceContent,
        generatedBy: MODEL,
      }),
    },
  });

  await writeAuditLog({
    action: 'ai_translation.generate',
    entityType: body.entityType,
    entityId: body.entityId,
    metadata: {
      targetLocale: body.targetLocale,
      fields: body.fields,
      model: MODEL,
    },
  });

  logger.info(
    { workflowId: workflow.id, entityId: body.entityId, targetLocale: body.targetLocale },
    'AI translation generated',
  );

  return {
    workflowId: workflow.id,
    targetLocale: body.targetLocale,
    preview: translations,
  };
}

// ── List pending translation workflows ───────────────────────────────────────

export async function listTranslationWorkflows(status?: string) {
  return prisma.contentApprovalWorkflow.findMany({
    where: {
      entityType: 'translation_job',
      ...(status ? { state: status as never } : { state: 'draft' }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Approve translation workflow ──────────────────────────────────────────────

export async function approveTranslationWorkflow(
  id: string,
  reviewedById?: string,
  /** Optional edited translations from reviewer — overrides the stored AI draft */
  editedTranslations?: Record<string, string>,
) {
  const workflow = await prisma.contentApprovalWorkflow.findUnique({ where: { id } });
  if (!workflow) throw new Error(`Workflow not found: ${id}`);
  if (workflow.entityType !== 'translation_job') {
    throw new Error(`Workflow ${id} is not a translation job`);
  }

  // Parse the notes to get the translation data
  const notes = JSON.parse(workflow.notes ?? '{}') as Record<string, unknown>;
  const sourceEntityType = notes['sourceEntityType'] as string | undefined;
  const targetLocale = notes['targetLocale'] as string | undefined;
  // Use reviewer edits if provided; fall back to the original AI draft from notes
  const translations =
    editedTranslations ?? ((notes['translations'] ?? {}) as Record<string, string>);

  if (!sourceEntityType || !targetLocale) {
    throw new Error('Workflow notes are missing required translation metadata');
  }

  // Write translations to the actual translation tables
  if (sourceEntityType === 'airport') {
    await writeAirportTranslation(workflow.entityId, targetLocale, translations);
  } else if (sourceEntityType === 'service') {
    await writeServiceTranslation(workflow.entityId, targetLocale, translations);
  } else if (sourceEntityType === 'page') {
    await writePageTranslation(workflow.entityId, targetLocale, translations);
  }

  const updated = await prisma.contentApprovalWorkflow.update({
    where: { id },
    data: {
      state: 'approved',
      reviewedById: reviewedById ?? null,
      reviewedAt: new Date(),
    },
  });

  await writeAuditLog({
    action: 'ai_translation.approve',
    entityType: sourceEntityType,
    entityId: workflow.entityId,
    metadata: { workflowId: id, targetLocale },
  });

  return updated;
}

// ── Reject translation workflow ───────────────────────────────────────────────

export async function rejectTranslationWorkflow(id: string, reviewedById?: string) {
  const workflow = await prisma.contentApprovalWorkflow.findUnique({ where: { id } });
  if (!workflow) throw new Error(`Workflow not found: ${id}`);

  return prisma.contentApprovalWorkflow.update({
    where: { id },
    data: {
      state: 'rejected',
      reviewedById: reviewedById ?? null,
      reviewedAt: new Date(),
    },
  });
}
