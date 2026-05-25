import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminApiCall } from '@/lib/admin-api';
import { SupplierForm } from '@/components/admin/suppliers/SupplierForm';
import { ContactsTab } from '@/components/admin/suppliers/ContactsTab';
import { CoverageTab } from '@/components/admin/suppliers/CoverageTab';
import { AirportsTab } from '@/components/admin/suppliers/AirportsTab';
import { ServicesTab } from '@/components/admin/suppliers/ServicesTab';
import { AvailabilityTab } from '@/components/admin/suppliers/AvailabilityTab';
import { SupplierStatusToggle } from '@/components/admin/suppliers/SupplierStatusToggle';

interface SupplierContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
}

interface SupplierAirport {
  id: string;
  airportId: string;
  status: string;
  airport?: {
    iataCode: string;
    city: string;
    translations: Array<{ locale: string; name: string }>;
  };
}

interface SupplierService {
  id: string;
  serviceId: string;
  status: string;
  service?: {
    slug: string;
    translations: Array<{ locale: string; name: string }>;
  };
}

interface Coverage {
  id: string;
  airportServiceId: string;
  priority: number;
  status: string;
  airportService?: {
    airport?: {
      iataCode: string;
      translations: Array<{ locale: string; name: string }>;
    };
    service?: {
      slug: string;
      translations: Array<{ locale: string; name: string }>;
    };
  };
}

interface SupplierDocument {
  id: string;
  type: string;
  filename: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string;
  legalName: string | null;
  status: 'pending' | 'verified' | 'suspended';
  countryCode: string | null;
  rating: number | null;
  reliabilityScore: number | null;
  payoutCurrency: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contacts: SupplierContact[];
  supplierAirports: SupplierAirport[];
  supplierServices: SupplierService[];
  coverages: Coverage[];
  documents: SupplierDocument[];
}

interface AirportOption {
  id: string;
  iataCode: string;
  city: string;
  airportServices: Array<{
    id: string;
    isActive: boolean;
    service?: {
      slug: string;
      translations: Array<{ locale: string; name: string }>;
    };
  }>;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  verified: 'bg-green-500/20 text-green-400 border border-green-500/30',
  suspended: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

const TABS = ['Overview', 'Contacts', 'Airports', 'Services', 'Coverage', 'Availability', 'Documents'] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await adminApiCall<{ supplier: Supplier }>(`/api/admin/suppliers/${id}`);
  const name = response.success ? response.data.supplier.name : 'Supplier';
  return { title: `Supplier: ${name}` };
}

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const activeTab: Tab = (TABS.find((t) => t.toLowerCase() === sp.tab?.toLowerCase()) ?? 'Overview') as Tab;

  const [supplierResponse, airportsResponse, servicesResponse] = await Promise.all([
    adminApiCall<{ supplier: Supplier }>(`/api/admin/suppliers/${id}`),
    adminApiCall<{ items: AirportOption[] }>('/api/admin/airports?pageSize=100'),
    adminApiCall<{ services: Array<{ id: string; slug: string; translations: Array<{ locale: string; name: string }> }> }>(
      '/api/admin/services',
    ),
  ]);

  if (!supplierResponse.success) {
    notFound();
  }

  const supplier = supplierResponse.data.supplier;
  const allAirports = airportsResponse.success ? airportsResponse.data.items : [];
  const allServices = servicesResponse.success
    ? servicesResponse.data.services.map((s) => {
        const enName = s.translations.find((t) => t.locale === 'en')?.name;
        return { id: s.id, name: enName ?? s.slug, slug: s.slug };
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/suppliers" className="text-gray-400 hover:text-brand-white text-sm transition-colors">
            Suppliers
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="text-2xl font-bold text-brand-white">{supplier.name}</h1>
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[supplier.status] ?? ''}`}>
            {supplier.status}
          </span>
        </div>
        <SupplierStatusToggle supplierId={supplier.id} currentStatus={supplier.status} />
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab}
              href={`?tab=${tab.toLowerCase()}`}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-brand-gold text-brand-gold'
                  : 'border-transparent text-gray-400 hover:text-brand-white'
              }`}
            >
              {tab}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Info cards */}
            <div className="col-span-2 space-y-4">
              <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Trading Name</p>
                    <p className="text-brand-white font-medium">{supplier.name}</p>
                  </div>
                  {supplier.legalName && (
                    <div>
                      <p className="text-gray-500 mb-1">Legal Name</p>
                      <p className="text-brand-white">{supplier.legalName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 mb-1">Country</p>
                    <p className="text-brand-white">{supplier.countryCode ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Payout Currency</p>
                    <p className="text-brand-white font-mono">{supplier.payoutCurrency ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Rating</p>
                    <p className="text-brand-white">{supplier.rating != null ? `${supplier.rating}/5.00` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Reliability Score</p>
                    <p className="text-brand-white">{supplier.reliabilityScore != null ? `${supplier.reliabilityScore}` : '—'}</p>
                  </div>
                </div>
                {supplier.notes && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-gray-500 text-sm mb-1">Notes</p>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{supplier.notes}</p>
                  </div>
                )}
              </div>

              {/* Edit Form */}
              <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Edit Supplier</h2>
                <SupplierForm supplier={supplier} isNew={false} />
              </div>
            </div>

            {/* Stats sidebar */}
            <div className="space-y-4">
              <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Quick Stats</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contacts</span>
                    <span className="text-brand-white font-medium">{supplier.contacts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Airports</span>
                    <span className="text-brand-white font-medium">{supplier.supplierAirports.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Services</span>
                    <span className="text-brand-white font-medium">{supplier.supplierServices.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Coverage</span>
                    <span className="text-brand-white font-medium">{supplier.coverages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Documents</span>
                    <span className="text-brand-white font-medium">{supplier.documents.length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-brand-navy border border-white/5 rounded-xl p-5 text-xs text-gray-500 space-y-1">
                <p>Created: {new Date(supplier.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(supplier.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Contacts' && (
          <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Contacts</h2>
            <ContactsTab supplierId={supplier.id} contacts={supplier.contacts} />
          </div>
        )}

        {activeTab === 'Airports' && (
          <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Linked Airports</h2>
            <AirportsTab
              supplierId={supplier.id}
              supplierAirports={supplier.supplierAirports}
              allAirports={allAirports}
            />
          </div>
        )}

        {activeTab === 'Services' && (
          <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Linked Services</h2>
            <ServicesTab
              supplierId={supplier.id}
              supplierServices={supplier.supplierServices}
              allServices={allServices}
            />
          </div>
        )}

        {activeTab === 'Coverage' && (
          <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Coverage</h2>
            <CoverageTab
              supplierId={supplier.id}
              coverages={supplier.coverages}
              availableAirports={allAirports}
            />
          </div>
        )}

        {activeTab === 'Availability' && (
          <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Weekly Availability</h2>
            <AvailabilityTab supplierId={supplier.id} />
          </div>
        )}

        {activeTab === 'Documents' && (
          <div className="bg-brand-navy border border-white/5 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Documents</h2>
            {supplier.documents.length === 0 ? (
              <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Filename</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Expires</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {supplier.documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3 text-sm text-brand-white capitalize">{doc.type}</td>
                        <td className="px-5 py-3 text-sm text-gray-400">{doc.filename ?? '—'}</td>
                        <td className="px-5 py-3 text-sm">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            doc.status === 'approved'
                              ? 'bg-green-500/20 text-green-400'
                              : doc.status === 'rejected'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-400">
                          {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-400">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
