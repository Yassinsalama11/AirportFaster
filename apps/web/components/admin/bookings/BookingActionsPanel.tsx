'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Supplier {
  id: string;
  name: string;
  status: string;
}

interface Props {
  bookingId: string;
  status: string;
  airportServiceId: string;
  availableSuppliers: Supplier[];
}

export function BookingActionsPanel({ bookingId, status, availableSuppliers }: Props) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(availableSuppliers[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleAssignSupplier() {
    if (!supplierId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${bookingId}/assign-supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ supplierId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error?.message ?? 'Failed to assign supplier');
      } else {
        showToast('success', 'Supplier assigned successfully');
        router.refresh();
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePatchStatus(newStatus: string, note?: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, reason: note }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast('error', json.error?.message ?? `Failed to update status`);
      } else {
        showToast('success', `Status updated to ${newStatus.replace(/_/g, ' ')}`);
        router.refresh();
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const canAssign = status === 'pending_supplier_assignment';
  const canConfirmStep1 = status === 'supplier_assigned'; // move to pending_supplier_confirmation
  const canConfirmStep2 = status === 'pending_supplier_confirmation'; // move to confirmed
  const canCancel = ['draft', 'pending_payment', 'paid', 'pending_supplier_assignment', 'supplier_assigned', 'pending_supplier_confirmation', 'confirmed', 'in_progress'].includes(status);

  if (!canAssign && !canConfirmStep1 && !canConfirmStep2 && !canCancel) {
    return (
      <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Actions</p>
        <p className="text-sm text-gray-500">No actions available for current status.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-navy border border-white/5 rounded-xl p-5 space-y-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">Actions</p>

      {toast && (
        <div className={`px-3 py-2 rounded text-xs ${
          toast.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Assign Supplier */}
      {canAssign && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-white">Assign Supplier</p>
          {availableSuppliers.length === 0 ? (
            <p className="text-xs text-gray-500">No suppliers with coverage available.</p>
          ) : (
            <>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
              >
                {availableSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignSupplier}
                disabled={loading || !supplierId}
                className="w-full px-4 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg text-sm hover:bg-brand-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Assigning…' : 'Assign'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Move to Pending Supplier Confirmation */}
      {canConfirmStep1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-white">Supplier Confirmation</p>
          <p className="text-xs text-gray-500">Request confirmation from supplier</p>
          <button
            onClick={() => handlePatchStatus('pending_supplier_confirmation', 'Awaiting supplier confirmation')}
            disabled={loading}
            className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating…' : 'Request Confirmation'}
          </button>
        </div>
      )}

      {/* Confirm Booking */}
      {canConfirmStep2 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-white">Mark as Confirmed</p>
          <p className="text-xs text-gray-500">Confirm this booking</p>
          <button
            onClick={() => handlePatchStatus('confirmed', 'Confirmed by admin')}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg text-sm hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Confirming…' : 'Mark Confirmed'}
          </button>
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to cancel this booking?')) {
                handlePatchStatus('cancelled', 'Cancelled by admin');
              }
            }}
            disabled={loading}
            className="w-full px-4 py-2 border border-red-500/30 text-red-400 font-medium rounded-lg text-sm hover:border-red-500/60 transition-colors disabled:opacity-50"
          >
            Cancel Booking
          </button>
        </div>
      )}
    </div>
  );
}
