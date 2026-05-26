import { Link } from '@/i18n/routing';
import { adminApiCall } from '@/lib/admin-api';

export const metadata = { title: 'Bookings' };

interface Customer {
  fullName: string | null;
  email: string;
}

interface AirportTranslation {
  locale: string;
  name: string;
}

interface ServiceTranslation {
  locale: string;
  name: string;
}

interface AirportService {
  airport: {
    iataCode: string;
    translations: AirportTranslation[];
  };
  service: {
    slug: string;
    translations: ServiceTranslation[];
  };
}

interface Booking {
  id: string;
  reference: string;
  status: string;
  currency: string;
  totalMinor: number;
  serviceDateTime: string;
  passengerCount: number;
  createdAt: string;
  customer: Customer;
  airportService: AirportService;
}

interface BookingsData {
  items: Booking[];
  nextCursor: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
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

function formatAmount(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

function getServiceName(translations: ServiceTranslation[]): string {
  return translations.find((t) => t.locale === 'en')?.name ?? '—';
}

function getAirportName(translations: AirportTranslation[], iata: string): string {
  const name = translations.find((t) => t.locale === 'en')?.name;
  return name ? `${iata} – ${name}` : iata;
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.set('dateTo', params.dateTo);
  if (params.search) queryParams.set('search', params.search);
  if (params.cursor) queryParams.set('cursor', params.cursor);
  queryParams.set('pageSize', '25');

  const response = await adminApiCall<BookingsData>(
    `/api/admin/bookings?${queryParams.toString()}`,
  );

  const data = response.success ? response.data : null;
  const bookings = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-white">Bookings</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} shown
          </p>
        </div>
        <Link
          href="/admin/bookings/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-black hover:bg-brand-gold-light transition-colors"
        >
          <span>+</span> New Booking
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="search"
          type="text"
          defaultValue={params.search ?? ''}
          placeholder="Search reference, email, name…"
          className="flex-1 min-w-48 px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white placeholder-gray-500 text-sm focus:border-brand-gold outline-none"
        />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="paid">Paid</option>
          <option value="pending_supplier_assignment">Pending Assignment</option>
          <option value="supplier_assigned">Supplier Assigned</option>
          <option value="pending_supplier_confirmation">Pending Confirmation</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
        <input
          name="dateFrom"
          type="date"
          defaultValue={params.dateFrom ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        />
        <input
          name="dateTo"
          type="date"
          defaultValue={params.dateTo ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm hover:border-brand-gold transition-colors"
        >
          Filter
        </button>
        {(params.status || params.search || params.dateFrom || params.dateTo) && (
          <Link
            href="/admin/bookings"
            className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-gray-400 text-sm hover:border-white/30 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
        {bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No bookings found.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Reference</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Airport / Service</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Pax</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-brand-gold font-bold">
                      {booking.reference}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-brand-white">
                      {booking.customer.fullName ?? '—'}
                    </div>
                    <div className="text-xs text-gray-500">{booking.customer.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-brand-white">
                      {getAirportName(
                        booking.airportService.airport.translations,
                        booking.airportService.airport.iataCode,
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getServiceName(booking.airportService.service.translations)}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {new Date(booking.serviceDateTime).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">{booking.passengerCount}</td>
                  <td className="px-5 py-3 text-sm text-brand-white font-medium">
                    {formatAmount(booking.totalMinor, booking.currency)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[booking.status] ?? ''}`}>
                      {booking.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="text-sm text-brand-gold hover:text-brand-gold-light transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2 text-sm">
        {nextCursor && (
          <Link
            href={`?${new URLSearchParams({
              ...(params.status ? { status: params.status } : {}),
              ...(params.search ? { search: params.search } : {}),
              ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
              ...(params.dateTo ? { dateTo: params.dateTo } : {}),
              cursor: nextCursor,
            })}`}
            className="px-3 py-1 bg-brand-navy border border-white/10 rounded hover:border-brand-gold transition-colors text-gray-400"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
