import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SuspenseBoundary } from '@/components/SuspenseBoundary';
import { CustomerRegisterForm } from './CustomerRegisterForm';

export const metadata = {
  title: 'Create Account | AirportFaster',
};

export default function CustomerRegisterPage() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/20 via-brand-black to-brand-black pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <BrandLogo href="/" className="justify-center" markClassName="h-12 w-[250px]" />
          <p className="mt-2 text-sm text-ink-3">Premium Airport Services</p>
        </div>

        <div className="bg-brand-navy border border-line rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-ink mb-1">Create your account</h1>
          <p className="text-sm text-ink-3 mb-8">
            Save your preferences and track your bookings
          </p>

          <SuspenseBoundary fallback={null}>
            <CustomerRegisterForm />
          </SuspenseBoundary>

          <p className="mt-6 text-center text-sm text-ink-3">
            Already have an account?{' '}
            <Link
              href="/account/login"
              className="text-brand-gold hover:text-brand-gold/80 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
