import Link from 'next/link';
import { adminApiCall } from '@/lib/admin-api';

export const metadata = { title: 'Airports' };

interface AirportTranslation {
  locale: string;
  name: string;
}

interface Airport {
  id: string;
  iataCode: string;
  city: string;
  country: string;
  status: 'draft' | 'active' | 'inactive';
  createdAt: string;
  translations: AirportTranslation[];
}

interface AirportsData {
  items: Airport[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  active: 'bg-green-500/20 text-green-400 border border-green-500/30',
  inactive: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

function getEnglishName(translations: AirportTranslation[]): string {
  return (
    translations.find((t) => t.locale === 'en')?.name ??
    translations[0]?.name ??
    'Unnamed'
  );
}

export default async function AirportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set('status', params.status);
  if (params.q) queryParams.set('q', params.q);
  if (params.page) queryParams.set('page', params.page);
  queryParams.set('pageSize', '20');

  const response = await adminApiCall<AirportsData>(
    `/api/admin/airports?${queryParams.toString()}`,
  );

  const data = response.success ? response.data : null;
  const airports = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-white">Airports</h1>
          <p className="text-gray-400 mt-1 text-sm">{total} airports total</p>
        </div>
        <Link
          href="/admin/airports/new"
          className="px-4 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm"
        >
          Add Airport
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3">
        <input
          name="q"
          type="text"
          defaultValue={params.q ?? ''}
          placeholder="Search by name or IATA..."
          className="flex-1 px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white placeholder-gray-500 text-sm focus:border-brand-gold outline-none"
        />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="px-4 py-2 bg-brand-navy border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
        {airports.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No airports found. <Link href="/admin/airports/new" className="text-brand-gold hover:underline">Add one now.</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  City / Country
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
              {airports.map((airport) => (
                <tr key={airport.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold text-xs font-mono font-bold">
                        {airport.iataCode}
                      </span>
                      <span className="text-brand-white font-medium text-sm">
                        {getEnglishName(airport.translations)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {airport.city}, {airport.country}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[airport.status] ?? ''}`}>
                      {airport.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(airport.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/airports/${airport.id}`}
                      className="text-sm text-brand-gold hover:text-brand-gold-light transition-colors"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of {total}
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
