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

interface Props {
  airportId: string;
  airportServices: AirportService[];
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const DAY_LABELS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

function getServiceLabel(as: AirportService): string {
  if (!as.service) return as.id.slice(0, 8);
  const t = as.service.translations.find((t) => t.locale === 'en');
  return t?.name ?? as.service.slug;
}

interface TimeWindow {
  open: string;
  close: string;
}

export function AvailabilityRuleForm({ airportId, airportServices }: Props) {
  const router = useRouter();

  const [airportServiceId, setAirportServiceId] = useState(
    airportServices[0]?.id ?? '',
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeWindows, setTimeWindows] = useState<TimeWindow[]>([
    { open: '09:00', close: '18:00' },
  ]);
  const [cutOffMinutes, setCutOffMinutes] = useState('120');
  const [minNoticeMinutes, setMinNoticeMinutes] = useState('60');
  const [capacityPerSlot, setCapacityPerSlot] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function addTimeWindow() {
    setTimeWindows((prev) => [...prev, { open: '09:00', close: '18:00' }]);
  }

  function removeTimeWindow(index: number) {
    setTimeWindows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTimeWindow(index: number, field: 'open' | 'close', value: string) {
    setTimeWindows((prev) =>
      prev.map((tw, i) => (i === index ? { ...tw, [field]: value } : tw)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (daysOfWeek.length === 0) {
      setError('Select at least one day of the week.');
      return;
    }
    if (timeWindows.length === 0) {
      setError('Add at least one time window.');
      return;
    }

    setSaving(true);
    setError(null);

    const body = {
      airportServiceId,
      daysOfWeek,
      timeWindows,
      cutOffMinutes: parseInt(cutOffMinutes, 10),
      minNoticeMinutes: parseInt(minNoticeMinutes, 10),
      capacityPerSlot: capacityPerSlot ? parseInt(capacityPerSlot, 10) : null,
      status,
    };

    try {
      const res = await fetch(`${API_BASE}/api/admin/availability/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to create availability rule');
        return;
      }

      router.push(`/admin/airports/${airportId}/availability`);
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

      {/* Days of Week */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Days of Week <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {DAY_LABELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                daysOfWeek.includes(value)
                  ? 'bg-brand-gold text-brand-black'
                  : 'bg-brand-black border border-white/10 text-gray-400 hover:border-brand-gold'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Windows */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Time Windows <span className="text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={addTimeWindow}
            className="text-xs text-brand-gold hover:underline"
          >
            + Add window
          </button>
        </div>
        <div className="space-y-2">
          {timeWindows.map((tw, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={tw.open}
                  onChange={(e) => updateTimeWindow(index, 'open', e.target.value)}
                  required
                  className="px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none font-mono"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="time"
                  value={tw.close}
                  onChange={(e) => updateTimeWindow(index, 'close', e.target.value)}
                  required
                  className="px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none font-mono"
                />
              </div>
              {timeWindows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTimeWindow(index)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cut-off + Notice */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Cut-off (minutes)
          </label>
          <input
            type="number"
            value={cutOffMinutes}
            onChange={(e) => setCutOffMinutes(e.target.value)}
            min={0}
            step={1}
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Min Notice (minutes)
          </label>
          <input
            type="number"
            value={minNoticeMinutes}
            onChange={(e) => setMinNoticeMinutes(e.target.value)}
            min={0}
            step={1}
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          />
        </div>
      </div>

      {/* Capacity + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Capacity per Slot
          </label>
          <input
            type="number"
            value={capacityPerSlot}
            onChange={(e) => setCapacityPerSlot(e.target.value)}
            min={1}
            step={1}
            placeholder="Unlimited"
            className="w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
          />
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
          onClick={() => router.push(`/admin/airports/${airportId}/availability`)}
          className="px-6 py-2 bg-transparent border border-white/10 text-gray-400 font-medium rounded-lg hover:border-white/30 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
