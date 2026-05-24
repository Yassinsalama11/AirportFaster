'use client';

import { useState, useEffect, useCallback } from 'react';

interface AirportService {
  id: string;
  service?: { slug: string; translations: Array<{ locale: string; name: string }> };
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface PricingRule {
  id: string;
  airportServiceId: string;
  supplierId: string | null;
  mode: 'fixed' | 'cost_plus_markup';
  basePriceMinor: number | null;
  supplierCostMinor: number | null;
  markupType: string | null;
  markupValue: string | null;
  currency: string;
  passengerPricing?: Record<string, number> | null;
  validFrom: string | null;
  validTo: string | null;
  priority: number;
  status: 'active' | 'inactive';
}

interface FormState {
  airportServiceId: string;
  supplierId: string;
  mode: 'fixed' | 'cost_plus_markup';
  currency: string;
  adultPriceMinor: string;
  childPriceMinor: string;
  childFree: boolean;
  infantPriceMinor: string;
  infantFree: boolean;
  supplierCostMinor: string;
  markupType: 'percentage' | 'fixed_amount';
  markupValue: string;
  validFrom: string;
  validTo: string;
  priority: string;
  status: 'active' | 'inactive';
}

function blankForm(defaultServiceId: string): FormState {
  return {
    airportServiceId: defaultServiceId,
    supplierId: '',
    mode: 'fixed',
    currency: 'EUR',
    adultPriceMinor: '',
    childPriceMinor: '',
    childFree: false,
    infantPriceMinor: '',
    infantFree: false,
    supplierCostMinor: '',
    markupType: 'percentage',
    markupValue: '',
    validFrom: '',
    validTo: '',
    priority: '0',
    status: 'active',
  };
}

function minorToEurStr(minor: number): string {
  return (minor / 100).toFixed(2).replace(/\.00$/, '');
}

function eurToMinor(value: string): number {
  const num = parseFloat(value);
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

function ruleToForm(rule: PricingRule): FormState {
  const pp = rule.passengerPricing;
  const adultMinor = pp?.['adult'] ?? rule.basePriceMinor ?? 0;
  const childVal = pp?.['child'];
  const infantVal = pp?.['infant'];
  return {
    airportServiceId: rule.airportServiceId,
    supplierId: rule.supplierId ?? '',
    mode: rule.mode,
    currency: rule.currency,
    adultPriceMinor: adultMinor > 0 ? minorToEurStr(adultMinor) : '',
    childPriceMinor: childVal != null && childVal > 0 ? minorToEurStr(childVal) : '',
    childFree: childVal === 0,
    infantPriceMinor: infantVal != null && infantVal > 0 ? minorToEurStr(infantVal) : '',
    infantFree: infantVal === 0,
    supplierCostMinor: rule.supplierCostMinor != null ? minorToEurStr(rule.supplierCostMinor) : '',
    markupType: (rule.markupType as 'percentage' | 'fixed_amount') ?? 'percentage',
    markupValue: rule.markupValue != null ? String(rule.markupValue) : '',
    validFrom: rule.validFrom ? new Date(rule.validFrom).toISOString().slice(0, 16) : '',
    validTo: rule.validTo ? new Date(rule.validTo).toISOString().slice(0, 16) : '',
    priority: String(rule.priority),
    status: rule.status,
  };
}

function getServiceLabel(as: AirportService): string {
  const t = as.service?.translations.find((t) => t.locale === 'en');
  return t?.name ?? as.service?.slug ?? as.id.slice(0, 8);
}

function formatPrice(minor: number | null, _currency: string): string {
  if (minor == null) return '—';
  // Platform-wide: always show Euros regardless of per-record currency.
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(minor / 100);
}

const inputClass = 'w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none';
const labelClass = 'block text-sm font-medium text-gray-300 mb-1';

interface Props {
  airportId: string;
  airportServices?: AirportService[];
}

export function PricingTab({ airportId: _airportId, airportServices: airportServicesProp }: Props) {
  const airportServices: AirportService[] = airportServicesProp ?? [];
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm(airportServices[0]?.id ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoadingRules(true);
    const fetches = airportServices.map((as) =>
      fetch(`/api/admin/pricing/rules?airportServiceId=${as.id}`)
        .then((r) => r.json())
        .then((j) => (j.success ? (j.data.rules as PricingRule[]) : []))
        .catch(() => [] as PricingRule[])
    );
    const results = await Promise.all(fetches);
    setRules(results.flat());
    setLoadingRules(false);
  }, [airportServices]);

  useEffect(() => {
    void fetchRules();
    fetch('/api/admin/suppliers')
      .then((r) => r.json())
      .then((j) => { if (j.success && Array.isArray(j.data.items)) setSuppliers(j.data.items as Supplier[]); })
      .catch(() => undefined);
  }, [fetchRules]);

  function openCreate() {
    setEditingRuleId(null);
    setForm(blankForm(airportServices[0]?.id ?? ''));
    setError(null);
    setShowForm(true);
  }

  function openEdit(rule: PricingRule) {
    setEditingRuleId(rule.id);
    setForm(ruleToForm(rule));
    setError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingRuleId(null);
    setError(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      airportServiceId: form.airportServiceId,
      mode: form.mode,
      currency: form.currency.toUpperCase(),
      priority: parseInt(form.priority, 10),
      status: form.status,
      ...(form.supplierId && { supplierId: form.supplierId }),
    };

    if (form.mode === 'fixed') {
      const adultMinor = eurToMinor(form.adultPriceMinor);
      body['basePriceMinor'] = adultMinor;
      const pp: Record<string, number> = { adult: adultMinor };
      if (form.childFree) pp['child'] = 0;
      else if (form.childPriceMinor.trim()) pp['child'] = eurToMinor(form.childPriceMinor);
      if (form.infantFree) pp['infant'] = 0;
      else if (form.infantPriceMinor.trim()) pp['infant'] = eurToMinor(form.infantPriceMinor);
      body['passengerPricing'] = pp;
    } else {
      body['supplierCostMinor'] = eurToMinor(form.supplierCostMinor);
      body['markupType'] = form.markupType;
      body['markupValue'] = parseFloat(form.markupValue);
    }

    if (form.validFrom) body['validFrom'] = new Date(form.validFrom).toISOString();
    if (form.validTo) body['validTo'] = new Date(form.validTo).toISOString();

    const isEdit = editingRuleId != null;
    const url = isEdit
      ? `/api/admin/pricing/rules/${editingRuleId}`
      : '/api/admin/pricing/rules';

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to save pricing rule');
        return;
      }
      cancelForm();
      await fetchRules();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ruleId: string) {
    try {
      await fetch(`/api/admin/pricing/rules/${ruleId}`, {
        method: 'DELETE',
      });
      setDeleteConfirm(null);
      await fetchRules();
    } catch {
      // silent
    }
  }

  const supplierName = (id: string | null) => {
    if (!id) return null;
    const s = suppliers.find((s) => s.id === id);
    return s ? `${s.name} (${s.code})` : id.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-brand-white">Pricing Rules</h3>
          <p className="text-xs text-gray-500 mt-0.5">Supplier-specific rules override general rules. Higher priority wins.</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm"
          >
            + Add Rule
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-brand-black border border-brand-gold/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-brand-gold">
              {editingRuleId ? 'Edit Rule' : 'New Rule'}
            </p>
            <button type="button" onClick={cancelForm} className="text-gray-500 hover:text-gray-300 text-xs">
              Cancel
            </button>
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Service */}
            <div>
              <label className={labelClass}>Service <span className="text-red-400">*</span></label>
              <select value={form.airportServiceId} onChange={(e) => set('airportServiceId', e.target.value)} className={inputClass}>
                {airportServices.map((as) => (
                  <option key={as.id} value={as.id}>{getServiceLabel(as)}</option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className={labelClass}>Supplier</label>
              <select value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)} className={inputClass}>
                <option value="">— General (no specific supplier) —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            {/* Mode */}
            <div>
              <label className={labelClass}>Pricing Mode <span className="text-red-400">*</span></label>
              <div className="flex gap-4 mt-2">
                {(['fixed', 'cost_plus_markup'] as const).map((m) => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="mode" value={m} checked={form.mode === m} onChange={() => set('mode', m)} className="accent-brand-gold" />
                    <span className="text-sm text-gray-300">{m === 'fixed' ? 'Fixed Price' : 'Cost + Markup'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Currency — locked to EUR */}
            <div>
              <label className={labelClass}>Currency</label>
              <div className={`w-32 ${inputClass} bg-brand-black/50`}>EUR (€)</div>
            </div>
          </div>

          {/* Fixed price fields */}
          {form.mode === 'fixed' && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <p className="text-xs text-gray-500">Enter prices in euros — e.g. 45 or 45.50</p>

              <div>
                <label className={labelClass}>Adult Price (€) <span className="text-red-400">*</span></label>
                <input type="number" value={form.adultPriceMinor} onChange={(e) => set('adultPriceMinor', e.target.value)} min={0} step={0.01} required placeholder="45.00" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Child Price (€)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <input type="checkbox" checked={form.childFree} onChange={(e) => set('childFree', e.target.checked)} className="accent-brand-gold" />
                    <span className="text-sm text-gray-300">Free</span>
                  </label>
                  {!form.childFree && (
                    <input type="number" value={form.childPriceMinor} onChange={(e) => set('childPriceMinor', e.target.value)} min={0} step={0.01} placeholder="25.00 (blank = same as adult)" className={`flex-1 ${inputClass}`} />
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Infant Price (€)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <input type="checkbox" checked={form.infantFree} onChange={(e) => set('infantFree', e.target.checked)} className="accent-brand-gold" />
                    <span className="text-sm text-gray-300">Free</span>
                  </label>
                  {!form.infantFree && (
                    <input type="number" value={form.infantPriceMinor} onChange={(e) => set('infantPriceMinor', e.target.value)} min={0} step={0.01} placeholder="10.00 (blank = same as adult)" className={`flex-1 ${inputClass}`} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cost + Markup fields */}
          {form.mode === 'cost_plus_markup' && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div>
                <label className={labelClass}>Supplier Cost (€) <span className="text-red-400">*</span></label>
                <input type="number" value={form.supplierCostMinor} onChange={(e) => set('supplierCostMinor', e.target.value)} min={0} step={0.01} required placeholder="30.00" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Markup Type <span className="text-red-400">*</span></label>
                  <select value={form.markupType} onChange={(e) => set('markupType', e.target.value as 'percentage' | 'fixed_amount')} className={inputClass}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Markup Value <span className="text-red-400">*</span></label>
                  <input type="number" value={form.markupValue} onChange={(e) => set('markupValue', e.target.value)} min={0} step={0.01} required placeholder={form.markupType === 'percentage' ? '20' : '500'} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Dates, priority, status */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div>
              <label className={labelClass}>Valid From</label>
              <input type="datetime-local" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Valid Until</label>
              <input type="datetime-local" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <input type="number" value={form.priority} onChange={(e) => set('priority', e.target.value)} min={0} step={1} className={inputClass} />
              <p className="mt-1 text-xs text-gray-500">Higher = takes precedence.</p>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value as 'active' | 'inactive')} className={inputClass}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm disabled:opacity-50">
              {saving ? 'Saving…' : editingRuleId ? 'Save Changes' : 'Create Rule'}
            </button>
            <button type="button" onClick={cancelForm} className="px-6 py-2 border border-white/10 text-gray-400 font-medium rounded-lg hover:border-white/30 transition-colors text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loadingRules ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          No pricing rules yet. Click <span className="text-brand-gold">+ Add Rule</span> to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const svc = airportServices.find((as) => as.id === rule.airportServiceId);
            const svcLabel = svc ? getServiceLabel(svc) : rule.airportServiceId.slice(0, 8);
            const pp = rule.passengerPricing;
            const hasPerType = pp != null && ('adult' in pp || 'child' in pp);

            return (
              <div key={rule.id} className="bg-brand-black border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-brand-white">{svcLabel}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${rule.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {rule.status}
                      </span>
                      {rule.supplierId && (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300">
                          {supplierName(rule.supplierId)}
                        </span>
                      )}
                      {rule.priority > 0 && (
                        <span className="text-xs text-gray-500">priority {rule.priority}</span>
                      )}
                    </div>

                    {rule.mode === 'fixed' ? (
                      <div className="text-sm text-gray-300 font-mono">
                        {hasPerType && pp != null ? (
                          <span>
                            Adult: {formatPrice(pp['adult'] ?? rule.basePriceMinor, rule.currency)}
                            {pp['child'] != null && (
                              <span className="text-gray-500 ml-2">· Child: {pp['child'] === 0 ? 'Free' : formatPrice(pp['child'], rule.currency)}</span>
                            )}
                            {pp['infant'] != null && (
                              <span className="text-gray-500 ml-2">· Infant: {pp['infant'] === 0 ? 'Free' : formatPrice(pp['infant'], rule.currency)}</span>
                            )}
                          </span>
                        ) : formatPrice(rule.basePriceMinor, rule.currency)}
                        {' '}<span className="text-gray-500 text-xs">EUR</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-300 font-mono">
                        Cost {formatPrice(rule.supplierCostMinor, rule.currency)} + {rule.markupValue}{rule.markupType === 'percentage' ? '%' : ' EUR'}
                      </div>
                    )}

                    {(rule.validFrom || rule.validTo) && (
                      <div className="text-xs text-gray-500">
                        {rule.validFrom ? new Date(rule.validFrom).toLocaleDateString() : '∞'}
                        {' — '}
                        {rule.validTo ? new Date(rule.validTo).toLocaleDateString() : '∞'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(rule)}
                      className="px-3 py-1.5 text-xs border border-white/10 text-gray-300 hover:border-brand-gold hover:text-brand-gold rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    {deleteConfirm === rule.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id)}
                          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-xs border border-white/10 text-gray-400 rounded-lg hover:border-white/30 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(rule.id)}
                        className="px-3 py-1.5 text-xs border border-white/10 text-gray-500 hover:border-red-500/50 hover:text-red-400 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
