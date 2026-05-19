import type { Metadata } from 'next';
import Link from 'next/link';
import { ManageCancelButton } from '@/components/public/booking/ManageCancelButton';

export const metadata: Metadata = {
  title: 'Manage Booking — AirportFaster',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface AirportTranslation {
  locale: string;
  name: string;
}

interface ServiceTranslation {
  locale: string;
  name: string;
}

interface Passenger {
  id: string;
  fullName: string;
  type: string;
}

interface Flight {
  id: string;
  flightNumber: string;
  airlineCode: string | null;
  scheduledTime: string | null;
  terminal: string | null;
}

interface PriceSnapshot {
  totalMinor: number;
  currency: string;
}

interface Booking {
  id: string;
  reference: string;
  status: string;
  serviceDateTime: string;
  customer: {
    fullName: string | null;
    email: string;
    phone: string | null;
  };
  airportService: {
    airport: {
      iataCode: string;
      translations: AirportTranslation[];
    };
    service: {
      translations: ServiceTranslation[];
    };
  };
  passengers: Passenger[];
  flights: Flight[];
  priceSnapshot: PriceSnapshot | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-500/20 text-ink-3 border border-gray-500/30',
  pending_payment: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  paid: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  pending_supplier_assignment: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  supplier_assigned: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  pending_supplier_confirmation: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  in_progress: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  completed: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
  refunded: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

// Statuses from which a customer can cancel
const CANCELLABLE_STATUSES = new Set([
  'pending_payment',
  'paid',
  'pending_supplier_assignment',
  'supplier_assigned',
  'pending_supplier_confirmation',
  'confirmed',
]);

function formatCurrency(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

function getEnName(translations: Array<{ locale: string; name: string }>): string {
  return translations.find((t) => t.locale === 'en')?.name ?? '—';
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function getBooking(token: string): Promise<Booking | null> {
  const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

  try {
    const res = await fetch(
      `${API_URL}/api/public/bookings/manage?token=${encodeURIComponent(token)}`,
      { cache: 'no-store' },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as {
      success: boolean;
      data?: { booking: Booking };
    };

    if (!data.success || !data.data) return null;

    return data.data.booking;
  } catch {
    return null;
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ManageTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await getBooking(token);

  if (!booking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Booking not found</h1>
            <p className="text-ink-3 mt-3 text-sm leading-relaxed">
              This manage link has expired or is invalid. Please use the lookup form to request a
              new link.
            </p>
          </div>
          <Link
            href="/manage"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-black text-sm font-bold rounded-xl hover:bg-brand-gold/90 transition-colors"
          >
            Back to Manage Booking
          </Link>
        </div>
      </div>
    );
  }

  const airport = booking.airportService.airport;
  const service = booking.airportService.service;
  const canCancel = CANCELLABLE_STATUSES.has(booking.status);

  return (
    <div className="min-h-[70vh] px-4 py-12 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">Booking Reference</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold text-brand-gold">
              {booking.reference}
            </span>
            <span
              className={`inline-flex px-2.5 py-1 rounded text-xs font-medium ${STATUS_BADGE[booking.status] ?? 'bg-gray-500/20 text-ink-3'}`}
            >
              {booking.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Service card */}
      <div className="bg-brand-navy border border-line rounded-xl p-5 space-y-4">
        <p className="text-xs text-ink-3 uppercase tracking-wider">Service</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ink-3 mb-0.5">Airport</p>
            <p className="text-ink">
              <span className="font-mono text-brand-gold text-xs mr-1">{airport.iataCode}</span>
              {getEnName(airport.translations)}
            </p>
          </div>
          <div>
            <p className="text-ink-3 mb-0.5">Service</p>
            <p className="text-ink">{getEnName(service.translations)}</p>
          </div>
          <div>
            <p className="text-ink-3 mb-0.5">Date</p>
            <p className="text-ink">
              {new Date(booking.serviceDateTime).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          {booking.priceSnapshot && (
            <div>
              <p className="text-ink-3 mb-0.5">Price Paid</p>
              <p className="text-brand-gold font-bold">
                {formatCurrency(booking.priceSnapshot.totalMinor, booking.priceSnapshot.currency)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Passengers */}
      {booking.passengers.length > 0 && (
        <div className="bg-brand-navy border border-line rounded-xl p-5">
          <p className="text-xs text-ink-3 uppercase tracking-wider mb-3">Passengers</p>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-ink-3 uppercase">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-ink-3 uppercase">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {booking.passengers.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 text-ink">{p.fullName}</td>
                    <td className="px-4 py-2.5 text-ink-3 capitalize">{p.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flight info */}
      {booking.flights.length > 0 && (
        <div className="bg-brand-navy border border-line rounded-xl p-5">
          <p className="text-xs text-ink-3 uppercase tracking-wider mb-3">Flight</p>
          {booking.flights.map((f) => (
            <div key={f.id} className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-ink-3 mb-0.5">Flight</p>
                <p className="text-ink font-mono">{f.flightNumber}</p>
              </div>
              <div>
                <p className="text-ink-3 mb-0.5">Airline</p>
                <p className="text-ink">{f.airlineCode ?? '—'}</p>
              </div>
              <div>
                <p className="text-ink-3 mb-0.5">Scheduled</p>
                <p className="text-ink">
                  {f.scheduledTime
                    ? new Date(f.scheduledTime).toLocaleString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-ink-3 mb-0.5">Terminal</p>
                <p className="text-ink">{f.terminal ?? '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact details */}
      <div className="bg-brand-navy border border-line rounded-xl p-5">
        <p className="text-xs text-ink-3 uppercase tracking-wider mb-3">Contact Details</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-ink-3 mb-0.5">Name</p>
            <p className="text-ink">{booking.customer.fullName ?? '—'}</p>
          </div>
          <div>
            <p className="text-ink-3 mb-0.5">Email</p>
            <p className="text-ink">{booking.customer.email}</p>
          </div>
          <div>
            <p className="text-ink-3 mb-0.5">Phone</p>
            <p className="text-ink">{booking.customer.phone ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Cancel section */}
      {canCancel && (
        <ManageCancelButton token={token} bookingId={booking.id} />
      )}
    </div>
  );
}
