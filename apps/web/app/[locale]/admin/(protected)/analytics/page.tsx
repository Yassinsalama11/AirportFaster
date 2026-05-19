import Link from 'next/link';
import { SuspenseBoundary } from '@/components/SuspenseBoundary';
import { adminApiCall } from '@/lib/admin-api';
import { RevenueTab } from './RevenueTab';

export const metadata = { title: 'Analytics' };

interface RevenuePoint {
  date: string;
  revenue: number;
  bookings: number;
}

interface RevenueData {
  period: string;
  totalRevenue: number;
  totalBookings: number;
  data: RevenuePoint[];
}

interface AirportStat {
  iataCode: string;
  name: string;
  bookings: number;
  revenue: number;
  avgBookingValue: number;
}

interface TopAirportsData {
  airports: AirportStat[];
}

interface ServiceStat {
  service: string;
  bookings: number;
  revenue: number;
  conversionRate: number;
}

interface ServicesData {
  services: ServiceStat[];
}

interface StatusBreakdownItem {
  status: string;
  count: number;
}

interface StatusBreakdownData {
  breakdown: StatusBreakdownItem[];
  total: number;
}

function formatGBP(minor: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

const STATUS_COLOURS: Record<string, string> = {
  confirmed: 'bg-green-500',
  completed: 'bg-teal-500',
  paid: 'bg-blue-500',
  pending_payment: 'bg-yellow-500',
  cancelled: 'bg-red-500',
  refunded: 'bg-orange-500',
  in_progress: 'bg-cyan-500',
  draft: 'bg-gray-500',
  failed: 'bg-red-700',
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string }>;
}) {
  const { tab, period } = await searchParams;
  const activeTab = tab ?? 'overview';
  const activePeriod = period ?? '30d';

  // Fetch based on active tab
  const [revenueRes, airportsRes, servicesRes, statusRes] = await Promise.all([
    activeTab === 'overview' || activeTab === 'revenue'
      ? adminApiCall<RevenueData>(`/api/admin/analytics/revenue?period=${activePeriod}`)
      : Promise.resolve(null),
    activeTab === 'overview' || activeTab === 'airports'
      ? adminApiCall<TopAirportsData>('/api/admin/analytics/top-airports')
      : Promise.resolve(null),
    activeTab === 'overview' || activeTab === 'services'
      ? adminApiCall<ServicesData>('/api/admin/analytics/services')
      : Promise.resolve(null),
    activeTab === 'overview'
      ? adminApiCall<StatusBreakdownData>('/api/admin/analytics/status-breakdown')
      : Promise.resolve(null),
  ]);

  const revenue = revenueRes?.success ? revenueRes.data : null;
  const airports = airportsRes?.success ? (airportsRes.data.airports ?? []) : [];
  const services = servicesRes?.success ? (servicesRes.data.services ?? []) : [];
  const statusBreakdown = statusRes?.success ? statusRes.data : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-white">Analytics</h1>
        <p className="text-gray-400 mt-1 text-sm">Business intelligence dashboard</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'revenue', label: 'Revenue' },
          { key: 'airports', label: 'Airports' },
          { key: 'services', label: 'Services' },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Total Revenue (30d)
              </p>
              <p className="text-2xl font-bold text-brand-white">
                {revenue ? formatGBP(revenue.totalRevenue) : '—'}
              </p>
            </div>
            <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Total Bookings (30d)
              </p>
              <p className="text-2xl font-bold text-brand-white">
                {revenue ? revenue.totalBookings.toLocaleString() : '—'}
              </p>
            </div>
            <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Top Airport
              </p>
              <p className="text-2xl font-bold text-brand-white">
                {airports[0]?.iataCode ?? '—'}
              </p>
              {airports[0] && (
                <p className="text-xs text-gray-500 mt-1 truncate">{airports[0].name}</p>
              )}
            </div>
            <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Top Service
              </p>
              <p className="text-2xl font-bold text-brand-white capitalize">
                {services[0]?.service.replace(/_/g, ' ') ?? '—'}
              </p>
            </div>
          </div>

          {/* Status Breakdown Bar */}
          {statusBreakdown && statusBreakdown.total > 0 && (
            <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-white mb-4">Booking Status Breakdown</h2>
              <div className="flex rounded-lg overflow-hidden h-6 mb-4">
                {statusBreakdown.breakdown.map((item) => {
                  const pct = (item.count / statusBreakdown.total) * 100;
                  return (
                    <div
                      key={item.status}
                      style={{ width: `${pct}%` }}
                      className={`${STATUS_COLOURS[item.status] ?? 'bg-gray-500'} transition-all`}
                      title={`${item.status}: ${item.count}`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3">
                {statusBreakdown.breakdown.map((item) => {
                  const pct = ((item.count / statusBreakdown.total) * 100).toFixed(1);
                  return (
                    <div key={item.status} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOURS[item.status] ?? 'bg-gray-500'}`} />
                      <span className="text-xs text-gray-400 capitalize">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-600">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <SuspenseBoundary fallback={null}>
          <RevenueTab revenue={revenue} activePeriod={activePeriod} />
        </SuspenseBoundary>
      )}

      {/* Airports Tab */}
      {activeTab === 'airports' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {airports.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No airport data available.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Airport
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Avg Booking Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {airports.map((airport) => (
                  <tr key={airport.iataCode} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-brand-gold font-bold">
                        {airport.iataCode}
                      </div>
                      <div className="text-sm text-gray-400 mt-0.5">{airport.name}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-brand-white font-medium">
                      {airport.bookings.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-brand-white font-medium">
                      {formatGBP(airport.revenue)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {formatGBP(airport.avgBookingValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {services.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No service data available.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {services.map((svc) => (
                  <tr key={svc.service} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-sm text-brand-white font-medium capitalize">
                      {svc.service.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-4 text-sm text-brand-white">
                      {svc.bookings.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-brand-white font-medium">
                      {formatGBP(svc.revenue)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {svc.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
