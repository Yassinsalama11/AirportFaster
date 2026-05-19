import { Prisma } from '@airportfaster/db';
import type {
  ContentApprovalWorkflow,
  ContentWorkflowEntityType,
  ContentWorkflowSource,
  ContentWorkflowState,
} from '@airportfaster/db';
import {
  createWorkflowRecord,
  findWorkflowById,
  updateWorkflowRecord,
} from './repository.js';

export class ContentWorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ContentWorkflowError';
  }
}

const allowedTransitions: Record<ContentWorkflowState, ContentWorkflowState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['published'],
  published: [],
  rejected: ['draft'],
};

export interface CreateContentWorkflowInput {
  entityType: ContentWorkflowEntityType;
  entityId: string;
  source?: ContentWorkflowSource | undefined;
  state?: ContentWorkflowState | undefined;
  submittedById?: string | undefined;
  notes?: string | undefined;
}

export interface TransitionContentWorkflowInput {
  workflowId: string;
  nextState: ContentWorkflowState;
  actorUserId?: string | undefined;
  notes?: string | undefined;
}

function mapWorkflowPersistenceError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2003') {
      throw new ContentWorkflowError(
        'Referenced workflow entity or user does not exist',
        'CONTENT_WORKFLOW_REFERENCE_NOT_FOUND',
        400,
      );
    }

    if (error.code === 'P2025') {
      throw new ContentWorkflowError(
        'Content workflow not found',
        'CONTENT_WORKFLOW_NOT_FOUND',
        404,
      );
    }
  }

  throw error;
}

function assertTransitionAllowed(
  currentState: ContentWorkflowState,
  nextState: ContentWorkflowState,
) {
  if (!allowedTransitions[currentState].includes(nextState)) {
    throw new ContentWorkflowError(
      `Cannot transition content workflow from ${currentState} to ${nextState}`,
      'CONTENT_WORKFLOW_INVALID_TRANSITION',
      400,
    );
  }
}

export async function createContentWorkflow(
  input: CreateContentWorkflowInput,
): Promise<ContentApprovalWorkflow> {
  const source = input.source ?? 'human';
  const state = input.state ?? 'draft';

  if (source === 'ai' && state !== 'draft') {
    throw new ContentWorkflowError(
      'AI-generated content must enter the approval workflow in draft state',
      'AI_CONTENT_MUST_START_AS_DRAFT',
      400,
    );
  }

  if (input.entityType === 'translation_job') {
    throw new ContentWorkflowError(
      'translation_job workflow references are not available until the AI Translation Engine schema is implemented',
      'CONTENT_WORKFLOW_ENTITY_NOT_SUPPORTED',
      400,
    );
  }

  try {
    return await createWorkflowRecord({
      entityType: input.entityType,
      entityId: input.entityId,
      state,
      source,
      submittedById: input.submittedById,
      notes: input.notes,
    });
  } catch (error) {
    mapWorkflowPersistenceError(error);
  }
}

export async function getContentWorkflow(
  workflowId: string,
): Promise<ContentApprovalWorkflow> {
  const workflow = await findWorkflowById(workflowId);

  if (!workflow) {
    throw new ContentWorkflowError(
      'Content workflow not found',
      'CONTENT_WORKFLOW_NOT_FOUND',
      404,
    );
  }

  return workflow;
}

export async function transitionContentWorkflow(
  input: TransitionContentWorkflowInput,
): Promise<ContentApprovalWorkflow> {
  const workflow = await getContentWorkflow(input.workflowId);
  assertTransitionAllowed(workflow.state, input.nextState);

  const reviewState = input.nextState === 'approved' || input.nextState === 'rejected';

  try {
    return await updateWorkflowRecord(input.workflowId, {
      state: input.nextState,
      reviewedById: reviewState ? input.actorUserId : undefined,
      reviewedAt: reviewState ? new Date() : undefined,
      submittedById:
        input.nextState === 'in_review' ? input.actorUserId : undefined,
      notes: input.notes,
    });
  } catch (error) {
    mapWorkflowPersistenceError(error);
  }
}
