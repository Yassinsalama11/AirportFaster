'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ServiceOption { slug: string; name: string; }

interface Props {
  airportSlug: string;
  airportName: string;
  iataCode: string;
  services: ServiceOption[];
  presetService?: string;
  presetDate?: string;
  presetPassengers?: string;
}

const inputCls =
  'w-full px-4 py-2.5 bg-surface border border-line rounded-xl text-ink text-sm focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none transition-colors';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

export function QuoteRequestForm({
  airportSlug,
  airportName,
  iataCode,
  services,
  presetService,
  presetDate,
  presetPassengers,
}: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceSlug, setServiceSlug] = useState(presetService ?? services[0]?.slug ?? '');
  const [direction, setDirection] = useState<'arrival' | 'departure' | 'transfer'>('arrival');
  const [serviceDate, setServiceDate] = useState(presetDate ?? '');
  const [passengerCount, setPassengerCount] = useState(presetPassengers ?? '1');
  const [flightNumber, setFlightNumber] = useState('');
  const [terminal, setTerminal] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) return setError('Please enter your full name.');
    if (!/.+@.+\..+/.test(email)) return setError('Please enter a valid email address.');
    if (!serviceDate) return setError('Please choose a service date.');
    const pax = parseInt(passengerCount, 10);
    if (!Number.isFinite(pax) || pax < 1) return setError('Please enter a valid passenger count.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          airportSlug,
          serviceSlug: serviceSlug || undefined,
          direction,
          serviceDate,
          passengerCount: pax,
          flightNumber: flightNumber.trim() || undefined,
          terminal: terminal.trim() || undefined,
          specialRequests: specialRequests.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-surface border border-line rounded-2xl shadow-card p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-gold/15 text-brand-gold-dark mb-4">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">Request received</h2>
        <p className="text-ink-2 mb-4 max-w-md mx-auto leading-relaxed">
          Thanks {fullName.split(' ')[0]}. Our concierge team has your request for{' '}
          <strong className="text-ink">{airportName} ({iataCode})</strong> and will email you a
          tailored price at <strong className="text-ink">{email}</strong> within 24 hours.
        </p>
        <p className="text-xs text-ink-3">
          Need it sooner? WhatsApp us at{' '}
          <a href={`https://wa.me/441748220006?text=${encodeURIComponent(`Hello, I just requested a quote for ${airportName} (${iataCode}) under the name ${fullName}.`)}`} target="_blank" rel="noopener noreferrer" className="text-brand-gold-dark hover:underline">
            +44 1748 220006
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-line rounded-2xl shadow-card p-6 lg:p-8 space-y-5"
    >
      {/* Contact */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-4">Your contact details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Full name</label>
            <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Phone (optional)</label>
            <input type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 ..." />
          </div>
        </div>
      </div>

      <div className="h-px bg-line" />

      {/* Service request */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-4">Service request</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.length > 0 && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Service</label>
              <select className={inputCls} value={serviceSlug} onChange={(e) => setServiceSlug(e.target.value)}>
                <option value="">— Not sure yet —</option>
                {services.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls}>Direction</label>
            <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value as 'arrival' | 'departure' | 'transfer')}>
              <option value="arrival">Arrival</option>
              <option value="departure">Departure</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Service date</label>
            <input type="date" className={inputCls} value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Number of passengers</label>
            <input type="number" min={1} max={50} className={inputCls} value={passengerCount} onChange={(e) => setPassengerCount(e.target.value)} required />
          </div>
        </div>
      </div>

      <div className="h-px bg-line" />

      {/* Flight */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-4">
          Flight details <span className="text-xs text-ink-3 font-normal">(optional but helpful)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Flight number</label>
            <input className={inputCls} value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} placeholder="EK 023" />
          </div>
          <div>
            <label className={labelCls}>Terminal</label>
            <input className={inputCls} value={terminal} onChange={(e) => setTerminal(e.target.value)} placeholder="T3" />
          </div>
        </div>
      </div>

      <div className="h-px bg-line" />

      {/* Message */}
      <div>
        <label className={labelCls}>
          Additional message <span className="text-xs text-ink-3 font-normal">(optional)</span>
        </label>
        <textarea
          rows={4}
          className={`${inputCls} resize-none`}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Mobility assistance, child seat, family meet point, etc."
        />
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-brand-gold hover:bg-brand-gold-light text-brand-black font-semibold rounded-xl text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Sending…' : 'Send quote request'}
        </button>
        <p className="text-xs text-ink-3 leading-snug">
          We'll email you within 24 hours. No payment is taken now.
        </p>
      </div>
    </form>
  );
}
