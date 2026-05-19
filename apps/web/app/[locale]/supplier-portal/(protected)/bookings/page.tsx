import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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

interface BookingItem {
  assignmentId: string;
  assignmentStatus: string;
  offeredAt: string;
  booking: {
    id: string;
    reference: string;
    status: BookingStatus;
    serviceDateTime: string;
    passengerCount: number;
    currency: string;
    totalMinor: number;
    airportService: {
      airport: {
        iataCode: string;
        translations: Array<{ locale: string; name: string }>;
      };
      service: {
        translations: Array<{ locale: string; name: string }>;
      };
    };
  };
}

async function getBookings(token: string, filter: string): Promise<BookingItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/supplier/bookings?filter=${filter}`, {
      headers: { Cookie: `${SUPPLIER_COOKIE}=${token}` },
      cache: 'no-store',
    });
    const data = (await res.json()) as {
      success: boolean;
      data?: { items: BookingItem[] };
    };
    return data.success ? (data.data?.items ?? []) : [];
  } catch {
    return [];
  }
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

export const metadata = {
  title: 'My Bookings | Supplier Portal',
};

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SupplierBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = params['filter'] ?? 'upcoming';

  const cookieStore = await cookies();
  const token = cookieStore['get'](SUPPLIER_COOKIE)?.value ?? '';
  if (!token) {
    redirect('/supplier-portal/login');
  }
  const bookings = await getBookings(token, filter);

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-white">My Bookings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage your assigned service bookings</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-brand-navy border border-white/10 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/supplier-portal/bookings?filter=${tab.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-brand-gold text-brand-black'
                : 'text-gray-400 hover:text-brand-white'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Bookings table */}
      {bookings.length === 0 ? (
        <div className="bg-brand-navy border border-white/10 rounded-xl p-12 text-center">
          <p className="text-gray-400">No bookings found for this filter.</p>
        </div>
      ) : (
        <div className="bg-brand-navy border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Airport
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date / Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Passengers
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map((item) => {
                const b = item.booking;
                const airportName =
                  b.airportService.airport.translations.find((t) => t.locale === 'en')?.name ??
                  b.airportService.airport.iataCode;
                const serviceName =
                  b.airportService.service.translations.find((t) => t.locale === 'en')?.name ??
                  '—';
                const serviceDate = new Date(b.serviceDateTime);
                const statusColor = STATUS_COLORS[b.status] ?? 'text-gray-400 bg-gray-400/10';
                const statusLabel = STATUS_LABELS[b.status] ?? b.status;

                return (
                  <tr key={item.assignmentId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-brand-gold">{b.reference}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-brand-white">{airportName}</p>
                        <p className="text-xs text-gray-500">{b.airportService.airport.iataCode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{serviceName}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-brand-white">
                        {serviceDate.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {serviceDate.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{b.passengerCount}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/supplier-portal/bookings/${b.id}`}
                        className="text-sm text-brand-gold hover:text-brand-gold/80 font-medium transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
