import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCustomerSession } from '@/lib/customer-session';
import { ProfileForm } from './ProfileForm';

export const metadata = { title: 'My Profile | AirportFaster' };

export default async function AccountProfilePage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect('/account/login');
  }

  return (
    <div className="min-h-screen bg-brand-black">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/account"
            className="text-sm text-ink-3 hover:text-ink transition-colors mb-4 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            My Account
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-2">My Profile</h1>
          <p className="text-ink-3 mt-1 text-sm">Update your personal details and preferences</p>
        </div>

        <div className="bg-brand-navy border border-line rounded-2xl p-8">
          <ProfileForm initialData={session} />
        </div>
      </div>
    </div>
  );
}
