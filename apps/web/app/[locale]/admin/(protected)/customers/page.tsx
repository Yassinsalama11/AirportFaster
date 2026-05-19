import Link from 'next/link';
import { adminApiCall } from '@/lib/admin-api';

export const metadata = { title: 'Customers' };

interface Customer {
  id: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  locale: string | null;
  isVip: boolean;
  createdAt: string;
  _count: { bookings: number };
  lastBookingDate: string | null;
}

interface CustomersData {
  items: Customer[];
  nextCursor: string | null;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.cursor) queryParams.set('cursor', params.cursor);
  queryParams.set('pageSize', '25');

  const response = await adminApiCall<CustomersData>(
    `/api/admin/customers?${queryParams.toString()}`,
  );

  const data = response.success ? response.data : null;
  const customers = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-white">Customers</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {customers.length} customer{customers.length !== 1 ? 's' : ''} shown
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <input
          name="search"
          type="text"
          defaultValue={params.search ?? ''}
          placeholder="Search by email or name…"
          className="flex-1 px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white placeholder-gray-500 text-sm focus:border-brand-gold outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm hover:border-brand-gold transition-colors"
        >
          Search
        </button>
        {params.search && (
          <Link
            href="/admin/customers"
            className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-gray-400 text-sm hover:border-white/30 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No customers found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Bookings</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Booking</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-brand-white">{customer.email}</span>
                      {customer.isVip && (
                        <span className="text-xs bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded font-medium">VIP</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-300">{customer.fullName ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">{customer.phone ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-brand-white font-medium">{customer._count.bookings}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {customer.lastBookingDate
                      ? new Date(customer.lastBookingDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/customers/${customer.id}`}
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
      {nextCursor && (
        <div className="flex justify-end">
          <Link
            href={`?${new URLSearchParams({
              ...(params.search ? { search: params.search } : {}),
              cursor: nextCursor,
            })}`}
            className="px-3 py-1 bg-brand-navy border border-white/10 rounded hover:border-brand-gold transition-colors text-sm text-gray-400"
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
