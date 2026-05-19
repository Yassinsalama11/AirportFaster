'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api-client';

interface Props {
  incidentId: string;
  canResolve: boolean;
  currentStatus: string;
}

type Panel = 'update' | 'assign' | 'resolve' | null;

const INCIDENT_STATUSES = [
  { value: 'created', label: 'Created' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_external', label: 'Waiting External' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;

const TEAMS = [
  { value: 'operations', label: 'Operations' },
  { value: 'support', label: 'Support' },
  { value: 'finance', label: 'Finance' },
  { value: 'supplier_manager', label: 'Supplier Manager' },
] as const;

export function IncidentActionsPanel({ incidentId, canResolve, currentStatus }: Props) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<Panel>(null);

  // Add Update state
  const [updateNote, setUpdateNote] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Assign state
  const [assignTeam, setAssignTeam] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Resolve state
  const [resolution, setResolution] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  function togglePanel(panel: Panel) {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  async function handleAddUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUpdateError(null);
    setUpdateLoading(true);

    try {
      const body: Record<string, string> = { note: updateNote };
      if (updateStatus) body['statusChange'] = updateStatus;

      const res = await fetch(`${API_URL}/api/admin/incidents/${incidentId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { success: boolean; error?: { message: string } };

      if (!data.success) {
        setUpdateError(data.error?.message ?? 'Failed to add update.');
        return;
      }

      setUpdateNote('');
      setUpdateStatus('');
      setActivePanel(null);
      router.refresh();
    } catch {
      setUpdateError('Network error. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  }

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAssignError(null);

    if (!assignTeam) {
      setAssignError('Please select a team to assign.');
      return;
    }

    setAssignLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/incidents/${incidentId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ team: assignTeam }),
      });

      const data = (await res.json()) as { success: boolean; error?: { message: string } };

      if (!data.success) {
        setAssignError(data.error?.message ?? 'Failed to assign incident.');
        return;
      }

      setAssignTeam('');
      setActivePanel(null);
      router.refresh();
    } catch {
      setAssignError('Network error. Please try again.');
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleResolve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResolveError(null);
    setResolveLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/incidents/${incidentId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resolution }),
      });

      const data = (await res.json()) as { success: boolean; error?: { message: string } };

      if (!data.success) {
        setResolveError(data.error?.message ?? 'Failed to resolve incident.');
        return;
      }

      setResolution('');
      setActivePanel(null);
      router.refresh();
    } catch {
      setResolveError('Network error. Please try again.');
    } finally {
      setResolveLoading(false);
    }
  }

  return (
    <div className="bg-brand-navy border border-white/5 rounded-xl p-5 space-y-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">Actions</p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => togglePanel('update')}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
            activePanel === 'update'
              ? 'border-brand-gold text-brand-gold bg-brand-gold/10'
              : 'border-white/10 text-brand-white hover:border-brand-gold/40'
          }`}
        >
          Add Update
        </button>

        <button
          type="button"
          onClick={() => togglePanel('assign')}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
            activePanel === 'assign'
              ? 'border-blue-400 text-blue-400 bg-blue-500/10'
              : 'border-white/10 text-brand-white hover:border-blue-400/40'
          }`}
        >
          Assign to Team
        </button>

        {canResolve && (
          <button
            type="button"
            onClick={() => togglePanel('resolve')}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              activePanel === 'resolve'
                ? 'border-green-400 text-green-400 bg-green-500/10'
                : 'border-white/10 text-brand-white hover:border-green-400/40'
            }`}
          >
            Resolve
          </button>
        )}
      </div>

      {/* Add Update form */}
      {activePanel === 'update' && (
        <form onSubmit={handleAddUpdate} className="space-y-3 border-t border-white/5 pt-4">
          <p className="text-sm font-medium text-brand-white">Add Update</p>
          <textarea
            value={updateNote}
            onChange={(e) => setUpdateNote(e.target.value)}
            rows={4}
            required
            placeholder="Describe what happened or next steps…"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-gold/50 transition-colors resize-y"
          />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Change status (optional)</label>
            <select
              value={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-brand-white text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
            >
              <option value="">Keep current ({currentStatus.replace(/_/g, ' ')})</option>
              {INCIDENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {updateError && <p className="text-red-400 text-sm">{updateError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={updateLoading}
              className="px-4 py-2 bg-brand-gold text-brand-black text-sm font-bold rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updateLoading ? 'Saving…' : 'Save Update'}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-brand-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Assign form */}
      {activePanel === 'assign' && (
        <form onSubmit={handleAssign} className="space-y-3 border-t border-white/5 pt-4">
          <p className="text-sm font-medium text-brand-white">Assign to Team</p>
          <select
            value={assignTeam}
            onChange={(e) => setAssignTeam(e.target.value)}
            required
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-brand-white text-sm focus:outline-none focus:border-brand-gold/50 transition-colors"
          >
            <option value="">Select team…</option>
            {TEAMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {assignError && <p className="text-red-400 text-sm">{assignError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={assignLoading}
              className="px-4 py-2 bg-blue-600 text-brand-white text-sm font-bold rounded-lg hover:bg-blue-600/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {assignLoading ? 'Assigning…' : 'Assign'}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-brand-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Resolve form */}
      {activePanel === 'resolve' && (
        <form onSubmit={handleResolve} className="space-y-3 border-t border-white/5 pt-4">
          <p className="text-sm font-medium text-green-400">Resolve Incident</p>
          <p className="text-xs text-gray-500">
            Describe how this incident was resolved. This will close the incident.
          </p>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={4}
            required
            placeholder="Describe the resolution…"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:outline-none focus:border-green-500/50 transition-colors resize-y"
          />
          {resolveError && <p className="text-red-400 text-sm">{resolveError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={resolveLoading}
              className="px-4 py-2 bg-green-600 text-brand-white text-sm font-bold rounded-lg hover:bg-green-600/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resolveLoading ? 'Resolving…' : 'Mark Resolved'}
            </button>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-brand-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
