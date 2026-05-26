import { Link } from '@/i18n/routing';
import { adminApiCall } from '@/lib/admin-api';
import { TrendingUp, ShoppingCart, MapPin, Sparkles } from 'lucide-react';

export const metadata = { title: 'Analytics' };

interface RevenuePoint { date: string; revenueMinorUnits: number; bookingCount: number; currency: string; }
interface AirportStat { iataCode: string; name: string; bookingCount: number; revenueMinorUnits: number; }
interface ServiceStat { serviceName: string; slug: string; bookingCount: number; revenueMinorUnits: number; conversionRate: number; }
interface StatusBreakdownItem { status: string; count: number; }
interface SupplierStat { supplierName: string; bookingCount: number; confirmationRate: number; completionRate: number; reliabilityScore: number; }

function formatEUR(minor: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await adminApiCall<T>(path);
    if (res.success && res.data) return res.data;
    return fallback;
  } catch {
    return fallback;
  }
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
  supplier_assigned: 'bg-indigo-500',
  pending_supplier_assignment: 'bg-purple-500',
  pending_supplier_confirmation: 'bg-fuchsia-500',
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? 'overview';

  const [revenueArr, airportsData, servicesArr, statusArr, suppliersArr] = await Promise.all([
    safeFetch<RevenuePoint[]>('/api/admin/analytics/revenue?period=30d&groupBy=day', []),
    safeFetch<{ airports: AirportStat[] }>('/api/admin/analytics/top-airports', { airports: [] }),
    safeFetch<ServiceStat[]>('/api/admin/analytics/services', []),
    safeFetch<{ breakdown: StatusBreakdownItem[] }>('/api/admin/analytics/status-breakdown', { breakdown: [] }),
    safeFetch<SupplierStat[]>('/api/admin/analytics/suppliers', []),
  ]);

  const revenuePoints = Array.isArray(revenueArr) ? revenueArr : [];
  const airports = airportsData?.airports ?? [];
  const services = Array.isArray(servicesArr) ? servicesArr : [];
  const breakdown = statusArr?.breakdown ?? [];
  const suppliers = Array.isArray(suppliersArr) ? suppliersArr : [];

  const totalRevenue = revenuePoints.reduce((sum, p) => sum + (p.revenueMinorUnits ?? 0), 0);
  const totalBookings = revenuePoints.reduce((sum, p) => sum + (p.bookingCount ?? 0), 0);
  const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
  const totalStatusCount = breakdown.reduce((sum, b) => sum + b.count, 0);
  const maxRevenue = revenuePoints.reduce((m, p) => Math.max(m, p.revenueMinorUnits ?? 0), 1);

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'airports', label: 'Airports' },
    { key: 'services', label: 'Services' },
    { key: 'suppliers', label: 'Suppliers' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-white">Analytics</h1>
        <p className="text-gray-400 mt-1 text-sm">Business intelligence — last 30 days</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/analytics?tab=${t.key}`}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-400 hover:text-brand-white'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Total Revenue"
              value={formatEUR(totalRevenue)}
              accent
            />
            <KpiCard
              icon={<ShoppingCart className="w-4 h-4" />}
              label="Bookings"
              value={totalBookings.toLocaleString()}
            />
            <KpiCard
              icon={<MapPin className="w-4 h-4" />}
              label="Top Airport"
              value={airports[0]?.iataCode ?? '—'}
              {...(airports[0]?.name ? { sub: airports[0].name } : {})}
            />
            <KpiCard
              icon={<Sparkles className="w-4 h-4" />}
              label="Top Service"
              value={services[0]?.serviceName ?? '—'}
              {...(services[0] ? { sub: `${services[0].bookingCount} bookings` } : {})}
            />
          </div>

          {totalStatusCount > 0 ? (
            <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-white mb-4">Booking Status Breakdown</h2>
              <div className="flex rounded-lg overflow-hidden h-6 mb-4">
                {breakdown.map((item) => {
                  const pct = (item.count / totalStatusCount) * 100;
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
                {breakdown.map((item) => {
                  const pct = ((item.count / totalStatusCount) * 100).toFixed(1);
                  return (
                    <div key={item.status} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOURS[item.status] ?? 'bg-gray-500'}`} />
                      <span className="text-xs text-gray-400 capitalize">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-600">({pct}% · {item.count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyCard title="No bookings yet" body="Booking status breakdown will appear here once you start receiving bookings." />
          )}

          {revenuePoints.length > 0 ? (
            <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-brand-white mb-4">Revenue Trend</h2>
              <div className="flex items-end gap-1 min-h-[160px]">
                {revenuePoints.map((p) => {
                  const heightPct = (p.revenueMinorUnits / maxRevenue) * 100;
                  return (
                    <div key={p.date} className="flex flex-col items-center flex-1 min-w-0 group relative">
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                        <div>{p.date}</div>
                        <div className="text-brand-gold">{formatEUR(p.revenueMinorUnits)}</div>
                        <div className="text-gray-400">{p.bookingCount} bookings</div>
                      </div>
                      <div
                        className="w-full bg-brand-gold/60 hover:bg-brand-gold rounded-t transition-colors"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{revenuePoints[0]?.date?.slice(5)}</span>
                {revenuePoints.length > 2 && (
                  <span>{revenuePoints[Math.floor(revenuePoints.length / 2)]?.date?.slice(5)}</span>
                )}
                <span>{revenuePoints[revenuePoints.length - 1]?.date?.slice(5)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5 text-sm">
                <Stat label="Total revenue" value={formatEUR(totalRevenue)} />
                <Stat label="Total bookings" value={totalBookings.toLocaleString()} />
                <Stat label="Avg booking value" value={formatEUR(avgBookingValue)} />
              </div>
            </div>
          ) : (
            <EmptyCard title="No revenue data" body="Daily revenue will appear here once bookings are completed." />
          )}
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-brand-white mb-4">Revenue by Day</h2>
          {revenuePoints.length === 0 ? (
            <p className="text-gray-500 text-sm">No revenue data for the period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Bookings</th>
                  <th className="text-right py-2">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {revenuePoints.map((p) => (
                  <tr key={p.date} className="hover:bg-white/[0.02]">
                    <td className="py-2 text-brand-white">{p.date}</td>
                    <td className="py-2 text-right text-brand-white">{p.bookingCount}</td>
                    <td className="py-2 text-right text-brand-gold font-medium">{formatEUR(p.revenueMinorUnits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Airports Tab */}
      {activeTab === 'airports' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {airports.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No airport data yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Airport</th>
                  <th className="text-right px-5 py-3">Bookings</th>
                  <th className="text-right px-5 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {airports.map((airport) => (
                  <tr key={airport.iataCode} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-brand-gold font-bold">{airport.iataCode}</div>
                      <div className="text-sm text-gray-400 mt-0.5">{airport.name}</div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-brand-white">{airport.bookingCount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right text-sm text-brand-gold font-medium">{formatEUR(airport.revenueMinorUnits)}</td>
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
            <div className="p-8 text-center text-gray-500 text-sm">No service data yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Service</th>
                  <th className="text-right px-5 py-3">Bookings</th>
                  <th className="text-right px-5 py-3">Revenue</th>
                  <th className="text-right px-5 py-3">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {services.map((svc) => (
                  <tr key={svc.slug} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div className="text-sm text-brand-white capitalize">{svc.serviceName ?? svc.slug}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-mono">{svc.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-brand-white">{svc.bookingCount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right text-sm text-brand-gold font-medium">{formatEUR(svc.revenueMinorUnits)}</td>
                    <td className="px-5 py-4 text-right text-sm text-gray-400">{svc.conversionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          {suppliers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No supplier activity yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Supplier</th>
                  <th className="text-right px-5 py-3">Bookings</th>
                  <th className="text-right px-5 py-3">Confirm rate</th>
                  <th className="text-right px-5 py-3">Completion</th>
                  <th className="text-right px-5 py-3">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {suppliers.map((s) => (
                  <tr key={s.supplierName} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-sm text-brand-white">{s.supplierName}</td>
                    <td className="px-5 py-4 text-right text-sm text-brand-white">{s.bookingCount}</td>
                    <td className="px-5 py-4 text-right text-sm text-gray-400">{s.confirmationRate.toFixed(1)}%</td>
                    <td className="px-5 py-4 text-right text-sm text-gray-400">{s.completionRate.toFixed(1)}%</td>
                    <td className="px-5 py-4 text-right text-sm text-brand-gold font-medium">{s.reliabilityScore.toFixed(0)}</td>
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

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
        <span className={accent ? 'text-brand-gold' : 'text-gray-500'}>{icon}</span>
        {label}
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-brand-gold' : 'text-brand-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1 truncate">{sub}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-base font-semibold text-brand-white">{value}</p>
    </div>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-brand-navy border border-white/5 rounded-xl p-8 text-center">
      <p className="text-sm font-medium text-brand-white">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{body}</p>
    </div>
  );
}
