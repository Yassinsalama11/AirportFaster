'use client';

import { useRouter } from 'next/navigation';

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

interface Props {
  revenue: RevenueData | null;
  activePeriod: string;
}

const PERIODS = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
];

function formatGBP(minor: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function RevenueTab({ revenue, activePeriod }: Props) {
  const router = useRouter();

  function setPeriod(p: string) {
    router.push(`?tab=revenue&period=${p}`);
  }

  const points = revenue?.data ?? [];
  const maxRevenue = Math.max(...points.map((p) => p.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePeriod === p.key
                ? 'bg-brand-gold text-brand-black'
                : 'bg-brand-navy border border-white/10 text-gray-400 hover:text-brand-white hover:border-white/30'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {revenue && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Total Revenue
            </p>
            <p className="text-3xl font-bold text-brand-white">
              {formatGBP(revenue.totalRevenue)}
            </p>
          </div>
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Total Bookings
            </p>
            <p className="text-3xl font-bold text-brand-white">
              {revenue.totalBookings.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-brand-white mb-6">Revenue by Period</h2>
        {points.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No data available for this period.</p>
          </div>
        ) : (
          <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
            {points.map((point) => {
              const heightPct = (point.revenue / maxRevenue) * 100;
              const dateLabel = new Date(point.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              });

              return (
                <div
                  key={point.date}
                  className="flex flex-col items-center gap-1 flex-1 min-w-[2rem] group"
                >
                  <div className="w-full relative flex flex-col items-center" style={{ height: '120px' }}>
                    <div
                      className="w-full bg-brand-gold/60 group-hover:bg-brand-gold rounded-t transition-colors absolute bottom-0"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                      title={`${dateLabel}: ${formatGBP(point.revenue)} (${point.bookings} bookings)`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap rotate-45 origin-left ml-2">
                    {dateLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
