'use client';

import { useState, FormEvent } from 'react';
import { API_URL } from '@/lib/api-client';

interface TaxRate {
  id: string;
  countryCode: string;
  taxType: string;
  rate: number;
  serviceType: string | null;
  validFrom: string;
  status: string;
}

const COUNTRY_FLAG: Record<string, string> = {
  GB: '🇬🇧',
  US: '🇺🇸',
  AE: '🇦🇪',
  DE: '🇩🇪',
  FR: '🇫🇷',
  ES: '🇪🇸',
  IT: '🇮🇹',
  NL: '🇳🇱',
  SA: '🇸🇦',
  QA: '🇶🇦',
  SG: '🇸🇬',
  AU: '🇦🇺',
  IN: '🇮🇳',
};

function getFlag(code: string): string {
  return COUNTRY_FLAG[code.toUpperCase()] ?? '🏳';
}

interface Props {
  initialRates: TaxRate[];
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  draft: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
};

const TAX_TYPES = [
  { value: 'vat', label: 'VAT' },
  { value: 'gst', label: 'GST' },
  { value: 'sales_tax', label: 'Sales Tax' },
];

const SERVICE_TYPES = [
  { value: '', label: 'All services' },
  { value: 'fast_track', label: 'Fast Track' },
  { value: 'meet_greet', label: 'Meet & Greet' },
  { value: 'lounge', label: 'Lounge' },
];

export function TaxRatesClient({ initialRates }: Props) {
  const [rates, setRates] = useState<TaxRate[]>(initialRates);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [countryCode, setCountryCode] = useState('');
  const [taxType, setTaxType] = useState('vat');
  const [rate, setRate] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAddRate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/tax-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          countryCode: countryCode.toUpperCase(),
          taxType,
          rate: parseFloat(rate),
          serviceType: serviceType || undefined,
          validFrom,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        data?: { taxRate: TaxRate };
        error?: { message: string };
      };

      if (!response.ok || !data.success) {
        setFormError(data.error?.message ?? 'Failed to add tax rate.');
        return;
      }

      if (data.data?.taxRate) {
        setRates((prev) => [data.data!.taxRate, ...prev]);
      }

      // Reset
      setCountryCode('');
      setTaxType('vat');
      setRate('');
      setServiceType('');
      setValidFrom(new Date().toISOString().split('T')[0] ?? '');
      setShowForm(false);
    } catch {
      setFormError('A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {rates.length} tax rate{rates.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Tax Rate'}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-brand-navy border border-brand-gold/20 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-brand-white mb-4">New Tax Rate</h3>
          <form onSubmit={handleAddRate} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Country Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  placeholder="GB"
                  className="w-full px-3 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:border-brand-gold outline-none transition-colors uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Tax Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none transition-colors"
                >
                  {TAX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Rate % <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="20"
                  className="w-full px-3 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:border-brand-gold outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Service Type
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none transition-colors"
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Valid From <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none transition-colors"
                />
              </div>
            </div>

            {formError && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <span className="text-red-400 text-sm">{formError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Rate'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 border border-white/10 text-gray-400 text-sm rounded-lg hover:border-white/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
        {rates.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No tax rates configured.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Country
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tax Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rate %
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Service Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Valid From
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rates.map((taxRate) => (
                <tr key={taxRate.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <span className="text-sm">
                      {getFlag(taxRate.countryCode)}{' '}
                      <span className="font-mono font-medium text-brand-white">
                        {taxRate.countryCode.toUpperCase()}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400 uppercase">
                    {taxRate.taxType.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-4 text-sm text-brand-white font-medium">
                    {taxRate.rate}%
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {taxRate.serviceType
                      ? taxRate.serviceType.replace(/_/g, ' ')
                      : <span className="text-gray-600">All</span>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {new Date(taxRate.validFrom).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[taxRate.status] ?? 'bg-gray-500/20 text-gray-400'}`}
                    >
                      {taxRate.status}
                    </span>
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
