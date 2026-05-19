import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminApiCall } from '@/lib/admin-api';
import { AirportForm } from '@/components/admin/airports/AirportForm';

interface Service {
  id: string;
  slug: string;
  translations: Array<{ locale: string; name: string }>;
}

interface AirportTranslation {
  locale: string;
  name: string;
  description?: string;
}

interface AirportImage {
  url: string;
  altText?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

interface AirportServiceRow {
  id: string;
  serviceId: string;
  isActive: boolean;
  cutOffMinutes?: number | null;
  minNoticeMinutes?: number | null;
  service?: { id: string; slug: string; translations: Array<{ locale: string; name: string }> };
}

interface Airport {
  id: string;
  iataCode: string;
  icaoCode?: string;
  country: string;
  city: string;
  timezone: string;
  status: string;
  slug: string;
  translations: AirportTranslation[];
  images: AirportImage[];
  airportServices: AirportServiceRow[];
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    canonicalUrl?: string | null;
    ogImage?: string | null;
  } | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await adminApiCall<{ airport: Airport }>(`/api/admin/airports/${id}`);
  const name = response.success
    ? (response.data.airport.translations.find((t) => t.locale === 'en')?.name ?? 'Airport')
    : 'Airport';
  return { title: `Edit: ${name}` };
}

export default async function EditAirportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [airportResponse, servicesResponse] = await Promise.all([
    adminApiCall<{ airport: Airport }>(`/api/admin/airports/${id}`),
    adminApiCall<{ services: Service[] }>('/api/admin/services'),
  ]);

  if (!airportResponse.success) {
    notFound();
  }

  const airport = airportResponse.data.airport;
  const services = servicesResponse.success ? servicesResponse.data.services : [];

  const enName =
    airport.translations.find((t) => t.locale === 'en')?.name ?? airport.iataCode;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/airports" className="text-gray-400 hover:text-brand-white text-sm transition-colors">
          Airports
        </Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-2xl font-bold text-brand-white">{enName}</h1>
        <span className="inline-flex px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold text-xs font-mono font-bold">
          {airport.iataCode}
        </span>
      </div>
      <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
        <AirportForm airport={airport} services={services} isNew={false} />
      </div>
    </div>
  );
}
