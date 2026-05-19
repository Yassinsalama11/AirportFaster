'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface SupplierService {
  id: string;
  serviceId: string;
  status: string;
  service?: {
    slug: string;
    translations: Array<{ locale: string; name: string }>;
  };
}

interface Props {
  supplierId: string;
  supplierServices: SupplierService[];
}

function getServiceName(service?: { slug: string; translations: Array<{ locale: string; name: string }> } | null): string {
  if (!service) return '—';
  const t = service.translations?.find((t) => t.locale === 'en');
  return t?.name ?? service.slug;
}

export function ServicesTab({ supplierId, supplierServices }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId.trim()) {
      setError('Enter a service ID');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/suppliers/${supplierId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ serviceId: serviceId.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to link service');
        return;
      }
      setShowForm(false);
      setServiceId('');
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink(svcId: string) {
    if (!confirm('Unlink this service?')) return;
    try {
      await fetch(`${API_BASE}/api/admin/suppliers/${supplierId}/services/${svcId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      router.refresh();
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="space-y-4">
      {supplierServices.length === 0 ? (
        <p className="text-gray-500 text-sm">No services linked yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {supplierServices.map((ss) => (
                <tr key={ss.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3 text-sm text-brand-white">{getServiceName(ss.service)}</td>
                  <td className="px-5 py-3 text-sm">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      ss.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{ss.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleUnlink(ss.serviceId)}
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
          + Link Service
        </button>
      ) : (
        <form
          onSubmit={handleLink}
          className="bg-brand-navy border border-white/10 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-brand-white">Link Service</h3>
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Service ID (UUID) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="w-full px-3 py-1.5 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none font-mono"
            />
            <p className="text-xs text-gray-600 mt-1">Find the service ID from the Services admin page.</p>
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
