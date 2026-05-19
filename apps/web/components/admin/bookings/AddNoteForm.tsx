'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Props {
  bookingId: string;
}

export function AddNoteForm({ bookingId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'customer'>('internal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${bookingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: body.trim(), visibility }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to add note');
        return;
      }
      setBody('');
      setVisibility('internal');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">{error}</div>
      )}
      {success && (
        <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs">Note added.</div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Add a note…"
        required
        className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none placeholder-gray-600"
      />
      <div className="flex items-center gap-3">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'internal' | 'customer')}
          className="px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          <option value="internal">Internal</option>
          <option value="customer">Customer-visible</option>
        </select>
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="px-4 py-1.5 bg-brand-gold text-brand-black font-semibold rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-gold-light transition-colors"
        >
          {saving ? 'Saving…' : 'Add Note'}
        </button>
      </div>
    </form>
  );
}
