import Link from 'next/link';
import { adminApiCall } from '@/lib/admin-api';
import { TaxRatesClient } from './TaxRatesClient';

export const metadata = { title: 'Finance' };

interface TaxRate {
  id: string;
  countryCode: string;
  taxType: string;
  rate: number;
  serviceType: string | null;
  validFrom: string;
  status: string;
}

interface TaxRatesData {
  items: TaxRate[];
}


export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? 'tax-rates';

  let taxRates: TaxRate[] = [];

  if (activeTab === 'tax-rates') {
    const res = await adminApiCall<TaxRatesData>('/api/admin/tax-rates');
    taxRates = res.success ? (res.data.items ?? []) : [];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-white">Finance</h1>
        <p className="text-gray-400 mt-1 text-sm">Tax rates, settlements and payouts</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {[
          { key: 'tax-rates', label: 'Tax Rates' },
          { key: 'settlements', label: 'Settlements' },
          { key: 'payouts', label: 'Payouts' },
        ].map((t) => (
          <Link
            key={t.key}
            href={`?tab=${t.key}`}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-400 hover:text-brand-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'tax-rates' && (
        <TaxRatesClient initialRates={taxRates} />
      )}

      {activeTab === 'settlements' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">
            Settlement management coming soon — settlements are generated automatically.
          </p>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">Payout management coming soon.</p>
        </div>
      )}
    </div>
  );
}
