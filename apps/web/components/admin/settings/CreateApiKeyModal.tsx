'use client';

import { useState, FormEvent } from 'react';
import { API_URL } from '@/lib/api-client';

const SCOPES = [
  { value: 'search', label: 'Search', description: 'Read airport and service data' },
  { value: 'bookings.read', label: 'Bookings (Read)', description: 'View booking details' },
  { value: 'bookings.write', label: 'Bookings (Write)', description: 'Create and modify bookings' },
  { value: 'pricing.read', label: 'Pricing (Read)', description: 'View pricing information' },
];

interface CreatedKey {
  key: string;
  name: string;
}

interface Props {
  onClose: () => void;
  onCreated: (key: { id: string; name: string; prefix: string; status: string }) => void;
}

export function CreateApiKeyModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['search']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, scopes: selectedScopes }),
      });

      const data = (await response.json()) as {
        success: boolean;
        data?: { id: string; key: string; name: string; prefix: string; status: string };
        error?: { message: string };
      };

      if (!response.ok || !data.success || !data.data) {
        setError(data.error?.message ?? 'Failed to create API key.');
        return;
      }

      setCreatedKey({ key: data.data.key, name: data.data.name });
      onCreated(data.data);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-brand-navy border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-semibold text-brand-white">Create API Key</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {createdKey ? (
            /* Show key once */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-amber-300 text-sm">
                  <strong>This key will not be shown again.</strong> Copy it now and store it securely.
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">
                  Your new API key — {createdKey.name}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 bg-brand-black border border-brand-gold/30 rounded-lg font-mono text-sm text-brand-gold break-all">
                    {createdKey.key}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 px-3 py-3 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs rounded-lg hover:bg-brand-gold/20 transition-colors"
                  >
                    {copied ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-green-400 text-xs mt-1">Copied to clipboard</p>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Key Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Integration"
                  className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
                  Scopes
                </label>
                <div className="space-y-2">
                  {SCOPES.map((scope) => (
                    <label
                      key={scope.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedScopes.includes(scope.value)
                          ? 'border-brand-gold/40 bg-brand-gold/5'
                          : 'border-white/5 hover:border-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.value)}
                        onChange={() => toggleScope(scope.value)}
                        className="rounded border-white/20 text-brand-gold focus:ring-brand-gold"
                      />
                      <div>
                        <p className="text-sm text-brand-white font-medium">{scope.label}</p>
                        <p className="text-xs text-gray-500">{scope.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isLoading || selectedScopes.length === 0}
                  className="flex-1 py-2.5 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Key'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-white/10 text-gray-400 text-sm rounded-lg hover:border-white/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
