import { Link } from '@/i18n/routing';
import { adminApiCall } from '@/lib/admin-api';
import { AirportForm } from '@/components/admin/airports/AirportForm';

export const metadata = { title: 'Add Airport' };

interface Service {
  id: string;
  slug: string;
  translations: Array<{ locale: string; name: string }>;
}

export default async function NewAirportPage() {
  const servicesResponse = await adminApiCall<{ services: Service[] }>('/api/admin/services');
  const services = servicesResponse.success ? servicesResponse.data.services : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/airports" className="text-gray-400 hover:text-brand-white text-sm transition-colors">
          Airports
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-brand-white">Add Airport</h1>
      </div>
      <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
        <AirportForm services={services} isNew={true} />
      </div>
    </div>
  );
}
