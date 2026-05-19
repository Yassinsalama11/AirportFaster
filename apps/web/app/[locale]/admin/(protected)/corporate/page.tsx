import Link from 'next/link';
import { adminApiCall } from '@/lib/admin-api';

export const metadata = { title: 'Corporate Accounts' };

interface CorporateAccount {
  id: string;
  companyName: string;
  legalName: string | null;
  billingEmail: string | null;
  creditLimitMinor: number | null;
  currency: string;
  status: string;
  _count?: {
    members: number;
    bookings: number;
  };
}

interface CorporateData {
  items: CorporateAccount[];
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border border-green-500/30',
  suspended: 'bg-red-500/20 text-red-400 border border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

function formatCredit(minor: number | null, currency: string): string {
  if (minor === null) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export default async function CorporatePage() {
  const res = await adminApiCall<CorporateData>('/api/admin/corporate');
  const accounts = res.success ? (res.data.items ?? []) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-white">Corporate Accounts</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/corporate/new"
          className="px-4 py-2 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold-light transition-colors"
        >
          Create Corporate Account
        </Link>
      </div>

      {/* Table */}
      <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
        {accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No corporate accounts found.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Legal Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Members
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-brand-white">
                      {account.companyName}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {account.legalName ?? '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {account._count?.members ?? 0}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {account._count?.bookings ?? 0}
                  </td>
                  <td className="px-5 py-4 text-sm text-brand-white font-medium">
                    {formatCredit(account.creditLimitMinor, account.currency ?? 'EUR')}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[account.status] ?? 'bg-gray-500/20 text-gray-400'}`}
                    >
                      {account.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/corporate/${account.id}`}
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
    </div>
  );
}
