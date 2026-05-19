import { BrandLogo } from '@/components/brand/BrandLogo';
import { SuspenseBoundary } from '@/components/SuspenseBoundary';
import { SupplierLoginForm } from './SupplierLoginForm';

export const metadata = {
  title: 'Supplier Portal Login | AirportFaster',
};

export default function SupplierLoginPage() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/30 via-brand-black to-brand-black pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <BrandLogo href="/" className="justify-center" markClassName="h-12 w-[250px]" />
          <p className="mt-2 text-sm text-gray-500 tracking-widest uppercase">
            Supplier Portal
          </p>
        </div>

        <div className="bg-brand-navy border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-brand-white mb-1">Welcome</h2>
          <p className="text-sm text-gray-400 mb-8">
            Sign in with your email and portal PIN
          </p>

          <SuspenseBoundary fallback={null}>
            <SupplierLoginForm />
          </SuspenseBoundary>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          AirportFaster Supplier Portal - Restricted Access
        </p>
      </div>
    </div>
  );
}
