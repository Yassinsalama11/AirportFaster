'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SupplierAirport {
  id: string;
  airportId: string;
  status: string;
  airport?: {
    iataCode: string;
    city: string;
    translations: Array<{ locale: string; name: string }>;
  };
}

interface AirportOption {
  id: string;
  iataCode: string;
  city: string;
}

interface Props {
  supplierId: string;
  supplierAirports: SupplierAirport[];
  allAirports: AirportOption[];
}

function getAirportName(airport?: { iataCode: string; city: string; translations: Array<{ locale: string; name: string }> } | null): string {
  if (!airport) return '—';
  const t = airport.translations?.find((t) => t.locale === 'en');
  return `${airport.iataCode} – ${t?.name ?? airport.city}`;
}

export function AirportsTab({ supplierId, supplierAirports, allAirports }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [selectedAirportId, setSelectedAirportId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedAirportIds = new Set(supplierAirports.map((sa) => sa.airportId));
  const availableAirports = allAirports.filter((a) => !linkedAirportIds.has(a.id));

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAirportId) {
      setError('Select an airport');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/airports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airportId: selectedAirportId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to link airport');
        return;
      }
      setShowForm(false);
      setSelectedAirportId('');
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink(airportId: string) {
    if (!confirm('Unlink this airport?')) return;
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/airports/${airportId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        alert(json?.error?.message ?? 'Failed to unlink airport');
        return;
      }
      router.refresh();
    } catch {
      alert('Network error. Please try again.');
    }
  }

  return (
    <div className="space-y-4">
      {supplierAirports.length === 0 ? (
        <p className="text-gray-500 text-sm">No airports linked yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Airport</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {supplierAirports.map((sa) => (
                <tr key={sa.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-sm text-brand-white">{getAirportName(sa.airport)}</td>
                  <td className="px-5 py-3 text-sm">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      sa.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{sa.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleUnlink(sa.airportId)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Unlink
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
          + Link Airport
        </button>
      ) : (
        <form
          onSubmit={handleLink}
          className="bg-brand-navy border border-white/10 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-brand-white">Link Airport</h3>
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Airport <span className="text-red-400">*</span></label>
            <select
              value={selectedAirportId}
              onChange={(e) => setSelectedAirportId(e.target.value)}
              required
              className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none"
            >
              <option value="">— Select airport —</option>
              {availableAirports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.iataCode} — {a.city}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-brand-gold text-brand-black font-semibold rounded text-sm disabled:opacity-50"
            >
              {saving ? 'Linking…' : 'Link'}
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
