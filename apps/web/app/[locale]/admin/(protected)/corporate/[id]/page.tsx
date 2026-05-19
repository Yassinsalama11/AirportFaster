import Link from 'next/link';
import { adminApiCall } from '@/lib/admin-api';
import { CorporateDetailClient } from './CorporateDetailClient';

export const metadata = { title: 'Corporate Account' };

interface Member {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface CorporateBooking {
  id: string;
  reference: string;
  status: string;
  currency: string;
  totalMinor: number;
  serviceDateTime: string;
}

interface CorporateDetail {
  id: string;
  companyName: string;
  legalName: string | null;
  vatNumber: string | null;
  billingEmail: string | null;
  creditLimitMinor: number | null;
  currency: string;
  paymentTermsDays: number | null;
  status: string;
  createdAt: string;
  members?: Member[];
  bookings?: CorporateBooking[];
}

export default async function CorporateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? 'overview';

  const res = await adminApiCall<{ corporate: CorporateDetail }>(`/api/admin/corporate/${id}`);

  if (!res.success) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/admin/corporate" className="text-sm text-gray-400 hover:text-brand-white transition-colors inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Corporate Accounts
          </Link>
        </div>
        <div className="bg-brand-navy border border-white/5 rounded-xl p-8 text-center">
          <p className="text-red-400 text-sm">Failed to load corporate account.</p>
        </div>
      </div>
    );
  }

  const corporate = res.data.corporate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/corporate"
            className="text-sm text-gray-400 hover:text-brand-white transition-colors mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Corporate Accounts
          </Link>
          <h1 className="text-2xl font-bold text-brand-white mt-1">{corporate.companyName}</h1>
          {corporate.legalName && (
            <p className="text-gray-400 mt-1 text-sm">{corporate.legalName}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {(['overview', 'members', 'bookings'] as const).map((t) => (
          <Link
            key={t}
            href={`?tab=${t}`}
            className={`px-5 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === t
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-400 hover:text-brand-white'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      <CorporateDetailClient corporate={corporate} activeTab={activeTab} />
    </div>
  );
}
