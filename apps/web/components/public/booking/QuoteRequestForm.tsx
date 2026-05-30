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
    if (phone.trim().length < 4) return setError('Please enter a phone number so we can reach you with the quote.');
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
          phone: phone.trim(),
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
        <h2 className="text-xl font-bold text-ink mb-3">
          We're on it, {fullName.split(' ')[0]}
        </h2>
        <p className="text-ink-2 mb-4 max-w-md mx-auto leading-relaxed text-base">
          We are receiving your request, and our customer service team will contact you{' '}
          <strong className="text-ink">within minutes</strong>.
        </p>
        <p className="text-sm text-ink-3 mb-5 max-w-md mx-auto leading-relaxed">
          A confirmation has been sent to <strong className="text-ink">{email}</strong>. We'll reach out by
          WhatsApp or phone on <strong className="text-ink">{phone}</strong> with your tailored price for{' '}
          <strong className="text-ink">{airportName} ({iataCode})</strong>.
        </p>
        <a
          href={`https://wa.me/441748220006?text=${encodeURIComponent(`Hello, I just requested a quote for ${airportName} (${iataCode}) under the name ${fullName}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1eb95c] text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/>
          </svg>
          Reach us on WhatsApp now
        </a>
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
            <label className={labelCls}>
              Phone <span className="text-red-500">*</span>
              <span className="text-xs text-ink-3 font-normal ms-2">(WhatsApp preferred)</span>
            </label>
            <input
              type="tel"
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7700 900123"
              required
            />
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
