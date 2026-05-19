'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function SupplierLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/supplier/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: { message: string };
      };

      if (!response.ok || !data.success) {
        setError(data.error?.message ?? 'Login failed. Please try again.');
        return;
      }

      router.push('/supplier-portal');
      router.refresh();
    } catch {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@supplier.com"
          className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="pin"
          className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
        >
          Portal PIN
        </label>
        <input
          id="pin"
          type="password"
          autoComplete="current-password"
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Your portal PIN"
          className="w-full px-4 py-3 bg-brand-black border border-white/10 rounded-lg text-brand-white placeholder-gray-600 text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-brand-black/30 border-t-brand-black rounded-full animate-spin" />
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
}
