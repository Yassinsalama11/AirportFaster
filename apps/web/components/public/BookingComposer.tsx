'use client';

import { MapPin, ChevronDown, Plus, Minus, Calendar, Search, Sparkles, Users, Coffee, Zap } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

interface AirportTranslation { locale: string; name: string; }
interface ServiceRef {
  id: string;
  isActive: boolean;
  service: { id: string; slug: string; translations: Array<{ locale: string; name: string }> };
}
interface Airport {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  translations: AirportTranslation[];
  airportServices?: ServiceRef[];
}

function getAirportName(airport: Airport, locale: string): string {
  return (
    airport.translations.find((t) => t.locale === locale)?.name ??
    airport.translations.find((t) => t.locale === 'en')?.name ??
    airport.city
  );
}

function getServiceName(svc: ServiceRef['service'], locale: string): string {
  return (
    svc.translations.find((t) => t.locale === locale)?.name ??
    svc.translations.find((t) => t.locale === 'en')?.name ??
    svc.slug
  );
}

function ServiceIcon({ slug, className }: { slug: string; className?: string }) {
  if (slug === 'fast_track' || slug === 'fast-track') return <Zap className={className} />;
  if (slug === 'meet_and_greet' || slug === 'meet-and-greet') return <Users className={className} />;
  if (slug === 'lounge_access' || slug === 'lounge-access') return <Coffee className={className} />;
  return <Sparkles className={className} />;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface ComposerLabels {
  airportLabel: string;
  airportPlaceholder: string;
  serviceLabel: string;
  servicePlaceholder: string;
  dateLabel: string;
  travelersLabel: string;
  adults: string;
  adultsHint: string;
  children: string;
  childrenHint: string;
  infants: string;
  infantsHint: string;
  searchAirportPlaceholder: string;
  noAirportsFound: string;
  loadingAirports: string;
  ctaBook: string;
  ctaSearching: string;
}

export function BookingComposer({ labels }: { labels: ComposerLabels }) {
  const tHome = useTranslations('home');
  const locale = useLocale();
  const router = useRouter();

  const [airports, setAirports] = useState<Airport[]>([]);
  const [airportsLoaded, setAirportsLoaded] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [airportQuery, setAirportQuery] = useState('');
  const [airportOpen, setAirportOpen] = useState(false);
  const airportRef = useRef<HTMLDivElement>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [serviceOpen, setServiceOpen] = useState(false);
  const serviceRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState(tomorrowISO());

  const [travelersOpen, setTravelersOpen] = useState(false);
  const travelersRef = useRef<HTMLDivElement>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  // Load all airports on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/airports', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { success: boolean; data?: { airports?: Airport[] } }) => {
        if (cancelled) return;
        setAirports(j.success ? j.data?.airports ?? [] : []);
        setAirportsLoaded(true);
      })
      .catch(() => { if (!cancelled) setAirportsLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Click outside to close popovers
  useEffect(() => {
    function handler(e: PointerEvent) {
      if (!airportRef.current?.contains(e.target as Node)) setAirportOpen(false);
      if (!serviceRef.current?.contains(e.target as Node)) setServiceOpen(false);
      if (!travelersRef.current?.contains(e.target as Node)) setTravelersOpen(false);
    }
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const filteredAirports = useMemo(() => {
    const q = airportQuery.trim().toLowerCase();
    if (!q) return airports.slice(0, 12);
    return airports
      .filter((a) => {
        const name = getAirportName(a, locale).toLowerCase();
        return (
          name.startsWith(q) ||
          a.city.toLowerCase().startsWith(q) ||
          a.iataCode.toLowerCase().startsWith(q)
        );
      })
      .slice(0, 12);
  }, [airports, airportQuery, locale]);

  const availableServices = useMemo(
    () => (selectedAirport?.airportServices ?? []).filter((s) => s.isActive),
    [selectedAirport],
  );

  // Reset service selection when airport changes
  useEffect(() => {
    setSelectedServiceId('');
  }, [selectedAirport?.id]);

  const selectedService = availableServices.find((s) => s.id === selectedServiceId);
  const totalTravelers = adults + children + infants;
  const minDate = tomorrowISO();

  function selectAirport(a: Airport) {
    setSelectedAirport(a);
    setAirportQuery(getAirportName(a, locale));
    setAirportOpen(false);
    setServiceOpen(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedAirport || !selectedServiceId || submitting) return;
    setSubmitting(true);
    const params = new URLSearchParams({
      serviceId: selectedServiceId,
      date,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
    });
    router.push(`/airports/${selectedAirport.slug}/book?${params.toString()}`);
  }

  const canSubmit = Boolean(selectedAirport && selectedServiceId && date && adults >= 1);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-3xl border border-line shadow-card-hover p-3 max-w-3xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Airport */}
        <div ref={airportRef} className="relative">
          <button
            type="button"
            onClick={() => setAirportOpen((v) => !v)}
            className="w-full text-start rounded-2xl px-4 py-3 hover:bg-surface-2 transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-0.5">
              {labels.airportLabel}
            </p>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-brand-gold-dark shrink-0" />
              <span className={`text-sm truncate ${selectedAirport ? 'text-ink font-semibold' : 'text-ink-3'}`}>
                {selectedAirport ? getAirportName(selectedAirport, locale) : labels.airportPlaceholder}
              </span>
            </div>
          </button>
          {airportOpen && (
            <div className="absolute z-50 start-0 end-0 top-[calc(100%+0.5rem)] bg-surface border border-line shadow-popover rounded-2xl p-2 max-h-80 overflow-y-auto">
              <div className="px-2 pb-2 pt-1">
                <input
                  type="text"
                  value={airportQuery}
                  onChange={(e) => setAirportQuery(e.target.value)}
                  placeholder={labels.searchAirportPlaceholder}
                  autoFocus
                  className="w-full rounded-full border border-line bg-surface-2 px-4 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-brand-gold"
                />
              </div>
              {!airportsLoaded ? (
                <div className="px-3 py-3 text-sm text-ink-3">{labels.loadingAirports}</div>
              ) : filteredAirports.length === 0 ? (
                <div className="px-3 py-3 text-sm text-ink-3">{labels.noAirportsFound}</div>
              ) : (
                filteredAirports.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectAirport(a)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 transition-colors text-start"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold-dark">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {getAirportName(a, locale)}
                      </span>
                      <span className="block truncate text-xs text-ink-3">
                        <span className="font-mono text-brand-gold-dark" dir="ltr">{a.iataCode}</span>
                        {' · '}{a.city}, {a.country}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Service */}
        <div ref={serviceRef} className="relative md:border-s md:border-line md:ps-2">
          <button
            type="button"
            onClick={() => selectedAirport && setServiceOpen((v) => !v)}
            disabled={!selectedAirport}
            className="w-full text-start rounded-2xl px-4 py-3 hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-0.5">
              {labels.serviceLabel}
            </p>
            <div className="flex items-center gap-2 min-w-0">
              {selectedService ? (
                <ServiceIcon slug={selectedService.service.slug} className="w-4 h-4 text-brand-gold-dark shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-brand-gold-dark shrink-0" />
              )}
              <span className={`text-sm truncate ${selectedService ? 'text-ink font-semibold' : 'text-ink-3'}`}>
                {selectedService ? getServiceName(selectedService.service, locale) : labels.servicePlaceholder}
              </span>
            </div>
          </button>
          {serviceOpen && availableServices.length > 0 && (
            <div className="absolute z-50 start-0 end-0 top-[calc(100%+0.5rem)] bg-surface border border-line shadow-popover rounded-2xl p-2">
              {availableServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setSelectedServiceId(s.id); setServiceOpen(false); }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 transition-colors text-start"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold-dark">
                    <ServiceIcon slug={s.service.slug} className="w-4 h-4" />
                  </span>
                  <span className="block text-sm font-medium text-ink">
                    {getServiceName(s.service, locale)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="md:border-s md:border-line md:ps-2">
          <label className="block px-4 py-3 rounded-2xl hover:bg-surface-2 transition-colors cursor-pointer">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-0.5">
              {labels.dateLabel}
            </p>
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-4 h-4 text-brand-gold-dark shrink-0" />
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                dir="ltr"
                className="bg-transparent text-sm text-ink font-semibold outline-none w-full"
              />
            </div>
          </label>
        </div>

        {/* Travelers */}
        <div ref={travelersRef} className="relative md:border-s md:border-line md:ps-2">
          <button
            type="button"
            onClick={() => setTravelersOpen((v) => !v)}
            className="w-full text-start rounded-2xl px-4 py-3 hover:bg-surface-2 transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-0.5">
              {labels.travelersLabel}
            </p>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-sm text-ink font-semibold truncate">
                {tHome('compose_travelers_count', { count: totalTravelers })}
              </span>
              <ChevronDown className={`w-4 h-4 text-ink-3 shrink-0 transition-transform ${travelersOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {travelersOpen && (
            <div className="absolute z-50 end-0 top-[calc(100%+0.5rem)] w-72 bg-surface border border-line shadow-popover rounded-2xl p-4">
              <TravelerRow
                label={labels.adults}
                hint={labels.adultsHint}
                value={adults}
                min={1}
                max={9}
                onChange={setAdults}
              />
              <TravelerRow
                label={labels.children}
                hint={labels.childrenHint}
                value={children}
                min={0}
                max={9}
                onChange={setChildren}
              />
              <TravelerRow
                label={labels.infants}
                hint={labels.infantsHint}
                value={infants}
                min={0}
                max={9}
                onChange={setInfants}
              />
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="mt-2 flex">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-gold px-6 py-3.5 text-sm font-bold text-brand-black shadow-pill transition-colors hover:bg-brand-gold-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-brand-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {labels.ctaSearching}
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              {labels.ctaBook}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function TravelerRow({
  label, hint, value, min, max, onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-3">{hint}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label="decrease"
          className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-line text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-bold text-ink" dir="ltr">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="increase"
          className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-line text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
