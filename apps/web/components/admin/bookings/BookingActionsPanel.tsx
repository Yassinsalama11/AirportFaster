'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      const res = await fetch(`/api/admin/bookings/${bookingId}/assign-supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
  const canConfirmStep1 = status === 'supplier_assigned';
  const canConfirmStep2 = status === 'pending_supplier_confirmation';

  const STATUS_OPTIONS: Array<{
    value: string;
    label: string;
    confirm?: string;
    tone?: 'default' | 'danger' | 'success';
  }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'under_investigation', label: 'Under Investigation' },
    {
      value: 'cancelled_no_refund',
      label: 'Cancel without Refund',
      confirm: 'Cancel this booking WITHOUT issuing a refund. This cannot be undone — continue?',
      tone: 'danger',
    },
    {
      value: 'cancelled_with_refund',
      label: 'Cancel with Refund',
      confirm: 'Cancel this booking AND refund the customer. Continue?',
      tone: 'danger',
    },
    { value: 'completed', label: 'Completed', tone: 'success' },
  ];

  async function handleSelectStatus(optionValue: string) {
    const option = STATUS_OPTIONS.find((o) => o.value === optionValue);
    if (!option) return;
    if (option.confirm && !confirm(option.confirm)) return;
    await handlePatchStatus(option.value);
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

      {/* Status change dropdown */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <p className="text-sm font-medium text-brand-white">Change Status</p>
        <p className="text-xs text-gray-500">
          Current: <span className="capitalize">{status.replace(/_/g, ' ')}</span>
        </p>
        <select
          disabled={loading}
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) handleSelectStatus(v);
            e.currentTarget.value = '';
          }}
          className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none disabled:opacity-50"
        >
          <option value="" disabled>
            Select a new status…
          </option>
          {STATUS_OPTIONS.filter((o) => o.value !== status).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
