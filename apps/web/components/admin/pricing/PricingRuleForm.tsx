'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AirportService {
  id: string;
  service?: {
    slug: string;
    translations: Array<{ locale: string; name: string }>;
  };
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface Props {
  airportId: string;
  airportServices: AirportService[];
  suppliers?: Supplier[];
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

function getServiceLabel(as: AirportService): string {
  if (!as.service) return as.id.slice(0, 8);
  const t = as.service.translations.find((t) => t.locale === 'en');
  return t?.name ?? as.service.slug;
}

export function PricingRuleForm({ airportId, airportServices, suppliers = [] }: Props) {
  const router = useRouter();

  const [airportServiceId, setAirportServiceId] = useState(
    airportServices[0]?.id ?? '',
  );
  const [supplierId, setSupplierId] = useState('');
  const [mode, setMode] = useState<'fixed' | 'cost_plus_markup'>('fixed');
  const currency = 'EUR';
  const [adultPriceMinor, setAdultPriceMinor] = useState('');
  const [childPriceMinor, setChildPriceMinor] = useState('');
  const [childFree, setChildFree] = useState(false);
  const [infantPriceMinor, setInfantPriceMinor] = useState('');
  const [infantFree, setInfantFree] = useState(false);
  const [supplierCostMinor, setSupplierCostMinor] = useState('');
  const [markupType, setMarkupType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [markupValue, setMarkupValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [priority, setPriority] = useState('0');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      airportServiceId,
      mode,
      currency: currency.toUpperCase(),
      priority: parseInt(priority, 10),
      status,
      ...(supplierId && { supplierId }),
    };

    if (mode === 'fixed') {
      const adultMinor = parseInt(adultPriceMinor, 10);
      body['basePriceMinor'] = adultMinor;
      const pp: Record<string, number> = { adult: adultMinor };
      if (childFree) {
        pp['child'] = 0;
      } else if (childPriceMinor.trim()) {
        pp['child'] = parseInt(childPriceMinor, 10);
      }
      if (infantFree) {
        pp['infant'] = 0;
      } else if (infantPriceMinor.trim()) {
        pp['infant'] = parseInt(infantPriceMinor, 10);
      }
      body['passengerPricing'] = pp;
    } else {
      body['supplierCostMinor'] = parseInt(supplierCostMinor, 10);
      body['markupType'] = markupType;
      body['markupValue'] = parseFloat(markupValue);
    }

    if (validFrom) body['validFrom'] = new Date(validFrom).toISOString();
    if (validTo) body['validTo'] = new Date(validTo).toISOString();

    try {
      const res = await fetch(`${API_BASE}/api/admin/pricing/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to create pricing rule');
        return;
      }

      router.push(`/admin/airports/${airportId}/pricing`);
      router.refresh();
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

      {/* Service */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Airport Service <span className="text-red-400">*</span>
        </label>
        <select
          value={airportServiceId}
          onChange={(e) => setAirportServiceId(e.target.value)}
          required
          className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          {airportServices.map((as) => (
            <option key={as.id} value={as.id}>
              {getServiceLabel(as)}
            </option>
          ))}
        </select>
      </div>

      {/* Supplier */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Supplier
        </label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          <option value="">— General (no specific supplier) —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Supplier-specific rules take precedence over general rules.
        </p>
      </div>

      {/* Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Pricing Mode <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-4">
          {(['fixed', 'cost_plus_markup'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="accent-brand-gold"
              />
              <span className="text-sm text-gray-300">
                {m === 'fixed' ? 'Fixed Price' : 'Cost + Markup'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Currency — locked to EUR platform-wide */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
        <div className="w-40 px-4 py-2 bg-brand-black/50 border border-white/10 rounded-lg text-brand-white text-sm font-mono">
          EUR (€)
        </div>
        <p className="mt-1 text-xs text-gray-500">All prices on the platform are in Euros.</p>
      </div>

      {/* Fixed price fields */}
      {mode === 'fixed' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Enter prices in cents — e.g. 4500 = €45.00
          </p>

          {/* Adult */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Adult Price <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={adultPriceMinor}
              onChange={(e) => setAdultPriceMinor(e.target.value)}
              min={0}
              step={1}
              required
              placeholder="e.g. 4500 = £45.00"
              className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            />
          </div>

          {/* Child */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Child Price</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={childFree}
                  onChange={(e) => setChildFree(e.target.checked)}
                  className="accent-brand-gold"
                />
                <span className="text-sm text-gray-300">Free</span>
              </label>
              {!childFree && (
                <input
                  type="number"
                  value={childPriceMinor}
                  onChange={(e) => setChildPriceMinor(e.target.value)}
                  min={0}
                  step={1}
                  placeholder="e.g. 2500 = £25.00"
                  className="flex-1 px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Leave blank to charge same as adult.</p>
          </div>

          {/* Infant */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Infant Price</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={infantFree}
                  onChange={(e) => setInfantFree(e.target.checked)}
                  className="accent-brand-gold"
                />
                <span className="text-sm text-gray-300">Free</span>
              </label>
              {!infantFree && (
                <input
                  type="number"
                  value={infantPriceMinor}
                  onChange={(e) => setInfantPriceMinor(e.target.value)}
                  min={0}
                  step={1}
                  placeholder="e.g. 0 = Free, 1000 = £10.00"
                  className="flex-1 px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Leave blank to charge same as adult.</p>
          </div>
        </div>
      )}

      {/* Cost + Markup fields */}
      {mode === 'cost_plus_markup' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Supplier Cost (minor units) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={supplierCostMinor}
              onChange={(e) => setSupplierCostMinor(e.target.value)}
              min={0}
              step={1}
              required
              className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Markup Type <span className="text-red-400">*</span>
              </label>
              <select
                value={markupType}
                onChange={(e) => setMarkupType(e.target.value as 'percentage' | 'fixed_amount')}
                className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Markup Value <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
                min={0}
                step={0.01}
                required
                placeholder={markupType === 'percentage' ? '20' : '500'}
                className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Valid from / to */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Valid From</label>
          <input
            type="datetime-local"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Valid Until</label>
          <input
            type="datetime-local"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          />
        </div>
      </div>

      {/* Priority + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            min={0}
            step={1}
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">Higher priority rules take precedence.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Create Rule'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/airports/${airportId}/pricing`)}
          className="px-6 py-2 bg-transparent border border-white/10 text-gray-400 font-medium rounded-lg hover:border-white/30 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
