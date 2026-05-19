'use client';

import { useState } from 'react';

export interface WorkflowRecord {
  id: string;
  entityType: string;
  entityId: string;
  state: string;
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowReviewPanelProps {
  workflow: WorkflowRecord;
  approveEndpoint: string;
  rejectEndpoint: string;
  onClose: () => void;
  onActionComplete: () => void;
}

function parseNotes(notes: string | null): Record<string, unknown> {
  if (!notes) return {};
  try {
    return JSON.parse(notes) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function renderOriginalContent(parsed: Record<string, unknown>): React.ReactNode {
  const sourceContent = parsed['sourceContent'] as Record<string, string> | undefined;
  const generatedContent = parsed['generatedContent'] as Record<string, unknown> | undefined;

  if (sourceContent) {
    return (
      <div className="space-y-3">
        {Object.entries(sourceContent).map(([field, value]) => (
          <div key={field}>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{field}</div>
            <div className="text-sm text-gray-300 bg-white/5 rounded p-3 whitespace-pre-wrap">
              {value || <span className="text-gray-600 italic">empty</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (generatedContent) {
    return (
      <div className="space-y-3">
        {Object.entries(generatedContent).map(([field, value]) => (
          <div key={field}>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{field}</div>
            <div className="text-sm text-gray-300 bg-white/5 rounded p-3 whitespace-pre-wrap">
              {typeof value === 'string'
                ? value
                : JSON.stringify(value, null, 2)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-500 italic">No original content available</div>
  );
}

export function WorkflowReviewPanel({
  workflow,
  approveEndpoint,
  rejectEndpoint,
  onClose,
  onActionComplete,
}: WorkflowReviewPanelProps) {
  const parsed = parseNotes(workflow.notes);
  const translations = (parsed['translations'] ?? parsed['generatedContent'] ?? {}) as Record<
    string,
    string
  >;
  const targetLocale = (parsed['targetLocale'] as string | undefined) ?? null;
  const generationType = (parsed['generationType'] as string | undefined) ?? null;

  // Build editable draft state
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(translations).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
    ),
  );

  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: 'approve' | 'reject') {
    setLoading(action);
    setError(null);
    try {
      const endpoint = action === 'approve' ? approveEndpoint : rejectEndpoint;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedTranslations: draft }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setError(body?.error?.message ?? `Request failed (${res.status})`);
      } else {
        onActionComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(null);
    }
  }

  const hasDraftFields = Object.keys(draft).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60" onClick={onClose} />

      {/* Side panel */}
      <div className="w-full max-w-3xl bg-[#0a1628] border-l border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-brand-white">Review AI Draft</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Workflow #{workflow.id.slice(0, 8)} &middot; {workflow.entityType}
              {targetLocale && ` → ${targetLocale.toUpperCase()}`}
              {generationType && ` · ${generationType}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-brand-white transition-colors text-xl leading-none"
            aria-label="Close panel"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Two-column comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
                Original (EN)
              </h3>
              {renderOriginalContent(parsed)}
            </div>

            {/* Draft / editable */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
                AI Draft{targetLocale ? ` (${targetLocale.toUpperCase()})` : ''}
              </h3>
              {hasDraftFields ? (
                <div className="space-y-3">
                  {Object.entries(draft).map(([field, value]) => (
                    <div key={field}>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {field}
                      </div>
                      <textarea
                        className="w-full bg-white/5 border border-white/10 rounded p-3 text-sm text-gray-200 resize-y focus:outline-none focus:border-brand-gold/50 min-h-[80px]"
                        value={value}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, [field]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic bg-white/5 rounded p-3">
                  <pre className="whitespace-pre-wrap text-xs">
                    {workflow.notes ?? 'No notes'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-white/10 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            disabled={!!loading}
          >
            Cancel
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={!!loading}
            className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-sm text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
          >
            {loading === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
          <button
            onClick={() => handleAction('approve')}
            disabled={!!loading}
            className="px-4 py-2 rounded-lg bg-brand-gold text-black text-sm font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
          >
            {loading === 'approve' ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
