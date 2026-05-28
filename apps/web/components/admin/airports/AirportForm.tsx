'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PricingTab } from './PricingTab';

import { COUNTRY_OPTIONS } from '@/lib/countries';

const FALLBACK_TIMEZONE_OPTIONS = [
  'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam',
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait',
  'Asia/Singapore', 'Asia/Bangkok', 'Asia/Kolkata', 'Asia/Karachi',
  'Australia/Sydney', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Africa/Cairo', 'Asia/Istanbul', 'Asia/Amman', 'Asia/Muscat',
].sort();

function getTimezoneOptions(currentTimezone: string): string[] {
  const intlWithTimeZones = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  const supported =
    typeof intlWithTimeZones.supportedValuesOf === 'function'
      ? intlWithTimeZones.supportedValuesOf('timeZone')
      : FALLBACK_TIMEZONE_OPTIONS;
  return [...new Set(['UTC', currentTimezone, ...supported])].filter(Boolean).sort();
}

interface ServiceOption {
  id: string;
  slug: string;
  translations: Array<{ locale: string; name: string }>;
}

interface AirportServiceConfig {
  serviceId: string;
  isActive: boolean;
  cutOffMinutes: number | null;
  minNoticeMinutes: number | null;
  minimumLeadHours: number;
  maxLeadDays: number;
  directionAvailable: 'arrival' | 'departure' | 'both';
  nameEn: string;
  nameAr: string;
}

interface AirportImageData {
  url: string;
  altText?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

interface AirportData {
  id?: string;
  iataCode?: string;
  icaoCode?: string;
  country?: string;
  city?: string;
  timezone?: string;
  status?: string;
  slug?: string;
  translations?: Array<{ locale: string; name: string; description?: string }>;
  images?: AirportImageData[];
  airportServices?: Array<{
    id?: string;
    serviceId: string;
    isActive: boolean;
    cutOffMinutes?: number | null;
    minNoticeMinutes?: number | null;
    minimumLeadHours?: number;
    maxLeadDays?: number;
    directionAvailable?: 'arrival' | 'departure' | 'both';
    translations?: Array<{ locale: string; name: string; description?: string | null }>;
    service?: { id: string; slug: string; translations: Array<{ locale: string; name: string }> };
  }>;
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    canonicalUrl?: string | null;
    ogImage?: string | null;
  } | null;
}

interface Props {
  airport?: AirportData;
  services: ServiceOption[];
  isNew: boolean;
}

type TabId = 'basic' | 'services' | 'seo' | 'translations' | 'publish' | 'pricing';

function getServiceName(service: ServiceOption): string {
  return service.translations.find((t) => t.locale === 'en')?.name ?? service.slug;
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface AirportAIResult {
  iataCode: string;
  icaoCode: string;
  enDescription: string;
  arName: string;
  arDescription: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
  seoOgTitle: string;
  seoOgDescription: string;
  canonicalUrl: string;
}

export function AirportForm({ airport, services, isNew }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Basic info state
  const [iataCode, setIataCode] = useState(airport?.iataCode ?? '');
  const [icaoCode, setIcaoCode] = useState(airport?.icaoCode ?? '');
  const [country, setCountry] = useState(airport?.country ?? '');
  const [city, setCity] = useState(airport?.city ?? '');
  const [timezone, setTimezone] = useState(airport?.timezone ?? 'UTC');
  const timezoneOptions = useMemo(() => getTimezoneOptions(timezone), [timezone]);
  const [status, setStatus] = useState(airport?.status ?? 'draft');
  const [regenerateSlug, setRegenerateSlug] = useState(false);
  const primaryImage =
    airport?.images?.find((image) => image.isPrimary) ?? airport?.images?.[0];
  const [photoUrl, setPhotoUrl] = useState(primaryImage?.url ?? '');
  const [photoAltText, setPhotoAltText] = useState(primaryImage?.altText ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Translation state
  const [enName, setEnName] = useState(
    airport?.translations?.find((t) => t.locale === 'en')?.name ?? '',
  );
  const [enDescription, setEnDescription] = useState(
    airport?.translations?.find((t) => t.locale === 'en')?.description ?? '',
  );
  const [arName, setArName] = useState(
    airport?.translations?.find((t) => t.locale === 'ar')?.name ?? '',
  );
  const [arDescription, setArDescription] = useState(
    airport?.translations?.find((t) => t.locale === 'ar')?.description ?? '',
  );

  // Services state
  const [serviceConfigs, setServiceConfigs] = useState<AirportServiceConfig[]>(
    services.map((svc) => {
      const existing = airport?.airportServices?.find((as) => as.serviceId === svc.id || as.service?.id === svc.id);
      const trEn = existing?.translations?.find((t) => t.locale === 'en')?.name ?? '';
      const trAr = existing?.translations?.find((t) => t.locale === 'ar')?.name ?? '';
      return {
        serviceId: svc.id,
        isActive: existing?.isActive ?? false,
        cutOffMinutes: existing?.cutOffMinutes ?? null,
        minNoticeMinutes: existing?.minNoticeMinutes ?? null,
        minimumLeadHours: existing?.minimumLeadHours ?? 2,
        maxLeadDays: existing?.maxLeadDays ?? 365,
        directionAvailable: existing?.directionAvailable ?? 'both',
        nameEn: trEn,
        nameAr: trAr,
      };
    }),
  );

  // SEO state
  const [metaTitle, setMetaTitle] = useState(airport?.seo?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(airport?.seo?.metaDescription ?? '');
  const [ogTitle, setOgTitle] = useState(airport?.seo?.ogTitle ?? '');
  const [ogDescription, setOgDescription] = useState(airport?.seo?.ogDescription ?? '');
  const [canonicalUrl, setCanonicalUrl] = useState(airport?.seo?.canonicalUrl ?? '');
  const [ogImage, setOgImage] = useState(airport?.seo?.ogImage ?? '');

  const updateServiceConfig = useCallback(
    (serviceId: string, field: keyof AirportServiceConfig, value: boolean | number | string | null) => {
      setServiceConfigs((prev) =>
        prev.map((sc) =>
          sc.serviceId === serviceId ? { ...sc, [field]: value } : sc,
        ),
      );
    },
    [],
  );

  async function callApi(path: string, method: string, body: unknown) {
    const resp = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return resp.json() as Promise<{ success: boolean; error?: { message: string }; data?: unknown }>;
  }

  function buildAirportImages(): AirportImageData[] {
    const trimmedUrl = photoUrl.trim();
    if (!trimmedUrl) return [];

    return [
      {
        url: trimmedUrl,
        altText:
          photoAltText.trim() ||
          enName.trim() ||
          (iataCode.trim() ? `${iataCode.trim().toUpperCase()} airport` : 'Airport photo'),
        isPrimary: true,
        sortOrder: 0,
      },
    ];
  }

  function validateBasicInfo(): string | null {
    if (!/^[A-Z]{3}$/.test(iataCode.trim().toUpperCase())) {
      return 'IATA code must be exactly 3 letters.';
    }
    if (icaoCode.trim() && !/^[A-Z]{4}$/.test(icaoCode.trim().toUpperCase())) {
      return 'ICAO code must be exactly 4 letters when provided.';
    }
    if (!/^[A-Z]{2}$/.test(country.trim().toUpperCase())) {
      return 'Select a valid 2-letter country code.';
    }
    if (!city.trim()) {
      return 'City is required.';
    }
    if (!timezone.trim() || !timezoneOptions.includes(timezone.trim())) {
      return 'Select a valid timezone.';
    }
    if (!enName.trim()) {
      return 'English airport name is required.';
    }
    return null;
  }

  async function uploadPhoto(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Upload an image file.');
      return;
    }

    setUploadingPhoto(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/uploads', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: { message: string };
        data?: { url?: string };
      };

      if (!response.ok || !result.success || !result.data?.url) {
        setError(result.error?.message ?? 'Failed to upload photo');
        return;
      }

      const nextUrl = result.data.url;
      const nextAltText =
        photoAltText.trim() ||
        enName.trim() ||
        (iataCode.trim() ? `${iataCode.trim().toUpperCase()} airport` : 'Airport photo');

      setPhotoUrl(nextUrl);
      setPhotoAltText(nextAltText);

      if (airport?.id) {
        const saveResult = await callApi(`/api/admin/airports/${airport.id}`, 'PATCH', {
          images: [
            {
              url: nextUrl,
              altText: nextAltText,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        });

        if (!saveResult.success) {
          setError(saveResult.error?.message ?? 'Photo uploaded but failed to save');
          return;
        }

        setSuccessMsg('Photo uploaded and saved');
        router.refresh();
        return;
      }

      setSuccessMsg('Photo uploaded. Create the airport to save it.');
    } catch {
      setError('Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function savePhoto() {
    if (!airport?.id) return;
    setSaving(true);
    setError(null);
    try {
      const result = await callApi(`/api/admin/airports/${airport.id}`, 'PATCH', {
        images: buildAirportImages(),
      });
      if (!result.success) {
        setError(result.error?.message ?? 'Failed to save photo');
      } else {
        setSuccessMsg('Airport photo saved');
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function saveBasicInfo() {
    const validationError = validateBasicInfo();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const result = await callApi('/api/admin/airports', 'POST', {
          iataCode: iataCode.toUpperCase(),
          icaoCode: icaoCode || undefined,
          country: country.toUpperCase(),
          city,
          timezone,
          translations: [
            { locale: 'en', name: enName, description: enDescription || undefined },
            ...(arName.trim() ? [{ locale: 'ar', name: arName.trim(), description: arDescription.trim() || undefined }] : []),
          ],
          images: buildAirportImages(),
        });
        if (!result.success) {
          setError(result.error?.message ?? 'Failed to create airport');
          return;
        }
        const newId = (result.data as { airport: { id: string } })?.airport?.id;
        if (newId) {
          router.push(`/admin/airports/${newId}`);
        }
      } else {
        const result = await callApi(`/api/admin/airports/${airport!.id}`, 'PATCH', {
          iataCode: iataCode.toUpperCase(),
          icaoCode: icaoCode || undefined,
          country: country.toUpperCase(),
          city,
          timezone,
          status,
          regenerateSlug,
          translations: [
            { locale: 'en', name: enName, description: enDescription || undefined },
            ...(arName.trim() ? [{ locale: 'ar', name: arName.trim(), description: arDescription.trim() || undefined }] : []),
          ],
        });
        if (!result.success) {
          setError(result.error?.message ?? 'Failed to update airport');
          return;
        }
        setRegenerateSlug(false);
        setSuccessMsg('Basic info saved');
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function saveTranslation() {
    if (!airport?.id) return;
    setSaving(true);
    setError(null);
    try {
      const enResult = await callApi(`/api/admin/airports/${airport.id}/translations`, 'POST', {
        locale: 'en',
        name: enName,
        description: enDescription || undefined,
      });
      if (!enResult.success) {
        setError(enResult.error?.message ?? 'Failed to save English translation');
        return;
      }
      if (arName.trim()) {
        const arResult = await callApi(`/api/admin/airports/${airport.id}/translations`, 'POST', {
          locale: 'ar',
          name: arName.trim(),
          description: arDescription.trim() || undefined,
        });
        if (!arResult.success) {
          setError(arResult.error?.message ?? 'Failed to save Arabic translation');
          return;
        }
      }
      setSuccessMsg('Translations saved');
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function saveServices() {
    if (!airport?.id) return;
    setSaving(true);
    setError(null);
    try {
      const result = await callApi(`/api/admin/airports/${airport.id}/services`, 'PATCH', {
        services: serviceConfigs,
      });
      if (!result.success) {
        setError(result.error?.message ?? 'Failed to save services');
      } else {
        setSuccessMsg('Services saved');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function saveSeo() {
    if (!airport?.id) return;
    setSaving(true);
    setError(null);
    try {
      const result = await callApi(`/api/admin/airports/${airport.id}/seo`, 'PATCH', {
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        ogTitle: ogTitle || undefined,
        ogDescription: ogDescription || undefined,
        canonicalUrl: canonicalUrl || undefined,
        ogImage: ogImage || undefined,
      });
      if (!result.success) {
        setError(result.error?.message ?? 'Failed to save SEO');
      } else {
        setSuccessMsg('SEO saved');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!airport?.id) return;
    setSaving(true);
    setError(null);
    try {
      const result = await callApi(`/api/admin/airports/${airport.id}/publish`, 'PATCH', {});
      if (!result.success) {
        setError(result.error?.message ?? 'Failed to publish');
      } else {
        setStatus('active');
        setSuccessMsg('Airport published!');
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnpublish() {
    if (!airport?.id) return;
    setSaving(true);
    setError(null);
    try {
      const result = await callApi(`/api/admin/airports/${airport.id}/unpublish`, 'PATCH', {});
      if (!result.success) {
        setError(result.error?.message ?? 'Failed to unpublish');
      } else {
        setStatus('inactive');
        setSuccessMsg('Airport unpublished');
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAiFill() {
    if (!enName.trim()) {
      setAiError('Enter the airport name first, then click Auto-fill.');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/admin/ai/fill-airport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airportName: enName.trim() }),
      });
      const json = (await res.json()) as { success: boolean; data?: AirportAIResult; error?: string };
      if (!json.success || !json.data) {
        setAiError(json.error ?? 'AI fill failed. Try again.');
        return;
      }
      const d = json.data;
      if (d.iataCode) setIataCode(d.iataCode);
      if (d.icaoCode) setIcaoCode(d.icaoCode);
      if (d.enDescription) setEnDescription(d.enDescription);
      if (d.arName) setArName(d.arName);
      if (d.arDescription) setArDescription(d.arDescription);
      if (d.seoMetaTitle) setMetaTitle(d.seoMetaTitle);
      if (d.seoMetaDescription) setMetaDescription(d.seoMetaDescription);
      if (d.seoOgTitle) setOgTitle(d.seoOgTitle);
      if (d.seoOgDescription) setOgDescription(d.seoOgDescription);
      if (d.canonicalUrl) setCanonicalUrl(d.canonicalUrl);
      setSuccessMsg('✨ AI filled all fields. Review then save each section.');
    } catch {
      setAiError('Network error. Check your connection and try again.');
    } finally {
      setAiLoading(false);
    }
  }

  const TABS: { id: TabId; label: string; disabled?: boolean }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'translations', label: 'Translations', disabled: isNew },
    { id: 'services', label: 'Services', disabled: isNew },
    { id: 'seo', label: 'SEO', disabled: isNew },
    { id: 'pricing', label: 'Pricing', disabled: isNew },
    { id: 'publish', label: 'Publish', disabled: isNew },
  ];

  const hasEnTranslation = enName.trim().length > 0;
  const hasActiveService = serviceConfigs.some((sc) => sc.isActive);
  const publishRequirements = [
    { label: 'English name set', met: hasEnTranslation },
    { label: 'IATA code set', met: iataCode.trim().length === 3 },
    { label: 'At least one active service', met: hasActiveService },
  ];
  const canPublish = publishRequirements.every((r) => r.met);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-white/10 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-gray-400 hover:text-brand-white',
              tab.disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI Auto-fill bar */}
      <div className="flex items-center gap-3 p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-brand-gold">✨ AI Auto-fill</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Enter the airport name above, then click to auto-fill IATA, ICAO, translations, and SEO.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAiFill}
          disabled={aiLoading || !enName.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap flex-shrink-0"
        >
          {aiLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : (
            '✨ Auto-fill with AI'
          )}
        </button>
      </div>
      {aiError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {aiError}
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-5 max-w-2xl">
          {isNew && (
            <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-brand-gold/20">
              <p className="text-xs font-semibold text-brand-gold uppercase tracking-wider">
                ① Start here — Airport Name
              </p>
              <p className="text-xs text-gray-400">
                Enter the full English name, then use <strong className="text-brand-gold">✨ Auto-fill with AI</strong> above to populate all other fields automatically.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  English Name *
                </label>
                <input
                  type="text"
                  value={enName}
                  onChange={(e) => setEnName(e.target.value)}
                  placeholder="e.g. Dubai International Airport"
                  className="w-full px-4 py-2.5 bg-brand-black border border-brand-gold/30 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                  required
                />
              </div>
              {arName && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Arabic Name (filled by AI)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={arName}
                    onChange={(e) => setArName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                  />
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                IATA Code *
              </label>
              <input
                type="text"
                value={iataCode}
                onChange={(e) => setIataCode(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="DXB"
                maxLength={3}
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white font-mono text-sm focus:border-brand-gold outline-none uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                ICAO Code
              </label>
              <input
                type="text"
                value={icaoCode}
                onChange={(e) => setIcaoCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="OMDB"
                maxLength={4}
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white font-mono text-sm focus:border-brand-gold outline-none uppercase"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              Country *
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            >
              <option value="">Select country...</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              City *
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Dubai"
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              Timezone *
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            >
              <option value="">Select timezone...</option>
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Airport Photo
              </label>
              <div
                className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-brand-black bg-cover bg-center"
                style={photoUrl.trim() ? { backgroundImage: `url("${photoUrl.trim()}")` } : undefined}
              >
                {!photoUrl.trim() && (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    No photo selected
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Upload Photo
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPhoto}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadPhoto(file);
                  }
                  event.target.value = '';
                }}
                className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-gold file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-black hover:file:bg-brand-gold-light disabled:opacity-50"
              />
              <p className="mt-2 text-xs text-gray-500">
                JPG, PNG, or WebP. The public airport card uses this as the primary image.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Photo URL
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Photo Alt Text
              </label>
              <input
                type="text"
                value={photoAltText}
                onChange={(e) => setPhotoAltText(e.target.value)}
                placeholder="Dubai International Airport terminal"
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            {!isNew && (
              <button
                type="button"
                onClick={savePhoto}
                disabled={saving || uploadingPhoto}
                className="px-5 py-2.5 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? 'Saving...' : uploadingPhoto ? 'Uploading...' : 'Save Photo'}
              </button>
            )}
          </div>
          {!isNew && (
            <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Names &amp; Description</p>
              {airport?.slug && (
                <div className="rounded-lg border border-white/10 bg-brand-black p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Slug</p>
                  <code className="mt-1 block text-sm text-brand-gold break-all">{airport.slug}</code>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">English Name *</label>
                <input
                  type="text"
                  value={enName}
                  onChange={(e) => setEnName(e.target.value)}
                  placeholder="e.g. Dubai International Airport"
                  className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">English Description</label>
                <textarea
                  value={enDescription}
                  onChange={(e) => setEnDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description shown on the public airport page…"
                  className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Arabic Name (الاسم)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={arName}
                  onChange={(e) => setArName(e.target.value)}
                  placeholder="مثال: مطار دبي الدولي"
                  className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Arabic Description (الوصف)</label>
                <textarea
                  dir="rtl"
                  value={arDescription}
                  onChange={(e) => setArDescription(e.target.value)}
                  rows={3}
                  placeholder="وصف مختصر للمطار…"
                  className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none"
                />
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-brand-black p-3">
                <input
                  type="checkbox"
                  checked={regenerateSlug}
                  onChange={(e) => setRegenerateSlug(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-brand-black text-brand-gold focus:ring-brand-gold"
                />
                <span>
                  <span className="block text-sm font-medium text-brand-white">Regenerate slug from English name</span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Use this when correcting the public airport name. The airport ID, bookings, pricing,
                    supplier links, and other relations stay unchanged; the canonical SEO URL updates with the new slug.
                  </span>
                </span>
              </label>
              <p className="text-xs text-gray-500">Saved when you click <strong className="text-brand-white">Save Basic Info</strong>.</p>
            </div>
          )}
          {!isNew && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={saveBasicInfo}
            disabled={saving}
            className="px-6 py-2.5 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving...' : isNew ? 'Create Airport' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Translations Tab */}
      {activeTab === 'translations' && (
        <div className="space-y-6 max-w-2xl">
          <p className="text-sm text-gray-400">
            Manage airport name and description in each language. Arabic content is shown on the
            Arabic version of the website (<code className="text-brand-gold text-xs">/ar/airports/…</code>).
          </p>

          {/* English */}
          <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              🇬🇧 English
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Name *
              </label>
              <input
                type="text"
                value={enName}
                onChange={(e) => setEnName(e.target.value)}
                placeholder="e.g. Dubai International Airport"
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={enDescription}
                onChange={(e) => setEnDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of the airport for the public page…"
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none"
              />
            </div>
          </div>

          {/* Arabic */}
          <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              🇸🇦 Arabic (العربية)
              {arName.trim() && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full normal-case tracking-normal">
                  ✓ set
                </span>
              )}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Name (الاسم)
              </label>
              <input
                type="text"
                dir="rtl"
                value={arName}
                onChange={(e) => setArName(e.target.value)}
                placeholder="مثال: مطار دبي الدولي"
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Description (الوصف)
              </label>
              <textarea
                dir="rtl"
                value={arDescription}
                onChange={(e) => setArDescription(e.target.value)}
                rows={3}
                placeholder="وصف مختصر للمطار يظهر في الصفحة العامة…"
                className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none"
              />
            </div>
            {!arName.trim() && (
              <p className="text-xs text-amber-400/80">
                No Arabic name set — the English name will be shown as fallback on the Arabic site.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={saveTranslation}
            disabled={saving}
            className="px-6 py-2.5 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving...' : 'Save Translations'}
          </button>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm text-gray-400">Configure which services are available at this airport.</p>
          {services.map((svc) => {
            const config = serviceConfigs.find((sc) => sc.serviceId === svc.id);
            if (!config) return null;
            return (
              <div key={svc.id} className="bg-brand-navy border border-white/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-brand-white">{getServiceName(svc)}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isActive}
                      onChange={(e) => updateServiceConfig(svc.id, 'isActive', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-gold" />
                    <span className="ml-2 text-sm text-gray-400">{config.isActive ? 'Active' : 'Inactive'}</span>
                  </label>
                </div>
                {config.isActive && (
                  <div className="space-y-4">
                    {/* Market name overrides */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Market Name (English)</label>
                        <input
                          type="text"
                          value={config.nameEn}
                          onChange={(e) => updateServiceConfig(svc.id, 'nameEn', e.target.value)}
                          placeholder='e.g. "Diamond"'
                          className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Market Name (Arabic)</label>
                        <input
                          type="text"
                          value={config.nameAr}
                          onChange={(e) => updateServiceConfig(svc.id, 'nameAr', e.target.value)}
                          placeholder="e.g. الدايموند"
                          dir="rtl"
                          className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 -mt-2">
                      Leave blank to use the global service name. Set per-airport overrides like "Diamond" / "Elite Escort" / "Platinum".
                    </p>

                    {/* Lead times & direction */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Min lead time (hours)</label>
                        <input
                          type="number"
                          value={config.minimumLeadHours}
                          onChange={(e) => updateServiceConfig(svc.id, 'minimumLeadHours', Number(e.target.value) || 0)}
                          min={0}
                          placeholder="3"
                          className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Max advance (days)</label>
                        <input
                          type="number"
                          value={config.maxLeadDays}
                          onChange={(e) => updateServiceConfig(svc.id, 'maxLeadDays', Number(e.target.value) || 0)}
                          min={1}
                          placeholder="365"
                          className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Direction available</label>
                        <select
                          value={config.directionAvailable}
                          onChange={(e) => updateServiceConfig(svc.id, 'directionAvailable', e.target.value as 'arrival' | 'departure' | 'both')}
                          className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                        >
                          <option value="both">Both</option>
                          <option value="arrival">Arrival only</option>
                          <option value="departure">Departure only</option>
                        </select>
                      </div>
                    </div>

                    {/* Operational windows */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Cut-off (minutes)</label>
                        <input
                          type="number"
                          value={config.cutOffMinutes ?? ''}
                          onChange={(e) => updateServiceConfig(svc.id, 'cutOffMinutes', e.target.value ? Number(e.target.value) : null)}
                          placeholder="e.g. 120"
                          min={0}
                          className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Min notice (minutes)</label>
                        <input
                          type="number"
                          value={config.minNoticeMinutes ?? ''}
                          onChange={(e) => updateServiceConfig(svc.id, 'minNoticeMinutes', e.target.value ? Number(e.target.value) : null)}
                          placeholder="e.g. 60"
                          min={0}
                          className="w-full px-3 py-2 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={saveServices}
            disabled={saving}
            className="px-6 py-2.5 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving...' : 'Save Services'}
          </button>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <div className="space-y-5 max-w-2xl">
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                Meta Title
              </label>
              <span className={cn('text-xs', metaTitle.length > 60 ? 'text-red-400' : 'text-gray-500')}>
                {metaTitle.length}/60
              </span>
            </div>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              maxLength={80}
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                Meta Description
              </label>
              <span className={cn('text-xs', metaDescription.length > 160 ? 'text-red-400' : 'text-gray-500')}>
                {metaDescription.length}/160
              </span>
            </div>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              OG Title
            </label>
            <input
              type="text"
              value={ogTitle}
              onChange={(e) => setOgTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              OG Description
            </label>
            <textarea
              value={ogDescription}
              onChange={(e) => setOgDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              Canonical URL
            </label>
            <input
              type="url"
              value={canonicalUrl}
              onChange={(e) => setCanonicalUrl(e.target.value)}
              placeholder="https://airportfaster.com/airports/..."
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
              OG Image URL
            </label>
            <input
              type="url"
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-brand-black border border-white/10 rounded-lg text-brand-white text-sm focus:border-brand-gold outline-none"
            />
          </div>

          {/* SERP Preview */}
          {(metaTitle || metaDescription) && (
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">SERP Preview</p>
              <div className="space-y-1">
                <p className="text-sm text-gray-400">airportfaster.com</p>
                <p className="text-brand-gold text-base font-medium truncate">
                  {metaTitle || 'Untitled'}
                </p>
                <p className="text-gray-300 text-sm line-clamp-2">{metaDescription}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={saveSeo}
            disabled={saving}
            className="px-6 py-2.5 bg-brand-gold text-brand-black font-semibold rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? 'Saving...' : 'Save SEO'}
          </button>
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && airport?.id && (
        <PricingTab
          airportId={airport.id}
          airportServices={
            (airport.airportServices ?? []).flatMap((as) =>
              as.id
                ? [{ id: as.id, ...(as.service != null && { service: { slug: as.service.slug, translations: as.service.translations } }) }]
                : []
            )
          }
        />
      )}

      {/* Publish Tab */}
      {activeTab === 'publish' && (
        <div className="space-y-6 max-w-xl">
          {/* Current status */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Current status:</span>
            <span className={cn(
              'px-2.5 py-1 rounded text-xs font-medium',
              status === 'active'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : status === 'inactive'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
            )}>
              {status}
            </span>
          </div>

          {/* Requirements checklist */}
          <div className="bg-brand-navy border border-white/5 rounded-xl p-5 space-y-3">
            <p className="text-sm font-medium text-brand-white mb-3">Publish requirements</p>
            {publishRequirements.map((req) => (
              <div key={req.label} className="flex items-center gap-3">
                <span className={req.met ? 'text-green-400' : 'text-red-400'}>
                  {req.met ? '✓' : '✗'}
                </span>
                <span className="text-sm text-gray-300">{req.label}</span>
              </div>
            ))}
          </div>

          {/* Public URL */}
          {airport?.slug && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Public URL</p>
              <code className="text-sm text-brand-gold bg-brand-navy px-3 py-1.5 rounded">
                {process.env['NEXT_PUBLIC_BASE_URL'] ?? 'http://localhost:3000'}/airports/{airport.slug}
              </code>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish || saving || status === 'active'}
              className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {saving ? 'Publishing...' : 'Publish'}
            </button>
            {status === 'active' && (
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={saving}
                className="px-6 py-2.5 bg-red-600/20 text-red-400 border border-red-600/30 font-medium rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50 text-sm"
              >
                Unpublish
              </button>
            )}
            {status === 'active' && airport?.slug && (
              <a
                href={`${process.env['NEXT_PUBLIC_BASE_URL'] ?? 'http://localhost:3000'}/airports/${airport.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 border border-brand-gold/30 text-brand-gold font-medium rounded-lg hover:bg-brand-gold/10 transition-colors text-sm"
              >
                View Live Page
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
