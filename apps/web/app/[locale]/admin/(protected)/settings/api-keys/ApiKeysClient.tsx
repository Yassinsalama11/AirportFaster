'use client';

import { useState } from 'react';
import { CreateApiKeyModal } from '@/components/admin/settings/CreateApiKeyModal';
import { API_URL } from '@/lib/api-client';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

interface Props {
  initialKeys: ApiKey[];
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border border-green-500/30',
  revoked: 'bg-red-500/20 text-red-400 border border-red-500/30',
  expired: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ApiKeysClient({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [showModal, setShowModal] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  function handleCreated(newKey: { id: string; name: string; prefix: string; status: string }) {
    const key: ApiKey = {
      id: newKey.id,
      name: newKey.name,
      prefix: newKey.prefix,
      scopes: [],
      lastUsedAt: null,
      expiresAt: null,
      status: newKey.status,
      createdAt: new Date().toISOString(),
    };
    setKeys((prev) => [key, ...prev]);
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    try {
      const response = await fetch(`${API_URL}/api/admin/api-keys/${keyId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await response.json()) as { success: boolean };
      if (response.ok && data.success) {
        setKeys((prev) =>
          prev.map((k) => (k.id === keyId ? { ...k, status: 'revoked' } : k)),
        );
      }
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-white">API Keys</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {keys.length} key{keys.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors"
          >
            Create API Key
          </button>
        </div>

        {/* Table */}
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {keys.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No API keys yet. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Prefix
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Scopes
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {keys.map((apiKey) => (
                    <tr key={apiKey.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-brand-white">
                        {apiKey.name}
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs font-mono text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded">
                          {apiKey.prefix}...
                        </code>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {apiKey.scopes.length === 0 ? (
                            <span className="text-xs text-gray-500">—</span>
                          ) : (
                            apiKey.scopes.map((scope) => (
                              <span
                                key={scope}
                                className="text-xs px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400 font-mono"
                              >
                                {scope}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {formatDate(apiKey.lastUsedAt)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {formatDate(apiKey.expiresAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[apiKey.status] ?? 'bg-gray-500/20 text-gray-400'}`}
                        >
                          {apiKey.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {apiKey.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(apiKey.id)}
                            disabled={revoking === apiKey.id}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                          >
                            {revoking === apiKey.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CreateApiKeyModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
