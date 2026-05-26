'use client';

import { useState } from 'react';

type SettingsMap = Record<string, unknown>;

interface Props {
  activeTab: string;
  business: SettingsMap;
  commerce: SettingsMap;
  notifications: SettingsMap;
  integrations: SettingsMap;
}

const labelClass = 'block text-sm font-medium text-gray-300 mb-1';
const inputClass =
  'w-full px-4 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none';

export function SettingsForm({
  activeTab,
  business,
  commerce,
  notifications,
  integrations,
}: Props) {
  if (activeTab === 'business') return <BusinessSection initial={business} />;
  if (activeTab === 'commerce') return <CommerceSection initial={commerce} />;
  if (activeTab === 'notifications') return <NotificationsSection initial={notifications} />;
  if (activeTab === 'integrations') return <IntegrationsSection initial={integrations} />;
  return null;
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-brand-navy border border-white/5 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-brand-white">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SaveBar({
  saving,
  saved,
  error,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/5">
      <div className="text-xs">
        {error && <span className="text-red-400">{error}</span>}
        {saved && !error && <span className="text-green-400">Saved</span>}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-6 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors text-sm disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

async function patchSettings(key: string, body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin/settings/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) return json.error?.message ?? 'Failed to save';
    return null;
  } catch {
    return 'Network error';
  }
}

function useFormSave(key: string) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setSaved(false);
    const err = await patchSettings(key, body);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setSaved(true);
    }
  }

  return { saving, saved, error, save };
}

// ── Business Info ─────────────────────────────────────────────────────────────

function BusinessSection({ initial }: { initial: SettingsMap }) {
  const [companyName, setCompanyName] = useState((initial['companyName'] as string) ?? 'AirportFaster');
  const [legalName, setLegalName] = useState((initial['legalName'] as string) ?? '');
  const [contactEmail, setContactEmail] = useState((initial['contactEmail'] as string) ?? 'support@airportfaster.com');
  const [supportEmail, setSupportEmail] = useState((initial['supportEmail'] as string) ?? 'support@airportfaster.com');
  const [phone, setPhone] = useState((initial['phone'] as string) ?? '');
  const [address, setAddress] = useState((initial['address'] as string) ?? '');
  const [defaultCurrency, setDefaultCurrency] = useState((initial['defaultCurrency'] as string) ?? 'EUR');
  const [defaultLocale, setDefaultLocale] = useState((initial['defaultLocale'] as string) ?? 'en');
  const { saving, saved, error, save } = useFormSave('business');

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Business Information" description="Public details shown in invoices, emails, and the customer footer.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Company Name</label>
            <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Legal Name</label>
            <input className={inputClass} value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="AirportFaster Ltd." />
          </div>
          <div>
            <label className={labelClass}>Contact Email</label>
            <input type="email" className={inputClass} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Support Email</label>
            <input type="email" className={inputClass} value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 ..." />
          </div>
          <div>
            <label className={labelClass}>Default Currency</label>
            <select className={inputClass} value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)}>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="EGP">EGP — Egyptian Pound</option>
              <option value="AED">AED — UAE Dirham</option>
              <option value="SAR">SAR — Saudi Riyal</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Default Locale</label>
            <select className={inputClass} value={defaultLocale} onChange={(e) => setDefaultLocale(e.target.value)}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Address</label>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Registered business address"
            />
          </div>
        </div>
        <SaveBar
          saving={saving}
          saved={saved}
          error={error}
          onSave={() =>
            save({ companyName, legalName, contactEmail, supportEmail, phone, address, defaultCurrency, defaultLocale })
          }
        />
      </SectionCard>
    </div>
  );
}

// ── Commerce ──────────────────────────────────────────────────────────────────

function CommerceSection({ initial }: { initial: SettingsMap }) {
  const [defaultCommissionPercent, setDefaultCommissionPercent] = useState(
    initial['defaultCommissionPercent'] != null ? String(initial['defaultCommissionPercent']) : '15',
  );
  const [refundWindowHours, setRefundWindowHours] = useState(
    initial['refundWindowHours'] != null ? String(initial['refundWindowHours']) : '24',
  );
  const [partialRefundWindowHours, setPartialRefundWindowHours] = useState(
    initial['partialRefundWindowHours'] != null ? String(initial['partialRefundWindowHours']) : '48',
  );
  const [partialRefundPercent, setPartialRefundPercent] = useState(
    initial['partialRefundPercent'] != null ? String(initial['partialRefundPercent']) : '50',
  );
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>(
    Array.isArray(initial['enabledCurrencies'])
      ? (initial['enabledCurrencies'] as string[])
      : ['EUR', 'USD', 'GBP'],
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    (initial['cancellationPolicy'] as string) ??
      'Full refund up to 24h before service. 50% refund 24-48h. No refund within 24h, except flight cancellation by the airline.',
  );
  const { saving, saved, error, save } = useFormSave('commerce');

  function toggleCurrency(code: string) {
    setEnabledCurrencies((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Commission & Refunds" description="Default platform commission and refund windows applied to new bookings.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Default Commission %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className={inputClass}
              value={defaultCommissionPercent}
              onChange={(e) => setDefaultCommissionPercent(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Applied to new suppliers if not overridden on the supplier profile.</p>
          </div>
          <div>
            <label className={labelClass}>Full Refund Window (h)</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={refundWindowHours}
              onChange={(e) => setRefundWindowHours(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Partial Refund Window (h)</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={partialRefundWindowHours}
              onChange={(e) => setPartialRefundWindowHours(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Partial Refund %</label>
            <input
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={partialRefundPercent}
              onChange={(e) => setPartialRefundPercent(e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Enabled Currencies" description="Currencies customers can pay in.">
        <div className="grid grid-cols-4 gap-3">
          {['EUR', 'USD', 'GBP', 'EGP', 'AED', 'SAR', 'TRY', 'MAD'].map((code) => (
            <label
              key={code}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                enabledCurrencies.includes(code)
                  ? 'border-brand-gold/40 bg-brand-gold/10 text-brand-gold'
                  : 'border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <input
                type="checkbox"
                checked={enabledCurrencies.includes(code)}
                onChange={() => toggleCurrency(code)}
                className="accent-brand-gold"
              />
              <span className="font-mono">{code}</span>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Cancellation Policy" description="Plain-language policy shown to customers at checkout.">
        <textarea
          rows={4}
          className={`${inputClass} resize-none`}
          value={cancellationPolicy}
          onChange={(e) => setCancellationPolicy(e.target.value)}
        />
        <SaveBar
          saving={saving}
          saved={saved}
          error={error}
          onSave={() =>
            save({
              defaultCommissionPercent: parseFloat(defaultCommissionPercent),
              refundWindowHours: parseInt(refundWindowHours, 10),
              partialRefundWindowHours: parseInt(partialRefundWindowHours, 10),
              partialRefundPercent: parseFloat(partialRefundPercent),
              enabledCurrencies,
              cancellationPolicy,
            })
          }
        />
      </SectionCard>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationsSection({ initial }: { initial: SettingsMap }) {
  const [fromAddress, setFromAddress] = useState((initial['fromAddress'] as string) ?? 'no-reply@airportfaster.com');
  const [replyTo, setReplyTo] = useState((initial['replyTo'] as string) ?? 'support@airportfaster.com');
  const [bccAdmin, setBccAdmin] = useState((initial['bccAdmin'] as string) ?? '');
  const [sendBookingConfirmation, setSendBookingConfirmation] = useState(
    initial['sendBookingConfirmation'] !== false,
  );
  const [sendPaymentReceipt, setSendPaymentReceipt] = useState(
    initial['sendPaymentReceipt'] !== false,
  );
  const [sendSupplierAssignment, setSendSupplierAssignment] = useState(
    initial['sendSupplierAssignment'] !== false,
  );
  const [sendReminder24h, setSendReminder24h] = useState(initial['sendReminder24h'] !== false);
  const { saving, saved, error, save } = useFormSave('notifications');

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Email Addresses" description="Sender details used by all outbound emails.">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>From Address</label>
            <input className={inputClass} value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Reply-To</label>
            <input className={inputClass} value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>BCC Admin (optional)</label>
            <input
              className={inputClass}
              value={bccAdmin}
              onChange={(e) => setBccAdmin(e.target.value)}
              placeholder="ops@airportfaster.com"
            />
            <p className="text-xs text-gray-500 mt-1">Receive a copy of every customer email.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Email Triggers" description="Toggle individual email types.">
        <div className="space-y-3">
          {[
            { key: 'sendBookingConfirmation', label: 'Booking confirmation', value: sendBookingConfirmation, setter: setSendBookingConfirmation },
            { key: 'sendPaymentReceipt', label: 'Payment receipt', value: sendPaymentReceipt, setter: setSendPaymentReceipt },
            { key: 'sendSupplierAssignment', label: 'Supplier assignment notification', value: sendSupplierAssignment, setter: setSendSupplierAssignment },
            { key: 'sendReminder24h', label: '24-hour reminder', value: sendReminder24h, setter: setSendReminder24h },
          ].map((row) => (
            <label key={row.key} className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm text-gray-300">{row.label}</span>
              <input
                type="checkbox"
                checked={row.value}
                onChange={(e) => row.setter(e.target.checked)}
                className="w-4 h-4 accent-brand-gold"
              />
            </label>
          ))}
        </div>
        <SaveBar
          saving={saving}
          saved={saved}
          error={error}
          onSave={() =>
            save({
              fromAddress,
              replyTo,
              bccAdmin,
              sendBookingConfirmation,
              sendPaymentReceipt,
              sendSupplierAssignment,
              sendReminder24h,
            })
          }
        />
      </SectionCard>
    </div>
  );
}

// ── Integrations ──────────────────────────────────────────────────────────────

function IntegrationsSection({ initial }: { initial: SettingsMap }) {
  const [whatsappNumber, setWhatsappNumber] = useState((initial['whatsappNumber'] as string) ?? '');
  const [sinaiTaxiUrl, setSinaiTaxiUrl] = useState((initial['sinaiTaxiUrl'] as string) ?? 'https://sinaitaxi.com');
  const [stripeMode, setStripeMode] = useState((initial['stripeMode'] as string) ?? 'live');
  const [posthogEnabled, setPosthogEnabled] = useState(initial['posthogEnabled'] !== false);
  const [sentryEnabled, setSentryEnabled] = useState(initial['sentryEnabled'] !== false);
  const { saving, saved, error, save } = useFormSave('integrations');

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Payment" description="Stripe configuration. API keys are managed via environment variables.">
        <div>
          <label className={labelClass}>Stripe Mode</label>
          <select className={inputClass} value={stripeMode} onChange={(e) => setStripeMode(e.target.value)}>
            <option value="live">Live (production keys)</option>
            <option value="test">Test (test keys)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Switching modes requires the matching keys to be set in the API environment.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Communication" description="External services used for customer messages.">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>WhatsApp Number</label>
            <input
              className={inputClass}
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="441748220006"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">Without "+" or spaces (used in wa.me links).</p>
          </div>
          <div>
            <label className={labelClass}>Transfer Partner URL</label>
            <input className={inputClass} value={sinaiTaxiUrl} onChange={(e) => setSinaiTaxiUrl(e.target.value)} dir="ltr" />
            <p className="text-xs text-gray-500 mt-1">Used on the booking confirmation page for transfer upsell.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Analytics & Monitoring">
        <div className="space-y-3">
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className="text-sm text-gray-300">PostHog product analytics</span>
            <input
              type="checkbox"
              checked={posthogEnabled}
              onChange={(e) => setPosthogEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-gold"
            />
          </label>
          <label className="flex items-center justify-between py-2 cursor-pointer">
            <span className="text-sm text-gray-300">Sentry error tracking</span>
            <input
              type="checkbox"
              checked={sentryEnabled}
              onChange={(e) => setSentryEnabled(e.target.checked)}
              className="w-4 h-4 accent-brand-gold"
            />
          </label>
        </div>
        <SaveBar
          saving={saving}
          saved={saved}
          error={error}
          onSave={() =>
            save({ whatsappNumber, sinaiTaxiUrl, stripeMode, posthogEnabled, sentryEnabled })
          }
        />
      </SectionCard>
    </div>
  );
}
