import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { prisma } from '@airportfaster/db';
import {
  ContentWorkflowError,
  createContentWorkflow,
  transitionContentWorkflow,
} from '../workflow.js';

const runId = `${Date.now()}-${process.pid}`;
const userEmail = `cms-reviewer-${runId}@airportfaster.test`;

let reviewerUserId: string;
let pageId: string;
let pageTranslationId: string;

before(async () => {
  const user = await prisma.user.create({
    data: {
      email: userEmail,
      passwordHash: 'not-used-in-workflow-tests',
      isActive: true,
    },
  });
  reviewerUserId = user.id;

  const page = await prisma.page.create({
    data: {
      type: 'guide',
      slug: `cms-workflow-test-${runId}`,
      status: 'draft',
      createdById: reviewerUserId,
      translations: {
        create: {
          locale: 'en',
          title: `CMS Workflow Test ${runId}`,
          h1: `CMS Workflow Test ${runId}`,
          body: 'Temporary page translation used by workflow integration tests.',
        },
      },
    },
    include: {
      translations: true,
    },
  });

  pageId = page.id;
  pageTranslationId = page.translations[0]!.id;
});

after(async () => {
  await prisma.page.deleteMany({ where: { id: pageId } });
  await prisma.user.deleteMany({ where: { email: userEmail } });
  await prisma.$disconnect();
});

test('AI-generated content must enter workflow as draft', async () => {
  const workflow = await createContentWorkflow({
    entityType: 'page_translation',
    entityId: pageTranslationId,
    source: 'ai',
  });

  assert.equal(workflow.state, 'draft');
  assert.equal(workflow.source, 'ai');

  await assert.rejects(
    createContentWorkflow({
      entityType: 'page_translation',
      entityId: pageTranslationId,
      source: 'ai',
      state: 'in_review',
    }),
    (error: unknown) =>
      error instanceof ContentWorkflowError &&
      error.code === 'AI_CONTENT_MUST_START_AS_DRAFT',
  );
});

test('workflow rejects invalid draft to published transition', async () => {
  const workflow = await createContentWorkflow({
    entityType: 'page_translation',
    entityId: pageTranslationId,
    source: 'human',
  });

  await assert.rejects(
    transitionContentWorkflow({
      workflowId: workflow.id,
      nextState: 'published',
      actorUserId: reviewerUserId,
    }),
    (error: unknown) =>
      error instanceof ContentWorkflowError &&
      error.code === 'CONTENT_WORKFLOW_INVALID_TRANSITION',
  );
});

test('workflow records reviewer metadata on approval and supports publish', async () => {
  const workflow = await createContentWorkflow({
    entityType: 'page_translation',
    entityId: pageTranslationId,
    source: 'human',
    submittedById: reviewerUserId,
  });

  const inReview = await transitionContentWorkflow({
    workflowId: workflow.id,
    nextState: 'in_review',
    actorUserId: reviewerUserId,
    notes: 'Ready for review',
  });
  assert.equal(inReview.state, 'in_review');
  assert.equal(inReview.submittedById, reviewerUserId);

  const approved = await transitionContentWorkflow({
    workflowId: workflow.id,
    nextState: 'approved',
    actorUserId: reviewerUserId,
    notes: 'Approved for publishing',
  });

  assert.equal(approved.state, 'approved');
  assert.equal(approved.reviewedById, reviewerUserId);
  assert.ok(approved.reviewedAt);

  const published = await transitionContentWorkflow({
    workflowId: workflow.id,
    nextState: 'published',
    actorUserId: reviewerUserId,
  });
  assert.equal(published.state, 'published');
});

test('workflow enforces concrete entity FK references', async () => {
  await assert.rejects(
    createContentWorkflow({
      entityType: 'page_translation',
      entityId: randomUUID(),
      source: 'human',
    }),
    (error: unknown) =>
      error instanceof ContentWorkflowError &&
      error.code === 'CONTENT_WORKFLOW_REFERENCE_NOT_FOUND',
  );
});
