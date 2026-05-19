'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api-client';

interface Props {
  token: string;
  bookingId: string;
}

export function ManageCancelButton({ token, bookingId }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  async function handleCancel() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/public/bookings/manage/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          bookingId,
          reason: 'Customer requested',
        }),
      });

      const data = (await res.json()) as { success: boolean; error?: { message: string } };

      if (!data.success) {
        setError(data.error?.message ?? 'Failed to cancel booking. Please contact support.');
        return;
      }

      setCancelled(true);
      router.refresh();
    } catch {
      setError('Network error. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  }

  if (cancelled) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
        <p className="text-red-400 font-medium">Your booking has been cancelled.</p>
        <p className="text-gray-400 text-sm mt-1">
          A refund will be processed according to our cancellation policy.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
      {!showConfirm ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-white">Cancel Booking</p>
            <p className="text-xs text-gray-500 mt-0.5">
              This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 border border-red-500/30 text-red-400 text-sm rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Cancel Booking
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-red-400">Are you sure?</p>
            <p className="text-xs text-gray-400 mt-1">
              This will initiate a refund according to our cancellation policy. This action cannot
              be undone.
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-brand-white text-sm font-bold rounded-lg hover:bg-red-600/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Cancelling…' : 'Confirm Cancellation'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                setError(null);
              }}
              disabled={loading}
              className="px-4 py-2 text-sm text-gray-400 hover:text-brand-white transition-colors disabled:opacity-50"
            >
              Keep Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
