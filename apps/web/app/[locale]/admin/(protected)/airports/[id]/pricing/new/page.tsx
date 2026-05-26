import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { adminApiCall } from '@/lib/admin-api';
import { PricingRuleForm } from '@/components/admin/pricing/PricingRuleForm';

export const metadata = { title: 'New Pricing Rule' };

interface AirportService {
  id: string;
  serviceId: string;
  isActive: boolean;
  service?: {
    id: string;
    slug: string;
    translations: Array<{ locale: string; name: string }>;
  };
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface Airport {
  id: string;
  iataCode: string;
  translations: Array<{ locale: string; name: string }>;
  airportServices: AirportService[];
}

export default async function NewPricingRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [airportResponse, suppliersResponse] = await Promise.all([
    adminApiCall<{ airport: Airport }>(`/api/admin/airports/${id}`),
    adminApiCall<{ items: Supplier[]; total: number }>('/api/admin/suppliers'),
  ]);
  if (!airportResponse.success) notFound();
  const airport = airportResponse.data.airport;
  const suppliers = suppliersResponse.success ? (suppliersResponse.data.items ?? []) : [];

  const enName =
    airport.translations.find((t) => t.locale === 'en')?.name ?? airport.iataCode;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/airports"
          className="text-gray-400 hover:text-brand-white text-sm transition-colors"
        >
          Airports
        </Link>
        <span className="text-gray-600">/</span>
        <Link
          href={`/admin/airports/${id}`}
          className="text-gray-400 hover:text-brand-white text-sm transition-colors"
        >
          {enName}
        </Link>
        <span className="text-gray-600">/</span>
        <Link
          href={`/admin/airports/${id}/pricing`}
          className="text-gray-400 hover:text-brand-white text-sm transition-colors"
        >
          Pricing
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-brand-white">New Rule</h1>
      </div>

      <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
        <PricingRuleForm airportId={id} airportServices={airport.airportServices} suppliers={suppliers} />
      </div>
    </div>
  );
}
