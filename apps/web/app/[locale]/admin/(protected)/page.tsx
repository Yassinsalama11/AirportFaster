import Link from 'next/link';
import { adminApiCall } from '@/lib/admin-api';
import { getSessionUser } from '@/lib/session';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.dashboard');
  return { title: t('subtitle') };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalBookingsToday: number;
  totalBookingsThisWeek: number;
  revenueToday: number;
  revenueThisWeek: number;
  pendingAssignment: number;
  openIncidents: number;
  currency: string;
}

interface AirportTranslation {
  locale: string;
  name: string;
}

interface ServiceTranslation {
  locale: string;
  name: string;
}

interface RecentBooking {
  id: string;
  reference: string;
  status: string;
  currency: string;
  totalMinor: number;
  createdAt: string;
  customer: {
    fullName: string | null;
    email: string;
  };
  airportService: {
    airport: {
      iataCode: string;
      translations: AirportTranslation[];
    };
    service: {
      translations: ServiceTranslation[];
    };
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  pending_payment: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-blue-500/20 text-blue-400',
  pending_supplier_assignment: 'bg-orange-500/20 text-orange-400',
  supplier_assigned: 'bg-indigo-500/20 text-indigo-400',
  pending_supplier_confirmation: 'bg-purple-500/20 text-purple-400',
  confirmed: 'bg-green-500/20 text-green-400',
  in_progress: 'bg-cyan-500/20 text-cyan-400',
  completed: 'bg-teal-500/20 text-teal-400',
  cancelled: 'bg-red-500/20 text-red-400',
  refunded: 'bg-orange-500/20 text-orange-400',
  failed: 'bg-red-500/20 text-red-400',
};

function getIntlLocale(locale: string): string {
  return locale === 'ar' ? 'ar-EG' : 'en-GB';
}

function formatCurrency(minor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function getLocalizedName(translations: Array<{ locale: string; name: string }>, locale: string): string {
  return translations.find((t) => t.locale === locale)?.name
    ?? translations.find((t) => t.locale === 'en')?.name
    ?? '—';
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, t, tStatus, user, statsResponse, recentResponse] = await Promise.all([
    params,
    getTranslations('admin.dashboard'),
    getTranslations('admin.status'),
    getSessionUser(),
    adminApiCall<DashboardStats>('/api/admin/dashboard/stats'),
    adminApiCall<{ items: RecentBooking[] }>('/api/admin/dashboard/recent-bookings'),
  ]);

  const stats: DashboardStats = statsResponse.success
    ? statsResponse.data
    : {
        totalBookingsToday: 0,
        totalBookingsThisWeek: 0,
        revenueToday: 0,
        revenueThisWeek: 0,
        pendingAssignment: 0,
        openIncidents: 0,
        currency: 'EUR',
      };

  const recentBookings = recentResponse.success ? recentResponse.data.items : [];

  const kpiCards = [
    {
      label: t('today_bookings'),
      value: stats.totalBookingsToday.toString(),
      sub: t('this_week', { count: stats.totalBookingsThisWeek }),
    },
    {
      label: t('week_revenue'),
      value: formatCurrency(stats.revenueThisWeek, stats.currency, locale),
      sub: t('today_revenue', { amount: formatCurrency(stats.revenueToday, stats.currency, locale) }),
    },
    {
      label: t('pending_assignment'),
      value: stats.pendingAssignment.toString(),
      sub: t('pending_assignment_sub'),
    },
    {
      label: t('open_incidents'),
      value: stats.openIncidents.toString(),
      sub: t('open_incidents_sub'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-semibold text-brand-white">
          {t('title', { name: user?.name ?? t('fallback_admin') })}
        </h1>
        <p className="mt-2 text-sm text-gray-400">{t('subtitle')}</p>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="apple-panel rounded-[24px] p-5 transition-colors hover:border-brand-gold/20"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">{card.label}</p>
            <p className="text-3xl font-bold text-brand-gold mb-1">{card.value}</p>
            <p className="text-xs text-gray-600">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {t('recent_bookings')}
          </h2>
          <Link
            href="/admin/bookings"
            className="text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
          >
            {t('view_all')}
          </Link>
        </div>

        <div className="apple-panel overflow-hidden rounded-[24px]">
          {recentBookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">{t('no_bookings')}</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-400">
                    {t('reference')}
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-400">
                    {t('customer')}
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-400">
                    {t('airport_service')}
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium uppercase tracking-wider text-gray-400">
                    {t('status')}
                  </th>
                  <th className="px-5 py-3 text-end text-xs font-medium uppercase tracking-wider text-gray-400">
                    {t('amount')}
                  </th>
                  <th className="px-5 py-3 text-end text-xs font-medium uppercase tracking-wider text-gray-400">
                    {t('time')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-white/2 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-mono text-xs text-brand-gold font-bold hover:text-brand-gold/80"
                      >
                        {booking.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-sm text-brand-white">{booking.customer.fullName ?? '—'}</div>
                      <div className="text-xs text-gray-500">{booking.customer.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-sm text-brand-white">
                        <span className="font-mono text-xs text-brand-gold mr-1">
                          {booking.airportService.airport.iataCode}
                        </span>
                        {getLocalizedName(booking.airportService.airport.translations, locale)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getLocalizedName(booking.airportService.service.translations, locale)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[booking.status] ?? 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {tStatus(booking.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-brand-white font-medium">
                      {formatCurrency(booking.totalMinor, booking.currency, locale)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-500">
                      {new Date(booking.createdAt).toLocaleString(getIntlLocale(locale), {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions strip */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          {t('quick_actions')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/suppliers/new"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-brand-white transition-colors hover:border-brand-gold/40 hover:text-brand-gold light:border-black/10 light:bg-white/80"
          >
            <span className="text-brand-gold">+</span>
            {t('new_supplier')}
          </Link>
          <Link
            href="/admin/airports"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-brand-white transition-colors hover:border-brand-gold/40 hover:text-brand-gold light:border-black/10 light:bg-white/80"
          >
            {t('search_airports')}
          </Link>
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-brand-white transition-colors hover:border-brand-gold/40 hover:text-brand-gold light:border-black/10 light:bg-white/80"
          >
            {t('view_all_bookings')}
          </Link>
        </div>
      </div>
    </div>
  );
}
