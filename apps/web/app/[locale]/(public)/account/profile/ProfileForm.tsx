'use client';

import { useState, FormEvent } from 'react';
import type { CustomerSessionData } from '@/lib/customer-session';
import { API_URL } from '@/lib/api-client';

interface Props {
  initialData: CustomerSessionData;
}

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
];

export function ProfileForm({ initialData }: Props) {
  const [firstName, setFirstName] = useState(initialData.firstName ?? '');
  const [lastName, setLastName] = useState(initialData.lastName ?? '');
  const [phone, setPhone] = useState(initialData.phone ?? '');
  const [locale, setLocale] = useState(initialData.locale ?? 'en');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/public/customers/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, locale }),
        credentials: 'include',
      });

      const data = (await response.json()) as { success: boolean; error?: { message: string } };

      if (!response.ok || !data.success) {
        setError(data.error?.message ?? 'Failed to update profile. Please try again.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="firstName"
            className="block text-xs font-medium text-ink-3 mb-2 uppercase tracking-wider"
          >
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-full px-4 py-3 bg-brand-black border border-line rounded-lg text-ink placeholder-gray-600 text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="block text-xs font-medium text-ink-3 mb-2 uppercase tracking-wider"
          >
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="w-full px-4 py-3 bg-brand-black border border-line rounded-lg text-ink placeholder-gray-600 text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-medium text-ink-3 mb-2 uppercase tracking-wider"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={initialData.email}
          disabled
          className="w-full px-4 py-3 bg-brand-black border border-line rounded-lg text-ink-3 text-sm cursor-not-allowed"
        />
        <p className="text-xs text-ink-3 mt-1">Email cannot be changed</p>
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-xs font-medium text-ink-3 mb-2 uppercase tracking-wider"
        >
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+44 7700 900000"
          className="w-full px-4 py-3 bg-brand-black border border-line rounded-lg text-ink placeholder-gray-600 text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="locale"
          className="block text-xs font-medium text-ink-3 mb-2 uppercase tracking-wider"
        >
          Preferred Language
        </label>
        <select
          id="locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="w-full px-4 py-3 bg-brand-black border border-line rounded-lg text-ink text-sm focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-colors"
        >
          {LOCALE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400 text-sm">Profile updated successfully</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-brand-black/30 border-t-brand-black rounded-full animate-spin" />
            Saving...
          </span>
        ) : (
          'Save Changes'
        )}
      </button>
    </form>
  );
}
