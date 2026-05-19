import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { getCustomerSession } from '@/lib/customer-session';
import { customerFetch } from '@/lib/customer-api';

export const metadata = { title: 'My Account | AirportFaster' };

interface BookingStats {
  items: { status: string; serviceDateTime: string }[];
}

export default async function AccountDashboardPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect('/account/login');
  }

  const bookingsRes = await customerFetch<BookingStats>('/api/public/customers/me/bookings');
  const bookings = bookingsRes.success ? (bookingsRes.data.items ?? []) : [];

  const now = new Date();
  const upcomingCount = bookings.filter(
    (b) => new Date(b.serviceDateTime) > now && b.status !== 'cancelled' && b.status !== 'refunded',
  ).length;

  const firstName = session.firstName ?? session.email.split('@')[0];

  return (
    <div className="min-h-screen bg-brand-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <BrandLogo href="/" className="mb-8" markClassName="h-10 w-[210px]" />
          <h1 className="text-3xl font-bold text-ink">
            Welcome back,{' '}
            <span className="text-brand-gold">{firstName}</span>
          </h1>
          <p className="text-ink-3 mt-2">Manage your airport service bookings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-brand-navy border border-line rounded-xl p-6">
            <p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2">
              Total Bookings
            </p>
            <p className="text-4xl font-bold text-ink">{bookings.length}</p>
            <p className="text-sm text-ink-3 mt-1">all time</p>
          </div>
          <div className="bg-brand-navy border border-line rounded-xl p-6">
            <p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2">
              Upcoming Bookings
            </p>
            <p className="text-4xl font-bold text-brand-gold">{upcomingCount}</p>
            <p className="text-sm text-ink-3 mt-1">scheduled ahead</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/account/bookings"
            className="group bg-brand-navy border border-line rounded-xl p-6 hover:border-brand-gold/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-brand-gold"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <svg
                className="w-4 h-4 text-ink-3 group-hover:text-brand-gold transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-ink font-semibold mb-1">My Bookings</h3>
            <p className="text-sm text-ink-3">View and manage your booking history</p>
          </Link>

          <Link
            href="/account/profile"
            className="group bg-brand-navy border border-line rounded-xl p-6 hover:border-brand-gold/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-brand-gold"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <svg
                className="w-4 h-4 text-ink-3 group-hover:text-brand-gold transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-ink font-semibold mb-1">My Profile</h3>
            <p className="text-sm text-ink-3">Update your personal details and preferences</p>
          </Link>
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-brand-gold hover:text-brand-gold text-sm font-medium transition-colors"
          >
            Search for airport services
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
