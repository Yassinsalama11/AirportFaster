import OpenAI from 'openai';
import { prisma } from '@airportfaster/db';
import { writeAuditLog } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import type {
  GenerateAirportDescriptionBody,
  GenerateMetaBody,
  GenerateFaqBody,
} from './validators.js';

// ── OpenAI client ─────────────────────────────────────────────────────────────

function getOpenAIClient(): OpenAI {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

const PROMPT_VERSION = '1.0';
const MODEL = 'gpt-4o-mini';

// ── Log to audit_logs (no ai_generation_logs table in schema) ─────────────────

async function logAiGeneration(params: {
  entityType: string;
  entityId: string;
  generationType: string;
  model: string;
  promptVersion: string;
  success: boolean;
  error?: string;
}): Promise<void> {
  await writeAuditLog({
    action: `ai_seo.generate.${params.generationType}`,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: {
      model: params.model,
      promptVersion: params.promptVersion,
      success: params.success,
      error: params.error,
    },
  });
}

// ── Airport Description Generation ────────────────────────────────────────────

export async function generateAirportDescription(body: GenerateAirportDescriptionBody): Promise<{
  workflowId: string;
  preview: { description: string };
}> {
  const airport = await prisma.airport.findUnique({
    where: { id: body.airportId },
    include: {
      translations: true,
      airportServices: {
        where: { isActive: true },
        include: { service: { include: { translations: true } } },
      },
    },
  });

  if (!airport) {
    throw new Error(`Airport not found: ${body.airportId}`);
  }

  const enName =
    airport.translations.find((t) => t.locale === body.locale)?.name ??
    airport.translations.find((t) => t.locale === 'en')?.name ??
    airport.city;

  const serviceNames = airport.airportServices
    .map(
      (as) =>
        as.service.translations.find((t) => t.locale === 'en')?.name ?? as.service.slug,
    )
    .join(', ');

  const prompt = `Write a compelling 200-word description for ${enName} (IATA: ${airport.iataCode}) located in ${airport.city}, ${airport.country}.
The airport offers the following premium services: ${serviceNames || 'airport assistance services'}.
Focus on the premium travel experience, convenience, and professionalism.
Write in second person (addressing travelers as "you"). Do not use markdown.`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a travel copywriter specialising in premium airport services. Write engaging, SEO-friendly content.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 400,
    temperature: 0.7,
  });

  const description = response.choices[0]?.message?.content?.trim() ?? '';

  // NOTE: The ContentApprovalWorkflow schema does not have a free-form
  // generatedContent field. For airport descriptions, we store the draft text
  // in the `notes` field and link to the airport's AirportSeo record via
  // `airportSeoId` if one exists. The entityType 'airport_seo' is the closest
  // match in the ContentWorkflowEntityType enum.
  let airportSeoId: string | undefined;
  const existingSeo = await prisma.airportSeo.findUnique({
    where: { airportId: body.airportId },
  });
  if (existingSeo) {
    airportSeoId = existingSeo.id;
  }

  const workflow = await prisma.contentApprovalWorkflow.create({
    data: {
      entityType: 'airport_seo',
      entityId: body.airportId,
      state: 'draft',
      source: 'ai',
      notes: JSON.stringify({
        generationType: 'airport_description',
        generatedContent: { description },
        generatedBy: MODEL,
        promptVersion: PROMPT_VERSION,
        locale: body.locale,
      }),
      ...(airportSeoId ? { airportSeoId } : {}),
    },
  });

  await logAiGeneration({
    entityType: 'airport',
    entityId: body.airportId,
    generationType: 'airport_description',
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    success: true,
  });

  logger.info({ workflowId: workflow.id, airportId: body.airportId }, 'AI airport description generated');

  return {
    workflowId: workflow.id,
    preview: { description },
  };
}

// ── Meta Generation ───────────────────────────────────────────────────────────

export async function generateMeta(body: GenerateMetaBody): Promise<{
  workflowId: string;
  preview: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
}> {
  let entityName = '';
  let entityContext = '';
  let workflowEntityType: 'airport_seo' | 'service_seo';
  let seoLinkId: string | undefined;

  if (body.entityType === 'airport' || body.entityType === 'airport_service') {
    const airport = await prisma.airport.findUnique({
      where: { id: body.entityId },
      include: { translations: true, seo: true },
    });
    if (!airport) throw new Error(`Airport not found: ${body.entityId}`);

    const enTrans = airport.translations.find((t) => t.locale === 'en');
    entityName = enTrans?.name ?? airport.city;
    entityContext = `Airport: ${entityName} (${airport.iataCode}), located in ${airport.city}, ${airport.country}`;
    workflowEntityType = 'airport_seo';
    seoLinkId = airport.seo?.id;
  } else {
    // service
    const service = await prisma.service.findUnique({
      where: { id: body.entityId },
      include: { translations: true, seo: true },
    });
    if (!service) throw new Error(`Service not found: ${body.entityId}`);

    const enTrans = service.translations.find((t) => t.locale === 'en');
    entityName = enTrans?.name ?? service.slug;
    entityContext = `Airport Service: ${entityName}`;
    workflowEntityType = 'service_seo';
    seoLinkId = service.seo?.id;
  }

  const prompt = `Generate SEO metadata for the following: ${entityContext}

Provide:
1. metaTitle: max 60 characters, compelling, includes brand "AirportFaster"
2. metaDescription: max 160 characters, descriptive and action-oriented
3. ogTitle: max 200 characters, slightly more descriptive than metaTitle
4. ogDescription: max 300 characters, engaging social share description

Respond with valid JSON only, no markdown:
{"metaTitle": "...", "metaDescription": "...", "ogTitle": "...", "ogDescription": "..."}`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an SEO specialist. Always respond with valid JSON only, no markdown.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 300,
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '{}';
  const parsed = JSON.parse(raw) as {
    metaTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
  };

  const preview = {
    metaTitle: (parsed['metaTitle'] ?? '').slice(0, 60),
    metaDescription: (parsed['metaDescription'] ?? '').slice(0, 160),
    ogTitle: (parsed['ogTitle'] ?? '').slice(0, 200),
    ogDescription: (parsed['ogDescription'] ?? '').slice(0, 300),
  };

  const workflow = await prisma.contentApprovalWorkflow.create({
    data: {
      entityType: workflowEntityType,
      entityId: body.entityId,
      state: 'draft',
      source: 'ai',
      notes: JSON.stringify({
        generationType: 'meta',
        generatedContent: preview,
        generatedBy: MODEL,
        promptVersion: PROMPT_VERSION,
        locale: body.locale,
      }),
      ...(workflowEntityType === 'airport_seo' && seoLinkId ? { airportSeoId: seoLinkId } : {}),
      ...(workflowEntityType === 'service_seo' && seoLinkId ? { serviceSeoId: seoLinkId } : {}),
    },
  });

  await logAiGeneration({
    entityType: body.entityType,
    entityId: body.entityId,
    generationType: 'meta',
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    success: true,
  });

  return { workflowId: workflow.id, preview };
}

// ── FAQ Generation ────────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

export async function generateFaq(body: GenerateFaqBody): Promise<{
  workflowId: string;
  preview: FaqItem[];
}> {
  const count = body.count ?? 5;

  const prompt = `Generate ${count} FAQ pairs (question and answer) for a premium airport services page about "${body.entityType}" (ID: ${body.entityId}).

Questions should be relevant to travelers booking airport services (fast track, meet & greet, lounge access, etc.).
Answers should be 2-4 sentences, helpful and reassuring.

Respond with valid JSON array only:
[{"question": "...", "answer": "..."}, ...]`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a travel FAQ writer. Always respond with a valid JSON array only, no markdown.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1000,
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '{"faqs":[]}';
  let faqs: FaqItem[] = [];
  try {
    const parsed = JSON.parse(raw) as { faqs?: FaqItem[] } | FaqItem[];
    faqs = Array.isArray(parsed) ? parsed : ((parsed as { faqs?: FaqItem[] })['faqs'] ?? []);
  } catch {
    faqs = [];
  }

  const workflow = await prisma.contentApprovalWorkflow.create({
    data: {
      entityType: 'airport_seo', // closest match — no 'airport' in enum
      entityId: body.entityId,
      state: 'draft',
      source: 'ai',
      notes: JSON.stringify({
        generationType: 'faq',
        generatedContent: { faqs },
        generatedBy: MODEL,
        promptVersion: PROMPT_VERSION,
        entityType: body.entityType,
        count,
      }),
    },
  });

  await logAiGeneration({
    entityType: body.entityType,
    entityId: body.entityId,
    generationType: 'faq',
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    success: true,
  });

  return { workflowId: workflow.id, preview: faqs };
}

// ── Workflow: list pending ────────────────────────────────────────────────────

export async function listAiWorkflows() {
  return prisma.contentApprovalWorkflow.findMany({
    where: { source: 'ai', state: 'draft' },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Workflow: approve ─────────────────────────────────────────────────────────

export async function approveWorkflow(id: string, reviewedById?: string) {
  const workflow = await prisma.contentApprovalWorkflow.findUnique({ where: { id } });
  if (!workflow) throw new Error(`Workflow not found: ${id}`);

  return prisma.contentApprovalWorkflow.update({
    where: { id },
    data: {
      state: 'approved',
      reviewedById: reviewedById ?? null,
      reviewedAt: new Date(),
    },
  });
}

// ── Workflow: reject ──────────────────────────────────────────────────────────

export async function rejectWorkflow(id: string, reviewedById?: string) {
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
