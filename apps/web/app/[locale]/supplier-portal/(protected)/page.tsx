import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const SUPPLIER_COOKIE = 'airportfaster_supplier_session';

interface DashboardStats {
  upcoming: number;
  today: number;
  pendingConfirmation: number;
}

async function getDashboardStats(token: string): Promise<DashboardStats> {
  try {
    const [upcomingRes, todayRes] = await Promise.all([
      fetch(`${API_URL}/api/supplier/bookings?filter=upcoming`, {
        headers: { Cookie: `${SUPPLIER_COOKIE}=${token}` },
        cache: 'no-store',
      }),
      fetch(`${API_URL}/api/supplier/bookings?filter=today`, {
        headers: { Cookie: `${SUPPLIER_COOKIE}=${token}` },
        cache: 'no-store',
      }),
    ]);

    const upcomingData = (await upcomingRes.json()) as {
      success: boolean;
      data?: { items: Array<{ booking: { status: string } }> };
    };
    const todayData = (await todayRes.json()) as {
      success: boolean;
      data?: { items: Array<{ booking: { status: string } }> };
    };

    const upcomingItems = upcomingData.success ? (upcomingData.data?.items ?? []) : [];
    const todayItems = todayData.success ? (todayData.data?.items ?? []) : [];

    return {
      upcoming: upcomingItems.length,
      today: todayItems.length,
      pendingConfirmation: upcomingItems.filter(
        (i) =>
          i.booking.status === 'pending_supplier_confirmation' ||
          i.booking.status === 'supplier_assigned',
      ).length,
    };
  } catch {
    return { upcoming: 0, today: 0, pendingConfirmation: 0 };
  }
}

export const metadata = {
  title: 'Dashboard | Supplier Portal',
};

export default async function SupplierDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore['get'](SUPPLIER_COOKIE)?.value ?? '';
  if (!token) {
    redirect('/supplier-portal/login');
  }
  const stats = await getDashboardStats(token);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">Overview of your assigned bookings</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Today's Bookings"
          value={stats.today}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          accent="gold"
        />
        <StatCard
          label="Upcoming Bookings"
          value={stats.upcoming}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          accent="blue"
        />
        <StatCard
          label="Pending Confirmation"
          value={stats.pendingConfirmation}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          accent="orange"
        />
      </div>

      {/* Quick actions */}
      <div className="bg-brand-navy border border-white/10 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/supplier-portal/bookings?filter=today"
            className="px-4 py-2.5 bg-brand-gold text-brand-black text-sm font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors"
          >
            View Today
          </Link>
          <Link
            href="/supplier-portal/bookings?filter=upcoming"
            className="px-4 py-2.5 bg-white/5 border border-white/10 text-brand-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors"
          >
            All Upcoming
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'gold' | 'blue' | 'orange';
}) {
  const accentClasses = {
    gold: 'text-brand-gold bg-brand-gold/10',
    blue: 'text-blue-400 bg-blue-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
  };

  return (
    <div className="bg-brand-navy border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${accentClasses[accent]}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-brand-white">{value}</p>
      <p className="mt-1 text-sm text-gray-400">{label}</p>
    </div>
  );
}
