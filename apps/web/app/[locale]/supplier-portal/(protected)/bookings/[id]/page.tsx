import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookingActions } from './BookingActions';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const SUPPLIER_COOKIE = 'airportfaster_supplier_session';

type BookingStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'pending_supplier_assignment'
  | 'supplier_assigned'
  | 'pending_supplier_confirmation'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

interface BookingDetail {
  id: string;
  reference: string;
  status: BookingStatus;
  direction: string;
  serviceDateTime: string;
  passengerCount: number;
  specialRequests: string | null;
  currency: string;
  totalMinor: number;
  customer: {
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  airportService: {
    airport: {
      iataCode: string;
      city: string;
      translations: Array<{ locale: string; name: string }>;
    };
    service: {
      translations: Array<{ locale: string; name: string }>;
    };
  };
  passengers: Array<{ id: string; fullName: string; type: string }>;
  flights: Array<{ id: string; flightNumber: string; scheduledTime: string | null; terminal: string | null }>;
}

interface AssignmentDetail {
  id: string;
  status: string;
  offeredAt: string;
  respondedAt: string | null;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  draft: 'Draft',
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  pending_supplier_assignment: 'Pending Assignment',
  supplier_assigned: 'Assigned',
  pending_supplier_confirmation: 'Awaiting Confirmation',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  draft: 'text-gray-400 bg-gray-400/10',
  pending_payment: 'text-yellow-400 bg-yellow-400/10',
  paid: 'text-blue-400 bg-blue-400/10',
  pending_supplier_assignment: 'text-orange-400 bg-orange-400/10',
  supplier_assigned: 'text-blue-400 bg-blue-400/10',
  pending_supplier_confirmation: 'text-orange-400 bg-orange-400/10',
  confirmed: 'text-green-400 bg-green-400/10',
  in_progress: 'text-brand-gold bg-brand-gold/10',
  completed: 'text-green-500 bg-green-500/10',
  cancelled: 'text-red-400 bg-red-400/10',
  refunded: 'text-purple-400 bg-purple-400/10',
  failed: 'text-red-500 bg-red-500/10',
};

async function getBookingDetail(
  token: string,
  bookingId: string,
): Promise<{ booking: BookingDetail; assignment: AssignmentDetail } | null> {
  try {
    const res = await fetch(`${API_URL}/api/supplier/bookings/${bookingId}`, {
      headers: { Cookie: `${SUPPLIER_COOKIE}=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success: boolean;
      data?: { booking: BookingDetail; assignment: AssignmentDetail };
    };
    return data.success ? (data.data ?? null) : null;
  } catch {
    return null;
  }
}

export const metadata = {
  title: 'Booking Detail | Supplier Portal',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierBookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore['get'](SUPPLIER_COOKIE)?.value ?? '';
  if (!token) {
    redirect('/supplier-portal/login');
  }
  const result = await getBookingDetail(token, id);

  if (!result) {
    notFound();
  }

  const { booking: b, assignment } = result;
  const airportName =
    b.airportService.airport.translations.find((t) => t.locale === 'en')?.name ??
    b.airportService.airport.iataCode;
  const serviceName =
    b.airportService.service.translations.find((t) => t.locale === 'en')?.name ?? '—';
  const serviceDate = new Date(b.serviceDateTime);
  const statusColor = STATUS_COLORS[b.status] ?? 'text-gray-400 bg-gray-400/10';
  const statusLabel = STATUS_LABELS[b.status] ?? b.status;
  const customerName =
    b.customer.fullName ??
    [b.customer.firstName, b.customer.lastName].filter(Boolean).join(' ') ??
    'Unknown';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/supplier-portal/bookings"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Bookings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-white font-mono">{b.reference}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {airportName} — {serviceName}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Action buttons */}
      <BookingActions bookingId={b.id} status={b.status} serviceDateTime={b.serviceDateTime} />

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service info */}
        <div className="bg-brand-navy border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Service Details
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500">Airport</dt>
              <dd className="text-sm text-brand-white">
                {airportName} ({b.airportService.airport.iataCode})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">City</dt>
              <dd className="text-sm text-brand-white">{b.airportService.airport.city}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Service</dt>
              <dd className="text-sm text-brand-white">{serviceName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Direction</dt>
              <dd className="text-sm text-brand-white capitalize">{b.direction}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Date &amp; Time</dt>
              <dd className="text-sm text-brand-white">
                {serviceDate.toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {serviceDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Passengers</dt>
              <dd className="text-sm text-brand-white">{b.passengerCount}</dd>
            </div>
            {b.specialRequests && (
              <div>
                <dt className="text-xs text-gray-500">Special Requests</dt>
                <dd className="text-sm text-brand-white">{b.specialRequests}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Customer info (limited for privacy) */}
        <div className="bg-brand-navy border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Customer
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500">Name</dt>
              <dd className="text-sm text-brand-white">{customerName}</dd>
            </div>
            {b.customer.phone && (
              <div>
                <dt className="text-xs text-gray-500">Phone</dt>
                <dd className="text-sm text-brand-white">
                  <a
                    href={`tel:${b.customer.phone}`}
                    className="text-brand-gold hover:underline"
                  >
                    {b.customer.phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Passengers list */}
      {b.passengers.length > 0 && (
        <div className="bg-brand-navy border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Passengers ({b.passengers.length})
          </h2>
          <ul className="divide-y divide-white/5">
            {b.passengers.map((p, idx) => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <span className="text-sm text-brand-white">
                  {idx + 1}. {p.fullName}
                </span>
                <span className="text-xs text-gray-500 capitalize">{p.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Flights */}
      {b.flights.length > 0 && (
        <div className="bg-brand-navy border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Flights</h2>
          <ul className="divide-y divide-white/5">
            {b.flights.map((f) => (
              <li key={f.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-brand-white font-mono">
                    {f.flightNumber}
                  </span>
                  {f.terminal && (
                    <span className="ml-2 text-xs text-gray-500">Terminal {f.terminal}</span>
                  )}
                </div>
                {f.scheduledTime && (
                  <span className="text-sm text-gray-400">
                    {new Date(f.scheduledTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assignment info */}
      <div className="bg-brand-navy border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Assignment
        </h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-gray-500">Offered At</dt>
            <dd className="text-sm text-brand-white">
              {new Date(assignment.offeredAt).toLocaleString('en-GB')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Assignment Status</dt>
            <dd className="text-sm text-brand-white capitalize">{assignment.status}</dd>
          </div>
          {assignment.respondedAt && (
            <div>
              <dt className="text-xs text-gray-500">Responded At</dt>
              <dd className="text-sm text-brand-white">
                {new Date(assignment.respondedAt).toLocaleString('en-GB')}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
