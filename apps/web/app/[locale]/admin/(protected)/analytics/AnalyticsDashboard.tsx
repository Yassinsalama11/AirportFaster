'use client';

import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RevenueDataPoint {
  date: string;
  revenueMinorUnits: number;
  bookingCount: number;
  currency: string;
}

interface AirportData {
  airportName: string;
  iataCode: string;
  bookingCount: number;
  revenueMinorUnits: number;
}

interface ServiceData {
  serviceName: string;
  slug: string;
  bookingCount: number;
  revenueMinorUnits: number;
  conversionRate: number;
}

interface SupplierData {
  supplierName: string;
  bookingCount: number;
  confirmationRate: number;
  completionRate: number;
  reliabilityScore: number;
}

interface AnalyticsDashboardProps {
  initialRevenue: RevenueDataPoint[];
  airports: AirportData[];
  services: ServiceData[];
  suppliers: SupplierData[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(minorUnits: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function reliabilityBadge(score: number): { label: string; className: string } {
  if (score >= 90) return { label: 'Excellent', className: 'bg-green-500/20 text-green-400 border border-green-500/30' };
  if (score >= 75) return { label: 'Good', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
  if (score >= 60) return { label: 'Fair', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
  return { label: 'Poor', className: 'bg-red-500/20 text-red-400 border border-red-500/30' };
}

// ── Revenue Bar Chart (HTML div-based, no library) ────────────────────────────

function RevenueBarChart({ data }: { data: RevenueDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-8">
        No revenue data in this period.
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenueMinorUnits), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 min-w-0" style={{ minHeight: '160px' }}>
        {data.map((point) => {
          const heightPct = (point.revenueMinorUnits / maxRevenue) * 100;
          return (
            <div
              key={point.date}
              className="flex flex-col items-center flex-1 min-w-0 group relative"
              style={{ minWidth: '20px' }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                <div>{point.date}</div>
                <div className="text-brand-gold">{formatCurrency(point.revenueMinorUnits)}</div>
                <div className="text-gray-400">{point.bookingCount} bookings</div>
              </div>
              {/* Bar */}
              <div
                className="w-full bg-brand-gold/70 hover:bg-brand-gold rounded-t transition-colors"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      {/* Date labels — show first, middle, last */}
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>{data[0]?.date?.slice(5)}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date?.slice(5)}</span>}
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsDashboard({
  initialRevenue,
  airports,
  services,
  suppliers,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'revenue' | 'airports' | 'services' | 'suppliers'>(
    'revenue',
  );
  const [revenueData] = useState<RevenueDataPoint[]>(initialRevenue);
  const [airportSortKey, setAirportSortKey] = useState<'bookingCount' | 'revenueMinorUnits'>('revenueMinorUnits');

  const totalRevenue = revenueData.reduce((s, d) => s + d.revenueMinorUnits, 0);
  const totalBookings = revenueData.reduce((s, d) => s + d.bookingCount, 0);
  const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  const sortedAirports = [...airports].sort((a, b) => b[airportSortKey] - a[airportSortKey]);
  const topAirport = sortedAirports[0];

  const TABS = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'airports', label: 'Airports' },
    { key: 'services', label: 'Services' },
    { key: 'suppliers', label: 'Suppliers' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-white/5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-navy text-brand-gold border border-white/5 border-b-transparent -mb-px'
                : 'text-gray-400 hover:text-brand-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-brand-navy border border-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-brand-white mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-brand-navy border border-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Total Bookings</p>
              <p className="text-2xl font-bold text-brand-white mt-1">{totalBookings.toLocaleString()}</p>
            </div>
            <div className="bg-brand-navy border border-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Booking Value</p>
              <p className="text-2xl font-bold text-brand-white mt-1">{formatCurrency(avgBookingValue)}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              Revenue Trend (Last 30 Days)
            </h2>
            <RevenueBarChart data={revenueData} />
          </div>
        </div>
      )}

      {/* Airports Tab */}
      {activeTab === 'airports' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Airport</th>
                <th
                  className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-brand-white"
                  onClick={() => setAirportSortKey('bookingCount')}
                >
                  Bookings {airportSortKey === 'bookingCount' && '▼'}
                </th>
                <th
                  className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-brand-white"
                  onClick={() => setAirportSortKey('revenueMinorUnits')}
                >
                  Revenue {airportSortKey === 'revenueMinorUnits' && '▼'}
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedAirports.map((airport) => {
                const isTop = airport === topAirport;
                const avg = airport.bookingCount > 0 ? Math.round(airport.revenueMinorUnits / airport.bookingCount) : 0;
                return (
                  <tr
                    key={airport.iataCode}
                    className={`hover:bg-white/2 transition-colors ${isTop ? 'ring-1 ring-brand-gold/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isTop && (
                          <span className="text-brand-gold text-xs font-bold">TOP</span>
                        )}
                        <div>
                          <div className="text-sm font-medium text-brand-white">{airport.airportName}</div>
                          <div className="text-xs text-gray-500">{airport.iataCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-brand-white">{airport.bookingCount}</td>
                    <td className="px-6 py-4 text-right text-sm text-brand-white">{formatCurrency(airport.revenueMinorUnits)}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-400">{formatCurrency(avg)}</td>
                  </tr>
                );
              })}
              {sortedAirports.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No data for the last 30 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Service</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Bookings</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {services.map((svc) => (
                <tr key={svc.slug} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-brand-white">{svc.serviceName}</div>
                    <div className="text-xs text-gray-500">{svc.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-brand-white">{svc.bookingCount}</td>
                  <td className="px-6 py-4 text-right text-sm text-brand-white">{formatCurrency(svc.revenueMinorUnits)}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-400">{formatPct(svc.conversionRate)}</td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No service data for the last 30 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Supplier</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Bookings</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Confirmation Rate</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Completion Rate</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Reliability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {suppliers.map((supplier) => {
                const badge = reliabilityBadge(supplier.reliabilityScore);
                return (
                  <tr key={supplier.supplierName} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-brand-white">{supplier.supplierName}</td>
                    <td className="px-6 py-4 text-right text-sm text-brand-white">{supplier.bookingCount}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-400">{formatPct(supplier.confirmationRate)}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-400">{formatPct(supplier.completionRate)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No supplier activity in the last 30 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
