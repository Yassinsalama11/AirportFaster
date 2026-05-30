'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Trash2 } from 'lucide-react';

interface CurrencyRateRow {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  fetchedAt: string;
}

const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'EGP', 'AED', 'SAR', 'TRY', 'MAD'];

const inputCls =
  'w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none uppercase font-mono';

export function CurrencyRatesPanel({ initialRates }: { initialRates: CurrencyRateRow[] }) {
  const router = useRouter();
  const [rates] = useState<CurrencyRateRow[]>(initialRates);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [quoteCurrency, setQuoteCurrency] = useState('EUR');
  const [rateValue, setRateValue] = useState('0.92');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedRates = useMemo(
    () => [...rates].sort((a, b) => (a.baseCurrency + a.quoteCurrency).localeCompare(b.baseCurrency + b.quoteCurrency)),
    [rates],
  );

  async function handleUpsert(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (baseCurrency === quoteCurrency) {
      setError('Base and quote currency must be different.');
      return;
    }
    const num = parseFloat(rateValue);
    if (!Number.isFinite(num) || num <= 0) {
      setError('Rate must be a positive number.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/currency-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseCurrency, quoteCurrency, rate: num }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to save rate.');
        return;
      }
      setSuccess(`Rate saved: 1 ${baseCurrency} = ${num} ${quoteCurrency}`);
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, base: string, quote: string) {
    if (!confirm(`Delete the ${base} → ${quote} rate?`)) return;
    try {
      const res = await fetch(`/api/admin/currency-rates/${id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl p-4 text-sm">
        <p className="text-brand-gold font-semibold mb-1">EUR-only checkout</p>
        <p className="text-gray-300 leading-relaxed">
          Customer payment is processed in <strong className="text-brand-white">EUR only</strong> via Stripe.
          Supplier prices in other currencies are converted to EUR at import time using the rates below.
          Update a rate any time — the next supplier price sync will use the new value.
        </p>
      </div>

      <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-brand-white mb-4 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-brand-gold" />
          Add or update a rate
        </h2>
        <form onSubmit={handleUpsert} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_2fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">From</label>
              <select
                className={inputCls}
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="text-center pb-2 text-gray-500 hidden md:block">→</div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">To</label>
              <select
                className={inputCls}
                value={quoteCurrency}
                onChange={(e) => setQuoteCurrency(e.target.value)}
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
                Rate (1 {baseCurrency} =)
              </label>
              <input
                type="number"
                step="0.0001"
                min={0}
                className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-400">{success}</p>
          )}
        </form>
      </div>

      <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-base font-semibold text-brand-white">Current rates</h2>
          <p className="text-sm text-gray-500 mt-1">
            Used by all supplier price imports.
          </p>
        </div>
        {sortedRates.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No exchange rates configured yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-black/40">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3">From</th>
                <th className="text-left px-5 py-3">To</th>
                <th className="text-right px-5 py-3">Rate</th>
                <th className="text-left px-5 py-3">Updated</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedRates.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-brand-white">{r.baseCurrency}</td>
                  <td className="px-5 py-3 font-mono text-brand-white">{r.quoteCurrency}</td>
                  <td className="px-5 py-3 text-right font-mono text-brand-gold">
                    {parseFloat(r.rate).toLocaleString('en-GB', { maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Date(r.fetchedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id, r.baseCurrency, r.quoteCurrency)}
                      className="text-red-400 hover:text-red-300 inline-flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
