import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { adminApiCall } from '@/lib/admin-api';
import { BookingActionsPanel } from '@/components/admin/bookings/BookingActionsPanel';
import { AddNoteForm } from '@/components/admin/bookings/AddNoteForm';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  email: string;
  phone: string | null;
  fullName: string | null;
}

interface AirportTranslation { locale: string; name: string; }
interface ServiceTranslation { locale: string; name: string; }

interface AirportService {
  airport: {
    id: string;
    iataCode: string;
    translations: AirportTranslation[];
  };
  service: {
    id: string;
    slug: string;
    translations: ServiceTranslation[];
  };
}

interface Passenger {
  id: string;
  fullName: string;
  type: string;
  notes: string | null;
}

interface Flight {
  id: string;
  flightNumber: string;
  airlineCode: string | null;
  scheduledTime: string | null;
  terminal: string | null;
}

interface PriceSnapshot {
  basePriceMinor: number;
  supplierCostMinor: number;
  markupMinor: number;
  discountMinor: number;
  taxEstimateMinor: number;
  totalMinor: number;
  currency: string;
}

interface StatusHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

interface Note {
  id: string;
  body: string;
  visibility: string;
  authorUserId: string | null;
  createdAt: string;
}

interface SupplierAssignment {
  id: string;
  status: string;
  createdAt: string;
  supplier: {
    id: string;
    name: string;
    commissionPercent: number | string | null;
    payoutCurrency: string | null;
  };
}

interface Booking {
  id: string;
  reference: string;
  status: string;
  direction: string;
  currency: string;
  totalMinor: number;
  serviceDateTime: string;
  passengerCount: number;
  specialRequests: string | null;
  createdAt: string;
  airportServiceId: string;
  customer: Customer;
  airportService: AirportService;
  passengers: Passenger[];
  flights: Flight[];
  priceSnapshot: PriceSnapshot | null;
  statusHistory: StatusHistory[];
  notes: Note[];
  assignments: SupplierAssignment[];
}

interface Supplier {
  id: string;
  name: string;
  status: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  pending_payment: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  paid: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  pending_supplier_assignment: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  supplier_assigned: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  pending_supplier_confirmation: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  in_progress: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  completed: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
  refunded: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

const NOTE_BADGE: Record<string, string> = {
  internal: 'bg-gray-500/20 text-gray-400',
  customer: 'bg-blue-500/20 text-blue-400',
};

function formatAmount(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

function getEnName(translations: Array<{ locale: string; name: string }>): string {
  return translations.find((t) => t.locale === 'en')?.name ?? '—';
}

function parsePassengerNotes(notes: string | null): { passportNumber?: string; nationality?: string } {
  if (!notes) return {};
  try {
    return JSON.parse(notes) as { passportNumber?: string; nationality?: string };
  } catch {
    return {};
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await adminApiCall<{ booking: Booking }>(`/api/admin/bookings/${id}`);
  const ref = response.success ? response.data.booking.reference : 'Booking';
  return { title: `Booking: ${ref}` };
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bookingResponse, suppliersResponse] = await Promise.all([
    adminApiCall<{ booking: Booking }>(`/api/admin/bookings/${id}`),
    adminApiCall<{ items: Supplier[] }>('/api/admin/suppliers?pageSize=100'),
  ]);

  if (!bookingResponse.success) {
    notFound();
  }

  const booking = bookingResponse.data.booking;
  const allSuppliers = suppliersResponse.success ? suppliersResponse.data.items : [];

  // Filter suppliers to those that are verified (active)
  const availableSuppliers = allSuppliers.filter((s) => s.status === 'verified');

  const airport = booking.airportService.airport;
  const service = booking.airportService.service;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/bookings" className="text-gray-400 hover:text-brand-white text-sm transition-colors">
          Bookings
        </Link>
        <span className="text-gray-600">/</span>
        <span className="font-mono text-brand-gold font-bold">{booking.reference}</span>
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[booking.status] ?? ''}`}>
          {booking.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Main layout: content + sidebar */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: main content */}
        <div className="col-span-2 space-y-5">
          {/* Header card */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reference</p>
                <p className="text-2xl font-mono font-bold text-brand-white">{booking.reference}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total</p>
                <p className="text-2xl font-bold text-brand-gold">
                  {formatAmount(booking.totalMinor, booking.currency)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Created {new Date(booking.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Customer */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Customer</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-0.5">Name</p>
                <p className="text-brand-white">{booking.customer.fullName ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Email</p>
                <p className="text-brand-white">{booking.customer.email}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Phone</p>
                <p className="text-brand-white">{booking.customer.phone ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Service */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Service</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-0.5">Airport</p>
                <p className="text-brand-white">
                  <span className="font-mono text-brand-gold text-xs mr-1">{airport.iataCode}</span>
                  {getEnName(airport.translations)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Service</p>
                <p className="text-brand-white">{getEnName(service.translations)}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Date</p>
                <p className="text-brand-white">{new Date(booking.serviceDateTime).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Direction</p>
                <p className="text-brand-white capitalize">{booking.direction}</p>
              </div>
            </div>
            {booking.specialRequests && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-gray-500 text-xs mb-1">Special Requests</p>
                <p className="text-gray-300 text-sm">{booking.specialRequests}</p>
              </div>
            )}
          </div>

          {/* Passengers */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Passengers ({booking.passengerCount})
            </p>
            {booking.passengers.length === 0 ? (
              <p className="text-gray-500 text-sm">No passenger details.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-white/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase">Passport</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase">Nationality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {booking.passengers.map((p) => {
                      const extra = parsePassengerNotes(p.notes);
                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-2.5 text-brand-white">{p.fullName}</td>
                          <td className="px-4 py-2.5 text-gray-400 capitalize">{p.type}</td>
                          <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{extra.passportNumber ?? '—'}</td>
                          <td className="px-4 py-2.5 text-gray-400">{extra.nationality ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Flight */}
          {booking.flights.length > 0 && (
            <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Flight</p>
              {booking.flights.map((f) => (
                <div key={f.id} className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-0.5">Flight</p>
                    <p className="text-brand-white font-mono">{f.flightNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Airline</p>
                    <p className="text-brand-white">{f.airlineCode ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Scheduled</p>
                    <p className="text-brand-white">
                      {f.scheduledTime ? new Date(f.scheduledTime).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Terminal</p>
                    <p className="text-brand-white">{f.terminal ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Price Snapshot */}
          {booking.priceSnapshot && (
            <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Price Breakdown</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Base Price', value: booking.priceSnapshot.basePriceMinor },
                  { label: 'Markup', value: booking.priceSnapshot.markupMinor },
                  { label: 'Discount', value: -booking.priceSnapshot.discountMinor },
                  { label: 'Tax Estimate', value: booking.priceSnapshot.taxEstimateMinor },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-gray-400">
                    <span>{label}</span>
                    <span>{formatAmount(Math.abs(value), booking.priceSnapshot!.currency)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-brand-white pt-2 border-t border-white/5">
                  <span>Total</span>
                  <span className="text-brand-gold">
                    {formatAmount(booking.priceSnapshot.totalMinor, booking.priceSnapshot.currency)}
                  </span>
                </div>
                <p className="text-xs text-gray-600">Currency: {booking.priceSnapshot.currency}</p>
              </div>
            </div>
          )}

          {/* Commission & Payout */}
          {(() => {
            const assignment = booking.assignments?.[0];
            if (!assignment) return null;
            const commissionPct = Number(assignment.supplier.commissionPercent ?? 0);
            const grossMinor = booking.totalMinor;
            const commissionMinor = Math.round((grossMinor * commissionPct) / 100);
            const payoutMinor = grossMinor - commissionMinor;
            return (
              <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Commission & Payout</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Supplier</span>
                    <span className="text-brand-white">{assignment.supplier.name}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Gross</span>
                    <span className="text-brand-white">{formatAmount(grossMinor, booking.currency)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Platform Commission ({commissionPct.toFixed(1)}%)</span>
                    <span className="text-brand-gold">{formatAmount(commissionMinor, booking.currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-brand-white pt-2 border-t border-white/5">
                    <span>Supplier Payout</span>
                    <span>{formatAmount(payoutMinor, booking.currency)}</span>
                  </div>
                  {assignment.supplier.payoutCurrency && assignment.supplier.payoutCurrency !== booking.currency && (
                    <p className="text-xs text-gray-600">
                      Supplier payout currency: {assignment.supplier.payoutCurrency} (FX conversion applies)
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Status Timeline */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Status Timeline</p>
            {booking.statusHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No history.</p>
            ) : (
              <div className="relative space-y-0">
                {booking.statusHistory.map((entry, i) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-gold border-2 border-brand-gold/40 mt-1 flex-shrink-0" />
                      {i < booking.statusHistory.length - 1 && (
                        <div className="w-px flex-1 bg-white/10 my-1 min-h-4" />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[entry.toStatus] ?? ''}`}>
                          {entry.toStatus.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-600 capitalize">{entry.actorType}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleString()}
                        {entry.reason && ` · ${entry.reason}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Notes</p>
            {booking.notes.length > 0 ? (
              <div className="space-y-3 mb-5">
                {booking.notes.map((note) => (
                  <div key={note.id} className="bg-brand-black rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs ${NOTE_BADGE[note.visibility] ?? ''}`}>
                        {note.visibility}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-4">No notes yet.</p>
            )}
            <AddNoteForm bookingId={booking.id} />
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          <BookingActionsPanel
            bookingId={booking.id}
            status={booking.status}
            airportServiceId={booking.airportServiceId}
            availableSuppliers={availableSuppliers}
          />

          {/* Quick info */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5 text-xs text-gray-500 space-y-2">
            <p className="text-gray-400 font-medium text-sm mb-2">Booking Info</p>
            <div className="flex justify-between">
              <span>Direction</span>
              <span className="text-brand-white capitalize">{booking.direction}</span>
            </div>
            <div className="flex justify-between">
              <span>Passengers</span>
              <span className="text-brand-white">{booking.passengerCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Currency</span>
              <span className="text-brand-white font-mono">{booking.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
