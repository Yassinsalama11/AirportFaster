import { logger } from '../../lib/logger.js';
import { quote } from '../pricing/service.js';
import type { SearchQuery } from './validators.js';
import {
  expandQueryWithSynonyms,
  searchAirports,
  findAvailabilityForDate,
  logSearchEvent,
} from './repository.js';

export interface ServiceResult {
  id: string;
  slug: string;
  name: string;
  fromPriceMinorUnits: number;
  currency: string;
}

export interface AirportSearchResult {
  id: string;
  iataCode: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  services: ServiceResult[];
}

function pickTranslation(
  translations: Array<{ locale: string; name: string }>,
  locale: string,
): string {
  const match = translations.find((t) => t.locale === locale);
  if (match) return match.name;
  const en = translations.find((t) => t.locale === 'en');
  if (en) return en.name;
  return translations[0]?.name ?? '';
}

export async function searchService(
  params: SearchQuery,
  sessionId?: string,
): Promise<AirportSearchResult[]> {
  const { q, service: serviceSlug, date, passengers, locale } = params;

  // 1. Expand query with synonyms (q is optional; when absent, match all airports).
  const terms = q ? await expandQueryWithSynonyms(q) : [];

  // 2. Search airports.
  const airports = await searchAirports(terms, serviceSlug);

  // 3. For each airport, build service list with pricing and availability.
  const dateObj = date ? new Date(date) : null;
  const dayOfWeek = dateObj
    ? (dateObj.getUTCDay()) // 0=Sunday
    : null;

  const results: AirportSearchResult[] = [];

  for (const airport of airports) {
    const services: ServiceResult[] = [];

    for (const as of airport.airportServices) {
      if (!as.isActive || as.service.status !== 'active') continue;

      // Availability check (only when date is provided).
      if (dateObj !== null && dayOfWeek !== null) {
        const available = await findAvailabilityForDate(as.id, dayOfWeek, passengers);
        if (!available) continue;
      }

      // Get price via shared quote() service.
      const priceResult = await quote({
        airportServiceId: as.id,
        passengers,
        currency: 'EUR', // default display currency for search results
      });

      if (!priceResult) continue; // no pricing configured — skip

      services.push({
        id: as.service.id,
        slug: as.service.slug,
        name: pickTranslation(as.service.translations, locale),
        fromPriceMinorUnits: priceResult.customerPriceMinor,
        currency: priceResult.displayCurrency,
      });
    }

    results.push({
      id: airport.id,
      iataCode: airport.iataCode,
      slug: airport.slug,
      name: pickTranslation(airport.translations, locale),
      city: airport.city,
      country: airport.country,
      services,
    });
  }

  // 4. Log search event (fire-and-forget — never block the response).
  if (q) {
    logSearchEvent({
      query: q,
      resultCount: results.length,
      locale,
      sessionId,
    }).catch((err: unknown) => {
      logger.warn({ err }, 'Failed to log search event');
    });
  }

  return results;
}
