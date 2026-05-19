import Link from 'next/link';
import { adminApiCall } from '@/lib/admin-api';

export const metadata = { title: 'Suppliers' };

interface Contact {
  id: string;
  name: string;
  email: string | null;
  isPrimary: boolean;
}

interface Supplier {
  id: string;
  name: string;
  legalName: string | null;
  status: 'pending' | 'verified' | 'suspended';
  countryCode: string | null;
  payoutCurrency: string | null;
  createdAt: string;
  contacts: Contact[];
}

interface SuppliersData {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  verified: 'bg-green-500/20 text-green-400 border border-green-500/30',
  suspended: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.q) queryParams.set('q', params.q);
  if (params.page) queryParams.set('page', params.page);
  queryParams.set('pageSize', '25');

  const response = await adminApiCall<SuppliersData>(
    `/api/admin/suppliers?${queryParams.toString()}`,
  );

  const data = response.success ? response.data : null;
  const suppliers = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 25;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-white">Suppliers</h1>
          <p className="text-gray-400 mt-1 text-sm">{total} supplier{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          href="/admin/suppliers/new"
          className="px-4 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm"
        >
          Add Supplier
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3">
        <input
          name="q"
          type="text"
          defaultValue={params.q ?? ''}
          placeholder="Search by name…"
          className="flex-1 px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white placeholder-gray-500 text-sm focus:border-brand-gold outline-none"
        />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm hover:border-brand-gold transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No suppliers found.{' '}
            <Link href="/admin/suppliers/new" className="text-brand-gold hover:underline">
              Add one now.
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Country
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {suppliers.map((supplier) => {
                const primaryContact = supplier.contacts[0];
                return (
                  <tr key={supplier.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-brand-white font-medium text-sm">{supplier.name}</div>
                      {supplier.legalName && supplier.legalName !== supplier.name && (
                        <div className="text-gray-500 text-xs mt-0.5">{supplier.legalName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {supplier.countryCode ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {primaryContact ? (
                        <div>
                          <div className="text-brand-white text-xs">{primaryContact.name}</div>
                          {primaryContact.email && (
                            <div className="text-gray-500 text-xs">{primaryContact.email}</div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[supplier.status] ?? ''}`}
                      >
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(supplier.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/suppliers/${supplier.id}`}
                        className="text-sm text-brand-gold hover:text-brand-gold-light transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)}{' '}
            of {total}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...params, page: String(currentPage - 1) })}`}
                className="px-3 py-1 bg-brand-navy border border-white/10 rounded hover:border-brand-gold transition-colors"
              >
                Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...params, page: String(currentPage + 1) })}`}
                className="px-3 py-1 bg-brand-navy border border-white/10 rounded hover:border-brand-gold transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
