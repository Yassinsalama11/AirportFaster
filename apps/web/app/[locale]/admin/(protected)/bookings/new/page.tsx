import { Link } from '@/i18n/routing';
import { adminApiCall } from '@/lib/admin-api';
import { ManualBookingForm } from '@/components/admin/bookings/ManualBookingForm';

interface AirportOption {
  id: string;
  iataCode: string;
  city: string;
  translations: Array<{ locale: string; name: string }>;
  airportServices: Array<{
    id: string;
    isActive: boolean;
    service: {
      id: string;
      slug: string;
      translations: Array<{ locale: string; name: string }>;
    };
  }>;
}

export const metadata = {
  title: 'New Booking — Admin',
};

export default async function NewBookingPage() {
  const airportsResponse = await adminApiCall<{ items: AirportOption[] }>(
    '/api/admin/airports?pageSize=100',
  );
  const airports = airportsResponse.success ? airportsResponse.data.items : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/bookings"
          className="text-gray-400 hover:text-brand-white text-sm transition-colors"
        >
          ← Bookings
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-brand-white">New Booking (manual)</h1>
      </div>

      <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
        <p className="text-sm text-gray-400 mb-6">
          Create a booking manually for customers who phone in or can't complete the online flow.
          The booking is created in <span className="text-brand-gold font-semibold">pending</span> status
          and tagged <code className="text-brand-gold">source: manual</code>.
        </p>
        <ManualBookingForm airports={airports} />
      </div>
    </div>
  );
}
