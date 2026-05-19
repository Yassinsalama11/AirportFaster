import { prisma, Prisma } from '@airportfaster/db';

export interface SearchAirportRow {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  translations: Array<{ locale: string; name: string }>;
  airportServices: Array<{
    id: string;
    isActive: boolean;
    service: {
      id: string;
      slug: string;
      status: string;
      translations: Array<{ locale: string; name: string }>;
    };
  }>;
}

/**
 * Looks up synonyms for a query term. If the query matches a synonym's `synonym`
 * field, also search for its canonical `term`.
 */
export async function expandQueryWithSynonyms(q: string): Promise<string[]> {
  const terms = [q];
  const synonymRecord = await prisma.searchSynonym.findFirst({
    where: { synonym: { equals: q, mode: 'insensitive' } },
  });
  if (synonymRecord && synonymRecord.term.toLowerCase() !== q.toLowerCase()) {
    terms.push(synonymRecord.term);
  }
  return terms;
}

/**
 * Search airports using both IATA exact-match and PostgreSQL full-text search
 * on airport_translations via a raw query.
 *
 * Returns airports with status `active` only.
 * Optionally filters by service slug (airport must have that service active).
 * When `terms` is empty (no query provided), returns all active airports.
 */
export async function searchAirports(
  terms: string[],
  serviceSlug?: string,
): Promise<SearchAirportRow[]> {
  // When no query terms provided, use Prisma directly to list all matching airports.
  if (terms.length === 0) {
    const airports = await prisma.airport.findMany({
      where: {
        status: 'active',
        ...(serviceSlug
          ? {
              airportServices: {
                some: {
                  isActive: true,
                  service: { slug: serviceSlug, status: 'active' },
                },
              },
            }
          : {}),
      },
      include: {
        translations: true,
        airportServices: {
          where: { isActive: true },
          include: {
            service: {
              include: { translations: true },
            },
          },
        },
      },
      orderBy: { iataCode: 'asc' },
    });
    return airports as SearchAirportRow[];
  }

  // Use raw SQL to leverage the GIN index on airport_translations.
  // websearch_to_tsquery safely handles arbitrary user input (no injection,
  // no syntax errors on special characters) and supports prefix-style matching.
  //
  // TODO: add GIN index via raw SQL migration for production:
  // CREATE INDEX IF NOT EXISTS airports_city_fts_idx ON airports USING gin(to_tsvector('english', city));
  // CREATE INDEX IF NOT EXISTS airport_translations_fts_idx ON airport_translations
  //   USING gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'')));
  // Prisma schema cannot express GIN indexes — run these as a raw SQL migration.
  const iataTerms = terms.map((t) => t.toUpperCase());
  const ilikeTerms = terms.map((t) => `%${t}%`);

  // Build one combined websearch tsquery per term, union them.
  // We issue a single query using multiple OR branches over websearch_to_tsquery.
  // For multi-term expansion, we concatenate all terms into one websearch query
  // which handles them as OR'd tokens internally.
  const combinedWebsearchInput = terms.join(' ');

  type RawAirportId = { id: string; iata_match: boolean };

  const rawRows = await prisma.$queryRaw<RawAirportId[]>`
    SELECT DISTINCT ON (a.id)
      a.id,
      (a.iata_code = ANY(${iataTerms}::text[])) AS iata_match
    FROM airports a
    LEFT JOIN airport_translations at2 ON at2.airport_id = a.id
    WHERE a.status = 'active'
      AND (
        a.iata_code = ANY(${iataTerms}::text[])
        OR a.city ILIKE ANY(${ilikeTerms}::text[])
        OR to_tsvector('simple',
            COALESCE(at2.name, '') || ' ' || COALESCE(at2.description, '')
          ) @@ websearch_to_tsquery('simple', ${combinedWebsearchInput})
      )
    ORDER BY a.id
  `;

  if (rawRows.length === 0) return [];

  const airportIds = rawRows.map((r) => r.id);
  const iataMatchIds = new Set(rawRows.filter((r) => r.iata_match).map((r) => r.id));

  // Step 2: Fetch full airport data via Prisma ORM (uses indexed queries).
  const airports = await prisma.airport.findMany({
    where: {
      id: { in: airportIds },
      status: 'active',
      ...(serviceSlug
        ? {
            airportServices: {
              some: {
                isActive: true,
                service: { slug: serviceSlug, status: 'active' },
              },
            },
          }
        : {}),
    },
    include: {
      translations: true,
      airportServices: {
        where: { isActive: true },
        include: {
          service: {
            include: { translations: true },
          },
        },
      },
    },
  });

  // Step 3: Sort: IATA exact matches first, then alphabetical by iataCode.
  airports.sort((a, b) => {
    const aIata = iataMatchIds.has(a.id) ? 0 : 1;
    const bIata = iataMatchIds.has(b.id) ? 0 : 1;
    if (aIata !== bIata) return aIata - bIata;
    return a.iataCode.localeCompare(b.iataCode);
  });

  return airports as SearchAirportRow[];
}

/**
 * Fetch active pricing rules for an airport service to find cheapest applicable
 * price for a given date and passenger count.
 */
export async function findCheapestPricingRule(
  airportServiceId: string,
  serviceDate: Date,
) {
  return prisma.pricingRule.findFirst({
    where: {
      airportServiceId,
      status: 'active',
      AND: [
        {
          OR: [
            { validFrom: null },
            { validFrom: { lte: serviceDate } },
          ],
        },
        {
          OR: [
            { validTo: null },
            { validTo: { gte: serviceDate } },
          ],
        },
      ],
    },
    orderBy: [
      { basePriceMinor: 'asc' },
      { priority: 'desc' },
    ],
  });
}

/**
 * Find active availability rules for an airport service covering a day-of-week
 * and respecting passenger capacity.
 */
export async function findAvailabilityForDate(
  airportServiceId: string,
  dayOfWeek: number, // 0=Sunday..6=Saturday
  passengers: number,
): Promise<boolean> {
  const rules = await prisma.availabilityRule.findMany({
    where: {
      airportServiceId,
      status: 'active',
      daysOfWeek: { has: dayOfWeek },
    },
  });

  // At least one rule must exist and capacity must be sufficient.
  return rules.some(
    (r) => r.capacityPerSlot === null || r.capacityPerSlot >= passengers,
  );
}

/**
 * Log a search event (fire-and-forget).
 */
export async function logSearchEvent(data: {
  query: string;
  resultCount: number;
  locale: string;
  sessionId?: string;
}): Promise<void> {
  await prisma.searchEvent.create({
    data: {
      query: data.query,
      resultCount: data.resultCount,
      locale: data.locale,
      sessionId: data.sessionId ?? null,
    },
  });
}
