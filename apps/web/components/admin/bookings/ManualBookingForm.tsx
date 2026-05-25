'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSearchSelect } from '@/components/admin/AdminSearchSelect';

interface AirportOption {
  id: string;
  iataCode: string;
  city: string;
  translations: Array<{ locale: string; name: string }>;
  airportServices: Array<{
    id: string;
    isActive: boolean;
    service: {
      id: string;
      slug: string;
      translations: Array<{ locale: string; name: string }>;
    };
  }>;
}

interface Props {
  airports: AirportOption[];
}

function todayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function getName(translations: Array<{ locale: string; name: string }>, fallback: string): string {
  return translations.find((t) => t.locale === 'en')?.name ?? fallback;
}

export function ManualBookingForm({ airports }: Props) {
  const router = useRouter();
  const [airportId, setAirportId] = useState('');
  const [airportServiceId, setAirportServiceId] = useState('');
  const [direction, setDirection] = useState<'arrival' | 'departure'>('arrival');
  const [serviceDate, setServiceDate] = useState(todayIsoDate());

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [leadFirstName, setLeadFirstName] = useState('');
  const [leadLastName, setLeadLastName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');

  const [flightNumber, setFlightNumber] = useState('');
  const [flightDateTime, setFlightDateTime] = useState('');
  const [flightTerminal, setFlightTerminal] = useState('');
  const [flightOriginDest, setFlightOriginDest] = useState('');

  const [specialRequests, setSpecialRequests] = useState('');
  const [staffNote, setStaffNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const airport = useMemo(() => airports.find((a) => a.id === airportId), [airports, airportId]);
  const services = useMemo(
    () => (airport ? airport.airportServices.filter((s) => s.isActive) : []),
    [airport],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!airportServiceId) {
      setError('Select a service');
      return;
    }
    if (!leadFirstName.trim() || !leadLastName.trim() || !leadEmail.trim() || !leadPhone.trim()) {
      setError('Lead passenger name, email, and phone are required');
      return;
    }
    if (!flightDateTime) {
      setError('Flight date & time is required');
      return;
    }

    setSaving(true);

    const passengers: Array<{ firstName: string; lastName: string; type: 'adult' | 'child' | 'infant' }> = [
      { firstName: leadFirstName.trim(), lastName: leadLastName.trim(), type: 'adult' },
    ];
    for (let i = 1; i < adults; i++) passengers.push({ firstName: 'Adult', lastName: `${i + 1}`, type: 'adult' });
    for (let i = 0; i < children; i++) passengers.push({ firstName: 'Child', lastName: `${i + 1}`, type: 'child' });
    for (let i = 0; i < infants; i++) passengers.push({ firstName: 'Infant', lastName: `${i + 1}`, type: 'infant' });

    const body: Record<string, unknown> = {
      airportServiceId,
      serviceDate,
      direction,
      passengers,
      contact: {
        email: leadEmail.trim(),
        phone: leadPhone.trim(),
        firstName: leadFirstName.trim(),
        lastName: leadLastName.trim(),
      },
      flight: {
        direction,
        flightNumber: flightNumber.trim() || 'XX0000',
        scheduledAt: new Date(flightDateTime).toISOString(),
        ...(flightTerminal.trim() && { terminal: flightTerminal.trim() }),
        ...(flightOriginDest.trim() && {
          [direction === 'arrival' ? 'origin' : 'destination']: flightOriginDest.trim().toUpperCase(),
        }),
      },
      ...(specialRequests.trim() && {
        specialRequests: staffNote.trim()
          ? `${specialRequests.trim()}\n\n[Staff note]: ${staffNote.trim()}`
          : specialRequests.trim(),
      }),
      ...(!specialRequests.trim() && staffNote.trim()
        ? { specialRequests: `[Staff note]: ${staffNote.trim()}` }
        : {}),
    };

    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Failed to create booking');
        setSaving(false);
        return;
      }
      router.push(`/admin/bookings/${json.data.bookingId}`);
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }

  const labelCls = 'block text-xs font-medium text-gray-400 mb-1';
  const inputCls =
    'w-full px-3 py-2 bg-brand-black border border-white/10 rounded text-brand-white text-sm focus:border-brand-gold outline-none';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Service */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-white uppercase tracking-wider">Service</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Airport *</label>
            <AdminSearchSelect
              options={airports.map((a) => ({
                id: a.id,
                primary: a.iataCode,
                secondary: getName(a.translations, a.city),
              }))}
              value={airportId}
              onChange={(id) => {
                setAirportId(id);
                setAirportServiceId('');
              }}
              placeholder="Type IATA or city…"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Service *</label>
            <AdminSearchSelect
              options={services.map((s) => ({
                id: s.id,
                primary: getName(s.service.translations, s.service.slug),
                secondary: s.service.slug,
              }))}
              value={airportServiceId}
              onChange={setAirportServiceId}
              placeholder={airport ? 'Select a service…' : 'Pick an airport first'}
              disabled={!airport}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Direction *</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'arrival' | 'departure')}
              className={inputCls}
            >
              <option value="arrival">Arrival</option>
              <option value="departure">Departure</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Service Date *</label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              min={todayIsoDate()}
              required
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* Passengers */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-white uppercase tracking-wider">Passengers</h2>
        <div className="grid grid-cols-3 gap-4">
          {([
            ['Adults', adults, setAdults, 1, 20],
            ['Children', children, setChildren, 0, 10],
            ['Infants', infants, setInfants, 0, 5],
          ] as const).map(([label, value, setter, min, max]) => (
            <div key={label}>
              <label className={labelCls}>{label}</label>
              <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => setter(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Lead Passenger */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-white uppercase tracking-wider">Lead Passenger</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>First Name *</label>
            <input type="text" value={leadFirstName} onChange={(e) => setLeadFirstName(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Last Name *</label>
            <input type="text" value={leadLastName} onChange={(e) => setLeadLastName(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone *</label>
            <input type="tel" value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} required className={inputCls} />
          </div>
        </div>
      </section>

      {/* Flight */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-white uppercase tracking-wider">Flight Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Flight Number</label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              placeholder="EK123"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Flight Date & Time *</label>
            <input
              type="datetime-local"
              value={flightDateTime}
              onChange={(e) => setFlightDateTime(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Terminal</label>
            <input
              type="text"
              value={flightTerminal}
              onChange={(e) => setFlightTerminal(e.target.value)}
              placeholder="T3"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              {direction === 'arrival' ? 'Origin IATA' : 'Destination IATA'}
            </label>
            <input
              type="text"
              value={flightOriginDest}
              onChange={(e) => setFlightOriginDest(e.target.value.toUpperCase())}
              placeholder="DXB"
              maxLength={3}
              className={`${inputCls} font-mono uppercase`}
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-white uppercase tracking-wider">Notes</h2>
        <div>
          <label className={labelCls}>Special Requests (shown to customer & supplier)</label>
          <textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            rows={3}
            placeholder="e.g. wheelchair assistance, vegetarian meal preference…"
            className={`${inputCls} resize-none`}
          />
        </div>
        <div>
          <label className={labelCls}>Staff Note (internal — appended to specialRequests with [Staff note] prefix)</label>
          <textarea
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            rows={2}
            placeholder="Internal note for ops team only…"
            className={`${inputCls} resize-none`}
          />
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating…' : 'Create Booking'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/bookings')}
          className="px-6 py-2 border border-white/10 text-gray-400 rounded-lg hover:border-white/30 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
