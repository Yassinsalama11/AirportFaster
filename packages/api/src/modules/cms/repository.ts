import { prisma } from '@airportfaster/db';
import type {
  ContentApprovalWorkflow,
  ContentWorkflowEntityType,
  ContentWorkflowSource,
  ContentWorkflowState,
} from '@airportfaster/db';

export interface CreateWorkflowRecordInput {
  entityType: ContentWorkflowEntityType;
  entityId: string;
  state: ContentWorkflowState;
  source: ContentWorkflowSource;
  submittedById?: string | undefined;
  notes?: string | undefined;
}

export interface UpdateWorkflowRecordInput {
  state: ContentWorkflowState;
  reviewedById?: string | undefined;
  reviewedAt?: Date | undefined;
  submittedById?: string | undefined;
  notes?: string | undefined;
}

export async function findWorkflowById(
  id: string,
): Promise<ContentApprovalWorkflow | null> {
  return prisma.contentApprovalWorkflow.findUnique({
    where: { id },
  });
}

export async function createWorkflowRecord(
  input: CreateWorkflowRecordInput,
): Promise<ContentApprovalWorkflow> {
  return prisma.contentApprovalWorkflow.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      state: input.state,
      source: input.source,
      submittedById: input.submittedById,
      notes: input.notes,
      pageTranslationId:
        input.entityType === 'page_translation' ? input.entityId : undefined,
      airportSeoId: input.entityType === 'airport_seo' ? input.entityId : undefined,
      serviceSeoId: input.entityType === 'service_seo' ? input.entityId : undefined,
      faqId: input.entityType === 'faq' ? input.entityId : undefined,
    },
  });
}

export async function updateWorkflowRecord(
  id: string,
  input: UpdateWorkflowRecordInput,
): Promise<ContentApprovalWorkflow> {
  return prisma.contentApprovalWorkflow.update({
    where: { id },
    data: {
      state: input.state,
      submittedById: input.submittedById,
      reviewedById: input.reviewedById,
      reviewedAt: input.reviewedAt,
      notes: input.notes,
    },
  });
}
