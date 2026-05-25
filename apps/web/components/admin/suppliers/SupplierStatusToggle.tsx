'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  supplierId: string;
  currentStatus: string;
}

export function SupplierStatusToggle({ supplierId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = currentStatus === 'verified';
  const isSuspended = currentStatus === 'suspended';

  async function setStatus(newStatus: string) {
    if (!confirm(`Set supplier status to "${newStatus}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to update status');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!isActive && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setStatus('verified')}
          className="px-3 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium rounded-lg hover:bg-green-500/25 transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Activate'}
        </button>
      )}
      {!isSuspended && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setStatus('suspended')}
          className="px-3 py-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/25 transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Suspend'}
        </button>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
