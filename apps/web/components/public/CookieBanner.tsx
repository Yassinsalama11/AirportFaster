'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        setVisible(true);
      }
    } catch {
      // localStorage may be unavailable (SSR or restricted context)
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
      window.dispatchEvent(new Event('cookie_consent_changed'));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function handleDecline() {
    try {
      localStorage.setItem(STORAGE_KEY, 'declined');
      window.dispatchEvent(new Event('cookie_consent_changed'));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6"
    >
      <div className="max-w-4xl mx-auto bg-brand-navy border border-line rounded-xl shadow-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-300 flex-1">
          We use cookies to improve your experience on AirportFaster. Essential cookies are always
          active. Analytics cookies help us understand how the platform is used.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/legal/cookies"
            className="text-sm text-ink-3 hover:text-brand-gold transition-colors whitespace-nowrap"
          >
            Learn more &rarr;
          </Link>
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-surface-2 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-lg bg-brand-gold text-black text-sm font-semibold hover:bg-brand-gold/90 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
