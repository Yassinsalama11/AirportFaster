'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type BookingStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'pending_supplier_assignment'
  | 'supplier_assigned'
  | 'pending_supplier_confirmation'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

interface BookingActionsProps {
  bookingId: string;
  status: BookingStatus;
  serviceDateTime: string;
}

export function BookingActions({ bookingId, status, serviceDateTime }: BookingActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isToday = (() => {
    const serviceDate = new Date(serviceDateTime);
    const today = new Date();
    return (
      serviceDate.getFullYear() === today.getFullYear() &&
      serviceDate.getMonth() === today.getMonth() &&
      serviceDate.getDate() === today.getDate()
    );
  })();

  const canConfirm = status === 'supplier_assigned' || status === 'pending_supplier_confirmation';
  const canStart = status === 'confirmed' && isToday;
  const canComplete = status === 'in_progress';

  if (!canConfirm && !canStart && !canComplete) {
    return null;
  }

  async function performAction(action: 'confirm' | 'start' | 'complete') {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/supplier/bookings/${bookingId}/${action}`, {
        method: 'PATCH',
      });

      const data = (await res.json()) as { success: boolean; error?: { message: string } };

      if (!res.ok || !data.success) {
        setError(data.error?.message ?? 'Action failed. Please try again.');
        return;
      }

      router.refresh();
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-brand-navy border border-white/10 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</h2>

      <div className="flex flex-wrap gap-3">
        {canConfirm && (
          <button
            onClick={() => void performAction('confirm')}
            disabled={isLoading}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Confirm Booking'}
          </button>
        )}

        {canStart && (
          <button
            onClick={() => void performAction('start')}
            disabled={isLoading}
            className="px-5 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-brand-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Mark In Progress'}
          </button>
        )}

        {canComplete && (
          <button
            onClick={() => void performAction('complete')}
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Mark Completed'}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
