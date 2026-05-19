'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Search, Edit2, AlertTriangle, MessageSquare, MapPin, Calendar, User, X, CheckCircle2, ArrowLeft } from 'lucide-react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Passenger { id: string; fullName: string; type: string; }
interface AirportTr { locale: string; name: string; }
interface ServiceTr { locale: string; name: string; }
interface PriceSnapshot { totalMinor: number; currency: string; }

interface Booking {
  id: string;
  reference: string;
  status: string;
  serviceDateTime: string;
  customer: { fullName: string | null; email: string; phone: string | null };
  airportService: {
    airport: { iataCode: string; city: string; country: string; translations: AirportTr[] };
    service: { slug: string; translations: ServiceTr[] };
  };
  passengers: Passenger[];
  priceSnapshot: PriceSnapshot | null;
  supplier?: { id: string; name: string } | null;
}

type Tab = 'overview' | 'edit' | 'cancel' | 'complaint';

export interface ManageLabels {
  // Lookup screen
  title: string;
  subtitle: string;
  refLabel: string;
  refPlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  lookupBtn: string;
  lookupLoading: string;
  needHelp: string;
  // Tabs
  tabOverview: string;
  tabEdit: string;
  tabCancel: string;
  tabComplaint: string;
  // Overview labels
  airport: string;
  service: string;
  whenLabel: string;
  paid: string;
  supplier: string;
  passengersTitle: string;
  contactTitle: string;
  nameLabel: string;
  phoneLabel: string;
  // Edit
  editTitle: string;
  editDateLabel: string;
  editPaxTitle: string;
  editSaveBtn: string;
  editSavingBtn: string;
  editSavedMsg: string;
  // Cancel
  cancelTitle: string;
  cancelBody: string;
  cancelReasonLabel: string;
  cancelReasonPlaceholder: string;
  cancelConfirmBtn: string;
  cancelLoadingBtn: string;
  cancelWithin24: string;
  cancelSuccess: string;
  // Complaint
  complaintTitle: string;
  complaintBody: string;
  complaintCategoryLabel: string;
  complaintCategoryServiceQuality: string;
  complaintCategoryNoShow: string;
  complaintCategoryWrongTerminal: string;
  complaintCategoryCommunication: string;
  complaintCategoryOther: string;
  complaintMessageLabel: string;
  complaintMessagePlaceholder: string;
  complaintSubmitBtn: string;
  complaintLoadingBtn: string;
  complaintSuccess: string;
  // Errors / generic
  errorGeneric: string;
  backToBooking: string;
  startOver: string;
}

export function ManageBookingClient({ labels }: { labels: ManageLabels }) {
  const locale = useLocale();
  const [phase, setPhase] = useState<'lookup' | 'manage'>('lookup');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [token, setToken] = useState<string>('');
  const [tab, setTab] = useState<Tab>('overview');

  if (phase === 'lookup') {
    return (
      <LookupForm
        labels={labels}
        onSuccess={(b, t) => {
          setBooking(b);
          setToken(t);
          setPhase('manage');
          setTab('overview');
        }}
      />
    );
  }

  if (!booking) return null;

  const airport = booking.airportService.airport;
  const service = booking.airportService.service;
  const airportName =
    airport.translations.find((t) => t.locale === locale)?.name ??
    airport.translations.find((t) => t.locale === 'en')?.name ??
    airport.city;
  const serviceName =
    service.translations.find((t) => t.locale === locale)?.name ??
    service.translations.find((t) => t.locale === 'en')?.name ??
    service.slug;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => { setPhase('lookup'); setBooking(null); setToken(''); }}
            className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink mb-3"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {labels.startOver}
          </button>
          <h1 className="text-3xl font-bold text-ink">
            <span className="font-mono text-brand-gold-dark">{booking.reference}</span>
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            {airportName} ({airport.iataCode}) · {serviceName}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Tabs */}
      <div className="bg-surface border border-line rounded-2xl shadow-card overflow-hidden">
        <div className="border-b border-line flex">
          {(
            [
              ['overview', labels.tabOverview, MapPin],
              ['edit', labels.tabEdit, Edit2],
              ['cancel', labels.tabCancel, AlertTriangle],
              ['complaint', labels.tabComplaint, MessageSquare],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-brand-gold text-brand-gold-dark bg-brand-gold/5'
                  : 'border-transparent text-ink-3 hover:text-ink hover:bg-surface-2'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'overview' && (
            <OverviewTab booking={booking} labels={labels} airportName={airportName} serviceName={serviceName} />
          )}
          {tab === 'edit' && (
            <EditTab
              booking={booking}
              token={token}
              labels={labels}
              onUpdated={(b) => setBooking(b)}
            />
          )}
          {tab === 'cancel' && (
            <CancelTab
              booking={booking}
              token={token}
              labels={labels}
              onCancelled={(b) => setBooking(b)}
            />
          )}
          {tab === 'complaint' && (
            <ComplaintTab
              bookingId={booking.id}
              token={token}
              labels={labels}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lookup ────────────────────────────────────────────────────────────────────

function LookupForm({
  labels,
  onSuccess,
}: {
  labels: ManageLabels;
  onSuccess: (b: Booking, token: string) => void;
}) {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/bookings/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: reference.trim().toUpperCase(), email: email.trim() }),
      });
      const data = (await res.json()) as {
        success: boolean;
        data?: { booking: Booking; manageToken: string };
        error?: { message?: string };
      };
      if (!res.ok || !data.success || !data.data) {
        setError(data.error?.message ?? labels.errorGeneric);
        return;
      }
      onSuccess(data.data.booking, data.data.manageToken);
    } catch {
      setError(labels.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-gold/15 text-brand-gold-dark mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-ink">{labels.title}</h1>
          <p className="text-ink-3 mt-2 text-sm">{labels.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-2xl shadow-card p-6 space-y-4">
          <div>
            <label htmlFor="ref" className="block text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
              {labels.refLabel}
            </label>
            <input
              id="ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder={labels.refPlaceholder}
              required
              dir="ltr"
              className="w-full px-4 py-3 rounded-xl border border-line bg-bg text-ink font-mono outline-none focus:border-brand-gold transition-colors"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
              {labels.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.emailPlaceholder}
              required
              dir="ltr"
              className="w-full px-4 py-3 rounded-xl border border-line bg-bg text-ink outline-none focus:border-brand-gold transition-colors"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? labels.lookupLoading : labels.lookupBtn}
          </button>
          <p className="text-center text-xs text-ink-3 pt-2">{labels.needHelp}</p>
        </form>
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const COLORS: Record<string, string> = {
    paid: 'bg-blue-100 text-blue-800 border-blue-200',
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    supplier_assigned: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    in_progress: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    completed: 'bg-teal-100 text-teal-800 border-teal-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    refunded: 'bg-orange-100 text-orange-800 border-orange-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  const cls = COLORS[status] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({
  booking, labels, airportName, serviceName,
}: {
  booking: Booking;
  labels: ManageLabels;
  airportName: string;
  serviceName: string;
}) {
  const dt = new Date(booking.serviceDateTime);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCell label={labels.airport} value={`${airportName} (${booking.airportService.airport.iataCode})`} />
        <InfoCell label={labels.service} value={serviceName} />
        <InfoCell
          label={labels.whenLabel}
          value={dt.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        />
        {booking.priceSnapshot && (
          <InfoCell label={labels.paid} value={`€${(booking.priceSnapshot.totalMinor / 100).toFixed(2)}`} />
        )}
        {booking.supplier && <InfoCell label={labels.supplier} value={booking.supplier.name} />}
      </div>

      {booking.passengers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3">{labels.passengersTitle}</h3>
          <div className="border border-line rounded-xl overflow-hidden">
            {booking.passengers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="inline-flex w-8 h-8 rounded-full bg-brand-gold/15 text-brand-gold-dark items-center justify-center">
                  <User className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-medium truncate">{p.fullName}</p>
                  <p className="text-xs text-ink-3 capitalize">{p.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3">{labels.contactTitle}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoCell label={labels.nameLabel} value={booking.customer.fullName ?? '—'} />
          <InfoCell label={labels.emailLabel} value={booking.customer.email} />
          <InfoCell label={labels.phoneLabel} value={booking.customer.phone ?? '—'} />
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2 rounded-xl p-3.5 border border-line/60">
      <p className="text-xs text-ink-3 mb-0.5">{label}</p>
      <p className="text-sm text-ink font-medium break-words">{value}</p>
    </div>
  );
}

// ── Edit ──────────────────────────────────────────────────────────────────────

function EditTab({
  booking, token, labels, onUpdated,
}: {
  booking: Booking;
  token: string;
  labels: ManageLabels;
  onUpdated: (b: Booking) => void;
}) {
  const initialDate = new Date(booking.serviceDateTime).toISOString().slice(0, 16);
  const [date, setDate] = useState(initialDate);
  const [passengers, setPassengers] = useState(booking.passengers.map((p) => ({ id: p.id, fullName: p.fullName })));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoursUntil = (new Date(booking.serviceDateTime).getTime() - Date.now()) / (1000 * 60 * 60);
  const within24 = hoursUntil > 0 && hoursUntil < 24;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setSuccess(false); setSaving(true);
    try {
      const body: Record<string, unknown> = {
        token,
        bookingId: booking.id,
      };
      const newDate = new Date(date);
      if (newDate.getTime() !== new Date(booking.serviceDateTime).getTime()) {
        body['serviceDateTime'] = newDate.toISOString();
      }
      const changedPax = passengers.filter((p, i) => p.fullName !== booking.passengers[i]?.fullName);
      if (changedPax.length > 0) body['passengers'] = changedPax;

      const res = await fetch(`${API_BASE}/api/public/bookings/manage/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success: boolean; error?: { message?: string } };
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? labels.errorGeneric);
        return;
      }
      setSuccess(true);
      onUpdated({
        ...booking,
        serviceDateTime: newDate.toISOString(),
        passengers: booking.passengers.map((p) => {
          const updated = changedPax.find((c) => c.id === p.id);
          return updated ? { ...p, fullName: updated.fullName } : p;
        }),
      });
    } catch {
      setError(labels.errorGeneric);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink">{labels.editTitle}</h3>
        {within24 && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{labels.cancelWithin24}</span>
          </div>
        )}
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
          <Calendar className="w-3.5 h-3.5" /> {labels.editDateLabel}
        </label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          dir="ltr"
          disabled={within24}
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-line bg-bg text-ink outline-none focus:border-brand-gold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3">{labels.editPaxTitle}</h4>
        <div className="space-y-2">
          {passengers.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="w-7 text-center text-xs text-ink-3" dir="ltr">{idx + 1}</span>
              <input
                type="text"
                value={p.fullName}
                onChange={(e) => {
                  const next = [...passengers];
                  next[idx] = { ...next[idx]!, fullName: e.target.value };
                  setPassengers(next);
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-line bg-bg text-ink outline-none focus:border-brand-gold transition-colors"
              />
              <span className="text-xs text-ink-3 capitalize">{booking.passengers[idx]?.type}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {labels.editSavedMsg}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {saving ? labels.editSavingBtn : labels.editSaveBtn}
        </button>
      </div>
    </form>
  );
}

// ── Cancel ────────────────────────────────────────────────────────────────────

function CancelTab({
  booking, token, labels, onCancelled,
}: {
  booking: Booking;
  token: string;
  labels: ManageLabels;
  onCancelled: (b: Booking) => void;
}) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoursUntil = (new Date(booking.serviceDateTime).getTime() - Date.now()) / (1000 * 60 * 60);
  const within24 = hoursUntil > 0 && hoursUntil < 24;
  const alreadyCancelled = ['cancelled', 'refunded', 'completed', 'failed'].includes(booking.status);

  async function handleCancel() {
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/bookings/manage/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, bookingId: booking.id, reason: reason.trim() || undefined }),
      });
      const data = (await res.json()) as { success: boolean; error?: { code?: string; message?: string } };
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? labels.errorGeneric);
        return;
      }
      setDone(true);
      onCancelled({ ...booking, status: 'cancelled' });
    } catch {
      setError(labels.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-green-900">{labels.cancelSuccess}</h3>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyCancelled) {
    return (
      <p className="text-sm text-ink-3">
        {labels.cancelTitle} — {booking.status.replace(/_/g, ' ')}.
      </p>
    );
  }

  if (within24) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-amber-900 mb-1">{labels.cancelTitle}</h3>
            <p className="text-sm text-amber-800">{labels.cancelWithin24}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-ink mb-1">{labels.cancelTitle}</h3>
        <p className="text-sm text-ink-2">{labels.cancelBody}</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
          {labels.cancelReasonLabel}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={labels.cancelReasonPlaceholder}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-line bg-bg text-ink outline-none focus:border-brand-gold transition-colors resize-none"
        />
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm"
        >
          <X className="w-4 h-4" />
          {labels.cancelConfirmBtn}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60 text-sm"
          >
            {loading ? labels.cancelLoadingBtn : labels.cancelConfirmBtn}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="px-4 py-2.5 border border-line text-ink-2 rounded-xl hover:bg-surface-2 transition-colors text-sm"
          >
            {labels.backToBooking}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Complaint ─────────────────────────────────────────────────────────────────

function ComplaintTab({
  bookingId, token, labels,
}: {
  bookingId: string;
  token: string;
  labels: ManageLabels;
}) {
  const [category, setCategory] = useState<
    'service_complaint' | 'supplier_no_show' | 'wrong_terminal' | 'communication_failure' | 'other'
  >('service_complaint');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/bookings/manage/complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, bookingId, category, message: message.trim() }),
      });
      const data = (await res.json()) as { success: boolean; error?: { message?: string } };
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? labels.errorGeneric);
        return;
      }
      setDone(true);
    } catch {
      setError(labels.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-green-900">{labels.complaintSuccess}</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-ink mb-1">{labels.complaintTitle}</h3>
        <p className="text-sm text-ink-2">{labels.complaintBody}</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
          {labels.complaintCategoryLabel}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-line bg-bg text-ink outline-none focus:border-brand-gold transition-colors"
        >
          <option value="service_complaint">{labels.complaintCategoryServiceQuality}</option>
          <option value="supplier_no_show">{labels.complaintCategoryNoShow}</option>
          <option value="wrong_terminal">{labels.complaintCategoryWrongTerminal}</option>
          <option value="communication_failure">{labels.complaintCategoryCommunication}</option>
          <option value="other">{labels.complaintCategoryOther}</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
          {labels.complaintMessageLabel}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={labels.complaintMessagePlaceholder}
          rows={5}
          minLength={10}
          required
          className="w-full px-4 py-2.5 rounded-xl border border-line bg-bg text-ink outline-none focus:border-brand-gold transition-colors resize-none"
        />
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div>
        <button
          type="submit"
          disabled={loading || message.trim().length < 10}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-brand-black font-bold rounded-xl hover:bg-brand-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {loading ? labels.complaintLoadingBtn : labels.complaintSubmitBtn}
        </button>
      </div>
    </form>
  );
}
