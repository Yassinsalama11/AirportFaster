import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupplierSession } from '@/lib/supplier-session';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SupplierLogoutButton } from '../SupplierLogoutButton';

export const metadata = {
  title: {
    default: 'Supplier Portal',
    template: '%s | AirportFaster Supplier Portal',
  },
};

export default async function SupplierPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSupplierSession();

  if (!session) {
    redirect('/supplier-portal/login');
  }

  return (
    <div className="min-h-screen bg-brand-black text-brand-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-navy border-r border-white/5 flex flex-col fixed inset-y-0 left-0 z-50">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/5">
          <BrandLogo href="/supplier-portal" markClassName="h-10 w-[180px]" />
          <span className="ml-2 text-xs text-gray-500 uppercase tracking-wider">Supplier</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/supplier-portal"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-brand-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>

          <Link
            href="/supplier-portal/bookings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-brand-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            My Bookings
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="px-3 py-2 mb-3">
            <p className="text-sm font-medium text-brand-white truncate">{session.supplierName}</p>
            <p className="text-xs text-gray-500 truncate">{session.email}</p>
          </div>
          <SupplierLogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
