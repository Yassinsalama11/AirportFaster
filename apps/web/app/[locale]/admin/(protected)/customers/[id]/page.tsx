import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { adminApiCall } from '@/lib/admin-api';

interface AirportTranslation { locale: string; name: string; }
interface ServiceTranslation { locale: string; name: string; }

interface BookingAirportService {
  airport: {
    iataCode: string;
    translations: AirportTranslation[];
  };
  service: {
    slug: string;
    translations: ServiceTranslation[];
  };
}

interface CustomerBooking {
  id: string;
  reference: string;
  status: string;
  currency: string;
  totalMinor: number;
  serviceDateTime: string;
  createdAt: string;
  airportService: BookingAirportService;
}

interface Customer {
  id: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  fullName: string | null;
  locale: string | null;
  isVip: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  bookings: CustomerBooking[];
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  pending_payment: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-blue-500/20 text-blue-400',
  pending_supplier_assignment: 'bg-orange-500/20 text-orange-400',
  supplier_assigned: 'bg-indigo-500/20 text-indigo-400',
  pending_supplier_confirmation: 'bg-purple-500/20 text-purple-400',
  confirmed: 'bg-green-500/20 text-green-400',
  in_progress: 'bg-cyan-500/20 text-cyan-400',
  completed: 'bg-teal-500/20 text-teal-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-orange-500/20 text-orange-400',
  failed: 'bg-red-500/20 text-red-400',
};

function formatAmount(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

function getEnName(translations: Array<{ locale: string; name: string }>): string {
  return translations.find((t) => t.locale === 'en')?.name ?? '—';
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await adminApiCall<{ customer: Customer }>(`/api/admin/customers/${id}`);
  const name = response.success
    ? (response.data.customer.fullName ?? response.data.customer.email)
    : 'Customer';
  return { title: `Customer: ${name}` };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const response = await adminApiCall<{ customer: Customer }>(`/api/admin/customers/${id}`);

  if (!response.success) {
    notFound();
  }

  const customer = response.data.customer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="text-gray-400 hover:text-brand-white text-sm transition-colors">
          Customers
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-brand-white">
          {customer.fullName ?? customer.email}
        </h1>
        {customer.isVip && (
          <span className="text-xs bg-brand-gold/20 text-brand-gold border border-brand-gold/30 px-2 py-0.5 rounded font-medium">
            VIP
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Customer info */}
        <div className="col-span-1 space-y-4">
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5 space-y-3 text-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Contact</p>
            <div>
              <p className="text-gray-500 mb-0.5">Email</p>
              <p className="text-brand-white">{customer.email}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Phone</p>
              <p className="text-brand-white">{customer.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">WhatsApp</p>
              <p className="text-brand-white">{customer.whatsapp ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Locale</p>
              <p className="text-brand-white">{customer.locale ?? '—'}</p>
            </div>
          </div>

          <div className="bg-brand-navy border border-white/5 rounded-xl p-5 text-xs text-gray-500 space-y-1.5">
            <p>Joined: {new Date(customer.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(customer.updatedAt).toLocaleString()}</p>
            <p>Total Bookings: <span className="text-brand-white font-medium">{customer.bookings.length}</span></p>
          </div>

          {customer.notes && (
            <div className="bg-brand-navy border border-white/5 rounded-xl p-5 text-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Booking history */}
        <div className="col-span-2">
          <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <p className="text-sm font-semibold text-brand-white">Booking History</p>
            </div>
            {customer.bookings.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No bookings yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Reference</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Airport / Service</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-right px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customer.bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-brand-gold font-bold">{b.reference}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm text-brand-white">
                          <span className="font-mono text-brand-gold text-xs mr-1">
                            {b.airportService.airport.iataCode}
                          </span>
                          {getEnName(b.airportService.airport.translations)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getEnName(b.airportService.service.translations)}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">
                        {new Date(b.serviceDateTime).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[b.status] ?? ''}`}>
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-brand-white font-medium">
                        {formatAmount(b.totalMinor, b.currency)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="text-xs text-brand-gold hover:text-brand-gold-light transition-colors"
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
        </div>
      </div>
    </div>
  );
}
