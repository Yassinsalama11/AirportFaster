'use client';

import { useState } from 'react';

// STUB: implement email-based manage link lookup
// On submit, POST to a backend endpoint that sends a manage link to the customer's email

export function ManageBookingLookup() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // STUB: implement email-based manage link lookup
      // POST /api/public/bookings/manage/lookup { reference, email }
      // For now, simulate the response
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-brand-navy border border-white/5 rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-gold/10 border border-brand-gold/30">
            <svg
              className="w-8 h-8 text-brand-gold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-brand-white mb-2">Check your email</h2>
        <p className="text-gray-400 text-sm">
          If a booking matching <span className="text-brand-white font-medium">{reference}</span>{' '}
          was found for <span className="text-brand-white font-medium">{email}</span>, we&apos;ve
          sent you a link to manage your booking.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setReference('');
            setEmail('');
          }}
          className="mt-6 text-sm text-gray-400 hover:text-brand-white transition-colors underline"
        >
          Try a different reference
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-brand-navy border border-white/5 rounded-2xl p-8">
      <h2 className="text-xl font-bold text-brand-white mb-1">Look up your booking</h2>
      <p className="text-gray-400 text-sm mb-6">
        Enter your booking reference and email address to receive a management link.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-gray-300 mb-1.5">
            Booking Reference
          </label>
          <input
            id="reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="AP-XXXXXXXX"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-brand-white placeholder-gray-600 font-mono focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-brand-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Sending link…' : 'Send management link'}
        </button>
      </div>
    </form>
  );
}
