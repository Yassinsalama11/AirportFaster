'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Undo2, X } from 'lucide-react';

interface Props {
  bookingId: string;
  bookingReference: string;
  totalMinor: number;
  currency: string;
}

export function RefundInitiateButton({ bookingId, bookingReference, totalMinor, currency }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'full' | 'partial'>('full');
  const [amountStr, setAmountStr] = useState((totalMinor / 100).toFixed(2));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const max = totalMinor / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    const amountFloat = parseFloat(amountStr);
    if (!Number.isFinite(amountFloat) || amountFloat <= 0 || amountFloat > max) {
      setError(`Amount must be between 0 and ${max.toFixed(2)} ${currency}.`);
      return;
    }
    const amountMinorUnits = Math.round(amountFloat * 100);

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          type,
          amountMinorUnits,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to initiate refund.');
        setSubmitting(false);
        return;
      }
      setOpen(false);
      router.refresh();
      router.push('/admin/refunds?tab=history');
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 text-brand-gold rounded-lg text-xs font-medium transition-colors"
      >
        <Undo2 className="w-3.5 h-3.5" />
        Refund
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="bg-brand-navy border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-white">
                Refund <span className="text-brand-gold font-mono">{bookingReference}</span>
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Refund Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['full', 'partial'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setType(t);
                        if (t === 'full') setAmountStr(max.toFixed(2));
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        type === t
                          ? 'border-brand-gold/40 bg-brand-gold/10 text-brand-gold'
                          : 'border-white/10 text-gray-400 hover:border-white/30'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={max}
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    if (parseFloat(e.target.value) < max) setType('partial');
                  }}
                  className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {max.toFixed(2)} {currency}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer flight cancelled by airline"
                  className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none"
                />
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm disabled:opacity-50"
                >
                  {submitting ? 'Processing…' : 'Initiate Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
