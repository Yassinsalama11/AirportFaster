import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCustomerSession } from '@/lib/customer-session';
import { customerFetch } from '@/lib/customer-api';

export const metadata = { title: 'My Bookings | AirportFaster' };

interface BookingItem {
  id: string;
  reference: string;
  status: string;
  currency: string;
  totalMinor: number;
  serviceDateTime: string;
  manageToken?: string | null;
  airportService: {
    airport: {
      iataCode: string;
      translations: { locale: string; name: string }[];
    };
    service: {
      translations: { locale: string; name: string }[];
    };
  };
}

interface BookingsData {
  items: BookingItem[];
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-500/20 text-ink-3 border border-gray-500/30',
  pending_payment: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  paid: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  in_progress: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  completed: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
  refunded: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

function formatAmount(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

function getEnglishName(translations: { locale: string; name: string }[]): string {
  return translations.find((t) => t.locale === 'en')?.name ?? '—';
}

export default async function AccountBookingsPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect('/account/login');
  }

  const res = await customerFetch<BookingsData>('/api/public/customers/me/bookings');
  const bookings = res.success ? (res.data.items ?? []) : [];

  return (
    <div className="min-h-screen bg-brand-black">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/account" className="text-sm text-ink-3 hover:text-ink transition-colors mb-4 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            My Account
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-2">My Bookings</h1>
          <p className="text-ink-3 mt-1 text-sm">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {/* Table */}
        <div className="bg-brand-navy border border-line rounded-xl overflow-hidden">
          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-ink-3 text-sm mb-4">
                No bookings yet — search for airports to get started
              </p>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors"
              >
                Search airports
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-5 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider">
                      Airport
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-brand-gold font-bold">
                          {booking.reference}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-ink">
                        {getEnglishName(booking.airportService.service.translations)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-ink">
                          {booking.airportService.airport.iataCode}
                        </div>
                        <div className="text-xs text-ink-3">
                          {getEnglishName(booking.airportService.airport.translations)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-ink-3">
                        {new Date(booking.serviceDateTime).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[booking.status] ?? 'bg-gray-500/20 text-ink-3'}`}
                        >
                          {booking.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-ink font-medium">
                        {formatAmount(booking.totalMinor, booking.currency)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {booking.manageToken ? (
                          <Link
                            href={`/manage/${booking.manageToken}`}
                            className="text-sm text-brand-gold hover:text-brand-gold transition-colors"
                          >
                            Manage
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
