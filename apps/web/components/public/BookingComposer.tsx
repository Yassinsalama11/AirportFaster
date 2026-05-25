'use client';

import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  ExternalLink,
  MapPin,
  Minus,
  Plus,
  Search,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
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

const SINAI_TAXI_URL = process.env['NEXT_PUBLIC_SINAI_TAXI_URL'] ?? 'https://sinaitaxi.com';

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

function toLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayISO(): string {
  const d = new Date();
  return toLocalISO(d);
}

function parseLocalISO(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatDateLabel(value: string, locale: string): string {
  const formatterLocale = locale === 'ar' ? 'ar-EG' : 'en-GB';
  return new Intl.DateTimeFormat(formatterLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseLocalISO(value));
}

interface ComposerLabels {
  airportLabel: string;
  airportPlaceholder: string;
  serviceLabel: string;
  servicePlaceholder: string;
  serviceBrowseAll?: string;
  serviceBrowseAllHint?: string;
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
  transferCta: string;
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

  const [date, setDate] = useState(todayISO());
  const [dateOpen, setDateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const dateRef = useRef<HTMLDivElement>(null);

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
      if (!dateRef.current?.contains(e.target as Node)) setDateOpen(false);
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
        const city = a.city.toLowerCase();
        const country = a.country.toLowerCase();
        const iataCode = a.iataCode.toLowerCase();
        return (
          name.includes(q) ||
          city.includes(q) ||
          country.includes(q) ||
          iataCode.includes(q)
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
  const minDate = todayISO();

  function selectAirport(a: Airport) {
    setSelectedAirport(a);
    setAirportQuery(getAirportName(a, locale));
    setAirportOpen(false);
    setServiceOpen(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedAirport || submitting) return;
    setSubmitting(true);
    const params = new URLSearchParams({
      date,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
    });

    if (selectedServiceId) {
      // User picked a specific service — jump straight to the booking form.
      params.set('serviceId', selectedServiceId);
      router.push(`/airports/${selectedAirport.slug}/book?${params.toString()}`);
    } else {
      // No service chosen yet — take them to the plan-selection page first.
      router.push(`/airports/${selectedAirport.slug}?${params.toString()}`);
    }
  }

  // Airport + a valid date is the minimum to proceed. Service is optional
  // because the plan-selection page lets the user pick it next.
  const canSubmit = Boolean(selectedAirport && date && adults >= 1);

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
            <div className="absolute z-50 start-0 top-[calc(100%+0.5rem)] w-screen max-w-[calc(100vw-32px)] sm:w-max sm:min-w-[420px] sm:max-w-[520px] bg-surface border border-line shadow-popover rounded-2xl p-2 max-h-80 overflow-y-auto">
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
                    <span className="inline-flex h-8 min-w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 px-2 font-mono text-xs font-bold text-brand-gold-dark" dir="ltr">
                      {a.iataCode}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block whitespace-normal text-sm font-semibold leading-snug text-ink">
                        {getAirportName(a, locale)}
                      </span>
                      <span className="block whitespace-normal text-xs leading-snug text-ink-3">
                        {a.city}, {a.country}
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
              {/* "Browse all" option — lets the user proceed to the plan page without picking */}
              <button
                type="button"
                onClick={() => { setSelectedServiceId(''); setServiceOpen(false); }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 transition-colors text-start border-b border-line mb-1 pb-2"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold-dark">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-ink">
                    {labels.serviceBrowseAll ?? 'Browse all plans'}
                  </span>
                  <span className="block text-[11px] text-ink-3">
                    {labels.serviceBrowseAllHint ?? 'Compare options on the next page'}
                  </span>
                </div>
              </button>
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
        <div ref={dateRef} className="relative md:border-s md:border-line md:ps-2">
          <button
            type="button"
            onClick={() => setDateOpen((v) => !v)}
            className="block w-full px-4 py-3 rounded-2xl hover:bg-surface-2 transition-colors text-start"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-0.5">
              {labels.dateLabel}
            </p>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <Calendar className="w-4 h-4 text-brand-gold-dark shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {formatDateLabel(date, locale)}
              </span>
              <ChevronDown className={`w-4 h-4 text-ink-3 shrink-0 transition-transform ${dateOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {dateOpen && (
            <CalendarPopover
              locale={locale}
              selectedDate={date}
              minDate={minDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={(value) => {
                setDate(value);
                setDateOpen(false);
              }}
            />
          )}
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
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
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
        <a
          href={SINAI_TAXI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface-2 px-6 py-3.5 text-sm font-bold text-ink transition-colors hover:border-brand-gold/50 hover:bg-brand-gold/10"
        >
          {labels.transferCta}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </form>
  );
}

function CalendarPopover({
  locale,
  selectedDate,
  minDate,
  month,
  onMonthChange,
  onSelect,
}: {
  locale: string;
  selectedDate: string;
  minDate: string;
  month: Date;
  onMonthChange: (date: Date) => void;
  onSelect: (value: string) => void;
}) {
  const formatterLocale = locale === 'ar' ? 'ar-EG' : 'en-GB';
  const minMonth = startOfMonth(parseLocalISO(minDate));
  const previousDisabled = month <= minMonth;
  const days = buildCalendarDays(month);
  const weekdayLabels = getWeekdayLabels(formatterLocale);
  const monthLabel = new Intl.DateTimeFormat(formatterLocale, {
    month: 'long',
    year: 'numeric',
  }).format(month);

  return (
    <div className="absolute z-50 start-1/2 top-[calc(100%+0.5rem)] w-screen max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 shadow-popover sm:start-0 sm:w-80 sm:translate-x-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          disabled={previousDisabled}
          aria-label="Previous month"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <p className="text-sm font-bold text-ink">{monthLabel}</p>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label="Next month"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-surface-2"
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-ink-3">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const value = toLocalISO(day.date);
          const disabled = value < minDate;
          const selected = value === selectedDate;
          const muted = day.date.getMonth() !== month.getMonth();
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              disabled={disabled}
              className={[
                'h-10 rounded-full text-sm font-semibold transition-colors',
                selected
                  ? 'bg-brand-gold text-brand-black'
                  : 'text-ink hover:bg-surface-2',
                muted && !selected ? 'text-ink-3' : '',
                disabled ? 'cursor-not-allowed opacity-30 hover:bg-transparent' : '',
              ].join(' ')}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildCalendarDays(month: Date): Array<{ date: Date }> {
  const firstOfMonth = startOfMonth(month);
  const mondayBasedStart = (firstOfMonth.getDay() + 6) % 7;
  const firstVisible = new Date(firstOfMonth);
  firstVisible.setDate(firstOfMonth.getDate() - mondayBasedStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisible);
    date.setDate(firstVisible.getDate() + index);
    return { date };
  });
}

function getWeekdayLabels(locale: string): string[] {
  const monday = new Date(2026, 4, 25);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  });
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
