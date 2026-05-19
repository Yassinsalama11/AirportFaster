'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface SupplierData {
  id?: string;
  name?: string;
  legalName?: string | null;
  countryCode?: string | null;
  payoutCurrency?: string | null;
  notes?: string | null;
  status?: string;
}

interface Props {
  supplier?: SupplierData;
  isNew: boolean;
}

const COUNTRY_OPTIONS = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AU', name: 'Australia' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'DE', name: 'Germany' },
  { code: 'EG', name: 'Egypt' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'QA', name: 'Qatar' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' },
  { code: 'US', name: 'United States' },
].sort((a, b) => a.name.localeCompare(b.name));

export function SupplierForm({ supplier, isNew }: Props) {
  const router = useRouter();

  const [name, setName] = useState(supplier?.name ?? '');
  const [legalName, setLegalName] = useState(supplier?.legalName ?? '');
  const [countryCode, setCountryCode] = useState(supplier?.countryCode ?? '');
  const [payoutCurrency, setPayoutCurrency] = useState(supplier?.payoutCurrency ?? 'EUR');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, string | undefined> = {
      name: name.trim(),
    };
    if (legalName.trim()) body['legalName'] = legalName.trim();
    if (countryCode) body['countryCode'] = countryCode;
    if (payoutCurrency.trim()) body['payoutCurrency'] = payoutCurrency.trim().toUpperCase();
    if (notes.trim()) body['notes'] = notes.trim();

    try {
      const url = isNew
        ? `${API_BASE}/api/admin/suppliers`
        : `${API_BASE}/api/admin/suppliers/${supplier!.id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to save supplier');
        return;
      }

      if (isNew) {
        router.push(`/admin/suppliers/${json.data.supplier.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Trading Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. FastTrack Lounge Services"
          className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        />
      </div>

      {/* Legal Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Legal Name</label>
        <input
          type="text"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder="e.g. FastTrack Services Ltd."
          className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        />
      </div>

      {/* Country + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          >
            <option value="">— Select country —</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Payout Currency
          </label>
          <input
            type="text"
            value={payoutCurrency}
            onChange={(e) => setPayoutCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="EUR"
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none font-mono"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Internal notes about this supplier…"
          className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : isNew ? 'Create Supplier' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/suppliers')}
          className="px-6 py-2 bg-transparent border border-white/10 text-gray-400 font-medium rounded-lg hover:border-white/30 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
