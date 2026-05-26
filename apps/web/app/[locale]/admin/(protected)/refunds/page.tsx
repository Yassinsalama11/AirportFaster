import { Link } from '@/i18n/routing';
import { adminApiCall } from '@/lib/admin-api';
import { RefundInitiateButton } from '@/components/admin/refunds/RefundInitiateButton';
import { Undo2 } from 'lucide-react';

export const metadata = { title: 'Refunds' };

interface Customer { fullName: string | null; email: string; }
interface Booking { id: string; reference: string; totalMinor: number; currency: string; status: string; customer: Customer; }
interface Refund {
  id: string;
  type: string;
  status: string;
  amountMinorUnits: number;
  reason: string;
  createdAt: string;
  booking: Booking;
}

interface RefundEligibleBooking {
  id: string;
  reference: string;
  totalMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  customer: { fullName: string | null; email: string };
}

const STATUS_BADGE: Record<string, string> = {
  requested: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  admin_approved: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  finance_approved: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  processing: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

function formatAmount(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const { tab, status } = await searchParams;
  const activeTab = tab ?? 'eligible';

  let refunds: Refund[] = [];
  let eligibleBookings: RefundEligibleBooking[] = [];

  if (activeTab === 'history') {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await adminApiCall<{ items: Refund[]; nextCursor: string | null }>(
        `/api/admin/refunds${query}`,
      );
      refunds = res.success ? res.data.items : [];
    } catch {
      refunds = [];
    }
  } else {
    // Fetch refund-eligible bookings (paid / confirmed / completed)
    try {
      const res = await adminApiCall<{ bookings?: RefundEligibleBooking[]; items?: RefundEligibleBooking[] }>(
        '/api/admin/bookings?status=paid&pageSize=50',
      );
      if (res.success) {
        eligibleBookings = res.data.bookings ?? res.data.items ?? [];
      }
    } catch {
      eligibleBookings = [];
    }
  }

  const TABS = [
    { key: 'eligible', label: 'Refund-Eligible Bookings' },
    { key: 'history', label: 'Refund History' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-white flex items-center gap-2">
            <Undo2 className="w-6 h-6 text-brand-gold" />
            Refunds
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Process refunds and review refund history.</p>
        </div>
      </div>

      <div className="flex border-b border-white/5 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/refunds?tab=${t.key}`}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-400 hover:text-brand-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === 'eligible' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {eligibleBookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No refund-eligible bookings (status: paid).
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-brand-black/40">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {eligibleBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-mono text-xs text-brand-gold font-bold hover:underline"
                      >
                        {booking.reference}
                      </Link>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-sm text-brand-white">{booking.customer.fullName ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{booking.customer.email}</div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-brand-white">
                      {formatAmount(booking.totalMinor, booking.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-400 capitalize">{booking.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <RefundInitiateButton
                        bookingId={booking.id}
                        bookingReference={booking.reference}
                        totalMinor={booking.totalMinor}
                        currency={booking.currency}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {refunds.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No refunds yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-brand-black/40">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Booking
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/bookings/${refund.booking.id}`}
                        className="font-mono text-xs text-brand-gold font-bold hover:underline"
                      >
                        {refund.booking.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">
                      {refund.booking.customer.fullName ?? refund.booking.customer.email}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-brand-white">
                      {formatAmount(refund.amountMinorUnits, refund.booking.currency)}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 capitalize">{refund.type}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          STATUS_BADGE[refund.status] ?? ''
                        }`}
                      >
                        {refund.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(refund.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
