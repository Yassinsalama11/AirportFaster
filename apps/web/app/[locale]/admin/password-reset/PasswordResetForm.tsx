'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';

const inputClass =
  'w-full px-4 py-3 bg-brand-black border border-white/10 rounded-xl text-brand-white text-sm focus:border-brand-gold outline-none';

export function PasswordResetForm() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('Password reset token is missing.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Unable to set password.');
      }
      router.replace(`/${locale}/admin/login`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to set password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
          New password
        </label>
        <input
          id="password"
          type="password"
          minLength={12}
          required
          className={inputClass}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          minLength={12}
          required
          className={inputClass}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-gold px-4 py-3 text-sm font-bold text-brand-black hover:bg-brand-gold-light disabled:opacity-60"
      >
        {loading ? 'Saving...' : 'Set password'}
      </button>
    </form>
  );
}
