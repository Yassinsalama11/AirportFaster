'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowReviewPanel } from '@/components/admin/ai/WorkflowReviewPanel';
import type { WorkflowRecord } from '@/components/admin/ai/WorkflowReviewPanel';

interface AiQueueClientProps {
  seoWorkflows: WorkflowRecord[];
  translationWorkflows: WorkflowRecord[];
}

type TabId = 'seo' | 'translations';
type StatusFilter = 'all' | 'draft' | 'approved' | 'rejected';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  in_review: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  approved: 'bg-green-500/20 text-green-400 border border-green-500/30',
  published: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

function parseNotes(notes: string | null): Record<string, unknown> {
  if (!notes) return {};
  try {
    return JSON.parse(notes) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getEntityLabel(w: WorkflowRecord): string {
  const parsed = parseNotes(w.notes);
  const entityType =
    (parsed['sourceEntityType'] as string | undefined) ?? w.entityType;
  return entityType.replace(/_/g, ' ');
}

function getTypeLabel(w: WorkflowRecord): string {
  const parsed = parseNotes(w.notes);
  const genType = parsed['generationType'] as string | undefined;
  if (genType) return genType.replace(/_/g, ' ');
  return w.entityType.replace(/_/g, ' ');
}

function getTargetLocale(w: WorkflowRecord): string {
  const parsed = parseNotes(w.notes);
  return (parsed['targetLocale'] as string | undefined) ?? '—';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function WorkflowTable({
  workflows,
  showLocale,
  onReview,
}: {
  workflows: WorkflowRecord[];
  showLocale: boolean;
  onReview: (w: WorkflowRecord) => void;
}) {
  if (workflows.length === 0) {
    return (
      <div className="bg-brand-navy border border-white/5 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No workflows found.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Entity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Type
            </th>
            {showLocale && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Target Locale
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {workflows.map((w) => (
            <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 text-gray-200 font-mono text-xs">
                <div className="font-medium text-sm text-gray-200 font-sans">
                  {getEntityLabel(w)}
                </div>
                <div className="text-gray-500 font-mono">{w.entityId.slice(0, 8)}…</div>
              </td>
              <td className="px-4 py-3 text-gray-300 capitalize">{getTypeLabel(w)}</td>
              {showLocale && (
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-gray-200 text-xs uppercase">
                    {getTargetLocale(w)}
                  </span>
                </td>
              )}
              <td className="px-4 py-3 text-gray-400">{formatDate(w.createdAt)}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[w.state] ?? 'bg-gray-500/20 text-gray-400'}`}
                >
                  {w.state}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onReview(w)}
                  className="px-3 py-1 rounded-lg border border-white/20 text-xs text-gray-300 hover:bg-white/5 hover:text-brand-white transition-colors"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AiQueueClient({ seoWorkflows, translationWorkflows }: AiQueueClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('seo');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reviewing, setReviewing] = useState<WorkflowRecord | null>(null);

  const filterWorkflows = useCallback(
    (workflows: WorkflowRecord[]) => {
      if (statusFilter === 'all') return workflows;
      return workflows.filter((w) => w.state === statusFilter);
    },
    [statusFilter],
  );

  const filteredSeo = filterWorkflows(seoWorkflows);
  const filteredTranslations = filterWorkflows(translationWorkflows);

  const currentWorkflows = activeTab === 'seo' ? filteredSeo : filteredTranslations;

  function handleReview(w: WorkflowRecord) {
    setReviewing(w);
  }

  function handleClose() {
    setReviewing(null);
  }

  function handleActionComplete() {
    setReviewing(null);
    router.refresh();
  }

  const approveEndpoint = reviewing
    ? activeTab === 'seo'
      ? `/api/admin/ai-seo/workflows/${reviewing.id}/approve`
      : `/api/admin/ai-translation/workflows/${reviewing.id}/approve`
    : '';

  const rejectEndpoint = reviewing
    ? activeTab === 'seo'
      ? `/api/admin/ai-seo/workflows/${reviewing.id}/reject`
      : `/api/admin/ai-translation/workflows/${reviewing.id}/reject`
    : '';

  return (
    <>
      {/* Tabs + filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex border border-white/10 rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === 'seo'
                ? 'bg-brand-gold text-black font-semibold'
                : 'text-gray-400 hover:text-brand-white hover:bg-white/5'
            }`}
          >
            SEO Drafts
            <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-white/10">
              {seoWorkflows.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('translations')}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === 'translations'
                ? 'bg-brand-gold text-black font-semibold'
                : 'text-gray-400 hover:text-brand-white hover:bg-white/5'
            }`}
          >
            Translations
            <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-white/10">
              {translationWorkflows.length}
            </span>
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {(['all', 'draft', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                statusFilter === s
                  ? 'border-brand-gold/60 text-brand-gold bg-brand-gold/10'
                  : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-gray-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <WorkflowTable
        workflows={currentWorkflows}
        showLocale={activeTab === 'translations'}
        onReview={handleReview}
      />

      {/* Review side panel */}
      {reviewing && (
        <WorkflowReviewPanel
          workflow={reviewing}
          approveEndpoint={approveEndpoint}
          rejectEndpoint={rejectEndpoint}
          onClose={handleClose}
          onActionComplete={handleActionComplete}
        />
      )}
    </>
  );
}
