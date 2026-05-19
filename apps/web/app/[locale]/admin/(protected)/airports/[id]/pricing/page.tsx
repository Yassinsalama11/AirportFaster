import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminApiCall } from '@/lib/admin-api';

export const metadata = { title: 'Pricing Rules' };

interface PricingRule {
  id: string;
  airportServiceId: string;
  mode: 'fixed' | 'cost_plus_markup';
  basePriceMinor: number | null;
  supplierCostMinor: number | null;
  markupType: string | null;
  markupValue: string | null;
  currency: string;
  passengerPricing?: Record<string, number> | null;
  validFrom: string | null;
  validTo: string | null;
  priority: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

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

interface Airport {
  id: string;
  iataCode: string;
  translations: Array<{ locale: string; name: string }>;
  airportServices: AirportService[];
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border border-green-500/30',
  inactive: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

function getServiceName(
  airportServiceId: string,
  airportServices: AirportService[],
): string {
  const as = airportServices.find((s) => s.id === airportServiceId);
  if (!as?.service) return airportServiceId.slice(0, 8) + '…';
  const t = as.service.translations.find((t) => t.locale === 'en');
  return t?.name ?? as.service.slug;
}

function formatPrice(minor: number | null, _currency: string): string {
  if (minor == null) return '—';
  // Platform-wide: always show Euros regardless of per-record currency.
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const airportResponse = await adminApiCall<{ airport: Airport }>(
    `/api/admin/airports/${id}`,
  );
  if (!airportResponse.success) notFound();
  const airport = airportResponse.data.airport;

  // Load rules for each airportService
  const allRules: PricingRule[] = [];
  for (const as of airport.airportServices) {
    const rulesResponse = await adminApiCall<{ rules: PricingRule[] }>(
      `/api/admin/pricing/rules?airportServiceId=${as.id}`,
    );
    if (rulesResponse.success) {
      allRules.push(...rulesResponse.data.rules);
    }
  }

  const enName =
    airport.translations.find((t) => t.locale === 'en')?.name ?? airport.iataCode;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-center justify-between">
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
          <h1 className="text-2xl font-bold text-brand-white">Pricing Rules</h1>
        </div>
        <Link
          href={`/admin/airports/${id}/pricing/new`}
          className="px-4 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm"
        >
          Add Rule
        </Link>
      </div>

      {/* Rules Table */}
      <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
        {allRules.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No pricing rules yet.{' '}
            <Link
              href={`/admin/airports/${id}/pricing/new`}
              className="text-brand-gold hover:underline"
            >
              Add one now.
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Mode
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Currency
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Valid
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4 text-sm text-brand-white">
                    {getServiceName(rule.airportServiceId, airport.airportServices)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {rule.mode === 'fixed' ? 'Fixed' : 'Cost + Markup'}
                  </td>
                  <td className="px-6 py-4 text-sm text-brand-white font-mono">
                    {rule.mode === 'fixed' ? (
                      rule.passengerPricing && ('adult' in rule.passengerPricing || 'child' in rule.passengerPricing) ? (
                        <span className="space-x-1">
                          <span>Adult: {formatPrice(rule.passengerPricing['adult'] ?? rule.basePriceMinor, rule.currency)}</span>
                          {rule.passengerPricing['child'] != null && (
                            <span className="text-gray-400">
                              · Child: {rule.passengerPricing['child'] === 0 ? 'Free' : formatPrice(rule.passengerPricing['child'], rule.currency)}
                            </span>
                          )}
                          {rule.passengerPricing['infant'] != null && (
                            <span className="text-gray-400">
                              · Infant: {rule.passengerPricing['infant'] === 0 ? 'Free' : formatPrice(rule.passengerPricing['infant'], rule.currency)}
                            </span>
                          )}
                        </span>
                      ) : formatPrice(rule.basePriceMinor, rule.currency)
                    ) : `${formatPrice(rule.supplierCostMinor, rule.currency)} + ${
                        rule.markupValue ?? '—'
                      }${rule.markupType === 'percentage' ? '%' : ''}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">EUR</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{rule.priority}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[rule.status] ?? ''}`}
                    >
                      {rule.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {rule.validFrom
                      ? new Date(rule.validFrom).toLocaleDateString()
                      : 'Always'}
                    {rule.validTo
                      ? ` — ${new Date(rule.validTo).toLocaleDateString()}`
                      : ''}
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
