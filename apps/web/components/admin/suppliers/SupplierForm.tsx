'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SupplierData {
  id?: string;
  name?: string;
  legalName?: string | null;
  countryCode?: string | null;
  payoutCurrency?: string | null;
  commissionPercent?: number | null;
  notes?: string | null;
  status?: string;
}

interface Props {
  supplier?: SupplierData;
  isNew: boolean;
}

const CURRENCY_OPTIONS = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'MAD', name: 'Moroccan Dirham' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Active / Verified' },
  { value: 'suspended', label: 'Suspended / Inactive' },
];

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
  const [commissionPercent, setCommissionPercent] = useState(
    supplier?.commissionPercent != null ? String(supplier.commissionPercent) : '',
  );
  const [status, setStatus] = useState(supplier?.status ?? 'pending');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      name: name.trim(),
      status,
    };
    if (legalName.trim()) body['legalName'] = legalName.trim();
    if (countryCode) body['countryCode'] = countryCode;
    if (payoutCurrency) body['payoutCurrency'] = payoutCurrency;
    if (commissionPercent.trim()) body['commissionPercent'] = parseFloat(commissionPercent);
    if (notes.trim()) body['notes'] = notes.trim();

    try {
      const url = isNew
        ? `/api/admin/suppliers`
        : `/api/admin/suppliers/${supplier!.id}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
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
          <select
            value={payoutCurrency}
            onChange={(e) => setPayoutCurrency(e.target.value)}
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Commission */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Platform Commission (%)
        </label>
        <input
          type="number"
          value={commissionPercent}
          onChange={(e) => setCommissionPercent(e.target.value)}
          min={0}
          max={100}
          step={0.5}
          placeholder="e.g. 15"
          className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">AirportFaster's commission percentage on this supplier's bookings</p>
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
