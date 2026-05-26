import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { adminApiCall } from '@/lib/admin-api';

export const metadata = { title: 'Availability Rules' };

interface TimeWindow {
  open: string;
  close: string;
}

interface AvailabilityRule {
  id: string;
  airportServiceId: string;
  daysOfWeek: number[];
  timeWindows: TimeWindow[];
  cutOffMinutes: number;
  minNoticeMinutes: number;
  capacityPerSlot: number | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface BlackoutDate {
  id: string;
  scopeType: string;
  scopeId: string;
  dateFrom: string;
  dateTo: string;
  reason: string | null;
}

interface AirportService {
  id: string;
  service?: {
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border border-green-500/30',
  inactive: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

function getServiceName(airportServiceId: string, airportServices: AirportService[]): string {
  const as = airportServices.find((s) => s.id === airportServiceId);
  if (!as?.service) return airportServiceId.slice(0, 8) + '…';
  const t = as.service.translations.find((t) => t.locale === 'en');
  return t?.name ?? as.service.slug;
}

export default async function AvailabilityPage({
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
  const allRules: AvailabilityRule[] = [];
  for (const as of airport.airportServices) {
    const rulesResponse = await adminApiCall<{ rules: AvailabilityRule[] }>(
      `/api/admin/availability/rules?airportServiceId=${as.id}`,
    );
    if (rulesResponse.success) {
      allRules.push(...rulesResponse.data.rules);
    }
  }

  // Load blackout dates for this airport
  const blackoutsResponse = await adminApiCall<{ blackouts: BlackoutDate[] }>(
    `/api/admin/availability/blackouts?scopeType=airport&scopeId=${id}`,
  );
  const blackouts = blackoutsResponse.success ? blackoutsResponse.data.blackouts : [];

  const enName =
    airport.translations.find((t) => t.locale === 'en')?.name ?? airport.iataCode;

  return (
    <div className="space-y-8">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-brand-white">Availability</h1>
        </div>
        <Link
          href={`/admin/airports/${id}/availability/new`}
          className="px-4 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm"
        >
          Add Rule
        </Link>
      </div>

      {/* Availability Rules */}
      <section>
        <h2 className="text-lg font-semibold text-brand-white mb-3">Availability Rules</h2>
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {allRules.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No availability rules yet.{' '}
              <Link
                href={`/admin/airports/${id}/availability/new`}
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
                    Days
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Time Windows
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
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
                      {rule.daysOfWeek.sort().map((d) => DAY_NAMES[d]).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                      {rule.timeWindows.map((tw) => `${tw.open}–${tw.close}`).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {rule.capacityPerSlot ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[rule.status] ?? ''}`}
                      >
                        {rule.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Blackout Dates */}
      <section>
        <h2 className="text-lg font-semibold text-brand-white mb-3">Blackout Dates</h2>
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {blackouts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No blackout dates configured for this airport.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    From
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    To
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {blackouts.map((b) => (
                  <tr key={b.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 text-sm text-brand-white">
                      {new Date(b.dateFrom).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-white">
                      {new Date(b.dateTo).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {b.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
