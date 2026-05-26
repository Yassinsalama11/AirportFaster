'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// (Admin requests now go through the Next.js /api/admin proxy that forwards the session cookie)

interface AirportOption {
  id: string;
  iataCode: string;
  city: string;
  airportServices: Array<{
    id: string;
    isActive: boolean;
    service?: {
      slug: string;
      translations: Array<{ locale: string; name: string }>;
    };
  }>;
}

interface Coverage {
  id: string;
  airportServiceId: string;
  priority: number;
  status: string;
  airportService?: {
    airport?: {
      iataCode: string;
      translations: Array<{ locale: string; name: string }>;
    };
    service?: {
      slug: string;
      translations: Array<{ locale: string; name: string }>;
    };
  };
}

interface Props {
  supplierId: string;
  coverages: Coverage[];
  availableAirports: AirportOption[];
}

function getServiceName(service?: { slug: string; translations: Array<{ locale: string; name: string }> } | null): string {
  if (!service) return '—';
  const t = service.translations.find((t) => t.locale === 'en');
  return t?.name ?? service.slug;
}

function getAirportName(airport?: { iataCode: string; translations: Array<{ locale: string; name: string }> } | null): string {
  if (!airport) return '—';
  const t = airport.translations.find((t) => t.locale === 'en');
  return `${airport.iataCode} – ${t?.name ?? ''}`;
}

export function CoverageTab({ supplierId, coverages, availableAirports }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [selectedAirportId, setSelectedAirportId] = useState(availableAirports[0]?.id ?? '');
  const [airportServiceId, setAirportServiceId] = useState('');
  const [priority, setPriority] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAirport = availableAirports.find((a) => a.id === selectedAirportId);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!airportServiceId) {
      setError('Select a service');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/coverage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          airportServiceId,
          priority: parseInt(priority, 10),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to add coverage');
        return;
      }
      setShowForm(false);
      setAirportServiceId('');
      setPriority('0');
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(coverageId: string) {
    if (!confirm('Remove this coverage?')) return;
    try {
      await fetch(
        `/api/admin/suppliers/${supplierId}/coverage/${coverageId}`,
        { method: 'DELETE', credentials: 'include' },
      );
      router.refresh();
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="space-y-4">
      {coverages.length === 0 ? (
        <p className="text-gray-500 text-sm">No coverage configured yet.</p>
      ) : (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Airport
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {coverages.map((c) => (
                <tr key={c.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-sm text-brand-white">
                    {getAirportName(c.airportService?.airport)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {getServiceName(c.airportService?.service)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">{c.priority}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-brand-gold hover:underline"
        >
          + Add Coverage
        </button>
      ) : (
        <form
          onSubmit={handleAdd}
          className="bg-brand-navy border border-white/10 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-brand-white">Add Coverage</h3>
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Airport</label>
            <select
              value={selectedAirportId}
              onChange={(e) => {
                setSelectedAirportId(e.target.value);
                setAirportServiceId('');
              }}
              className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
            >
              {availableAirports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.iataCode} — {a.city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Service <span className="text-red-400">*</span>
            </label>
            <select
              value={airportServiceId}
              onChange={(e) => setAirportServiceId(e.target.value)}
              required
              className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
            >
              <option value="">— Select service —</option>
              {(selectedAirport?.airportServices ?? [])
                .filter((as) => as.isActive)
                .map((as) => {
                  const t = as.service?.translations.find((t) => t.locale === 'en');
                  const label = t?.name ?? as.service?.slug ?? as.id.slice(0, 8);
                  return (
                    <option key={as.id} value={as.id}>
                      {label}
                    </option>
                  );
                })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Priority</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              min={0}
              step={1}
              className="w-32 px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-brand-gold text-brand-black font-semibold rounded text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border border-white/10 text-gray-400 rounded text-sm hover:border-white/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
