'use client';

import { MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const MIN_AUTOCOMPLETE_LENGTH = 2;

interface AirportTranslation {
  locale: string;
  name: string;
}

interface Airport {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  translations: AirportTranslation[];
}

function getAirportName(airport: Airport, locale: string): string {
  return (
    airport.translations.find((translation) => translation.locale === locale)?.name ??
    airport.translations.find((translation) => translation.locale === 'en')?.name ??
    airport.city
  );
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function airportStartsWith(airport: Airport, query: string, locale: string): boolean {
  const term = normalizeSearchValue(query);
  if (term.length < MIN_AUTOCOMPLETE_LENGTH) return false;

  const values = [
    getAirportName(airport, locale),
    airport.city,
    airport.iataCode,
    airport.country,
  ];

  return values.some((value) => normalizeSearchValue(value).startsWith(term));
}

export function AirportSearchBox() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const wrapperRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airportLoadState, setAirportLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const trimmedQuery = query.trim();
  const shouldShowAutocomplete = trimmedQuery.length >= MIN_AUTOCOMPLETE_LENGTH;

  const suggestions = useMemo(
    () =>
      airports
        .filter((airport) => airportStartsWith(airport, trimmedQuery, locale))
        .sort((a, b) => getAirportName(a, locale).localeCompare(getAirportName(b, locale))),
    [airports, locale, trimmedQuery],
  );

  useEffect(() => {
    if (!shouldShowAutocomplete || airportLoadState !== 'idle') return;

    setAirportLoadState('loading');

    async function loadAirports() {
      try {
        const response = await fetch(`${API_BASE}/api/public/airports`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          setAirportLoadState('error');
          return;
        }

        const payload = (await response.json()) as {
          success: boolean;
          data?: { airports?: Airport[] };
        };

        setAirports(payload.success ? payload.data?.airports ?? [] : []);
        setAirportLoadState('loaded');
      } catch {
        setAirportLoadState('error');
      }
    }

    void loadAirports();
  }, [airportLoadState, shouldShowAutocomplete]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function handleSuggestionSelect(airport: Airport) {
    setQuery(getAirportName(airport, locale));
    setShowSuggestions(false);
    router.push(`/airports/${airport.slug}`);
  }

  const showDropdown = showSuggestions && shouldShowAutocomplete;

  return (
    <form ref={wrapperRef} onSubmit={handleSubmit} className="relative flex w-full max-w-lg gap-3">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={t('search_airport_placeholder')}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="airport-search-suggestions"
          aria-autocomplete="list"
          className="w-full rounded-[18px] border border-line bg-surface-2 px-5 py-4 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-ink-3 focus:border-brand-gold light:border-black/10 light:bg-white/90 light:text-zinc-950 light:placeholder:text-zinc-500"
          disabled={loading}
        />

        {showDropdown && (
          <div
            id="airport-search-suggestions"
            role="listbox"
            aria-label={t('airport_suggestions')}
            className="bg-surface border border-line shadow-popover rounded-2xl absolute start-0 top-[calc(100%+0.5rem)] z-50 max-h-80 w-full overflow-y-auto rounded-[22px] p-2 text-start"
          >
            {airportLoadState === 'loading' ? (
              <div className="px-4 py-3 text-sm text-ink-3">{t('loading_airports')}</div>
            ) : suggestions.length > 0 ? (
              suggestions.map((airport) => {
                const name = getAirportName(airport, locale);
                return (
                  <button
                    key={airport.id}
                    type="button"
                    role="option"
                    onClick={() => handleSuggestionSelect(airport)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition-colors hover:bg-surface-2 focus:bg-surface-2 light:hover:bg-black/[0.05] light:focus:bg-black/[0.05]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-brand-gold">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-3">
                        <span className="font-mono text-brand-gold" dir="ltr">
                          {airport.iataCode}
                        </span>{' '}
                        · {airport.city}, {airport.country}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-ink-3">
                {t('no_airports_found', { query: trimmedQuery })}
              </div>
            )}
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="relative min-w-[100px] whitespace-nowrap rounded-full bg-brand-gold px-6 py-4 text-sm font-bold text-brand-black transition-colors hover:bg-brand-gold-light disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-brand-black"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>{t('searching')}</span>
          </span>
        ) : (
          t('search')
        )}
      </button>
    </form>
  );
}
