const dbModulePath = process.env.AIRPORTFASTER_DB_MODULE ?? '../packages/db/dist/index.js';
const { prisma, Prisma } = await import(dbModulePath);

const SOURCE_NAME = 'GM Travel Solution';
const JOB_NAME = 'gm_travel_solution_price_sync';

// AirportFaster customer prices are always EUR. Supplier sells in USD, so we
// look up the live USD→EUR rate (falling back to the env override and finally
// a sensible default) and store the converted EUR price on the pricing rule.
const TARGET_CURRENCY = 'EUR';
const FALLBACK_USD_TO_EUR = Number(process.env.GM_TRAVEL_USD_TO_EUR_RATE ?? '0.92');

// Default platform commission applied to supplier cost when the supplier
// doesn't yet have a configured `commissionPercent`. Stored on the supplier so
// admins can change it later in one place.
const DEFAULT_COMMISSION_PERCENT = Number(process.env.GM_TRAVEL_DEFAULT_COMMISSION_PCT ?? '20');
const BASE_URL = process.env.GM_TRAVEL_BASE_URL ?? 'https://gmtravelsolution.com';
const ALL_AIRPORTS_PAGE_ID = process.env.GM_TRAVEL_ALL_AIRPORTS_PAGE_ID ?? '27264';
const ALL_AIRPORTS_URL =
  process.env.GM_TRAVEL_ALL_AIRPORTS_URL ?? `${BASE_URL}/wp-json/wp/v2/pages/${ALL_AIRPORTS_PAGE_ID}`;
const PRODUCT_ENDPOINT = process.env.GM_TRAVEL_PRODUCT_ENDPOINT ?? `${BASE_URL}/wp-json/wc/store/products`;
const WP_PAGES_ENDPOINT = process.env.GM_TRAVEL_WP_PAGES_ENDPOINT ?? `${BASE_URL}/wp-json/wp/v2/pages`;
const DRY_RUN = process.argv.includes('--dry-run') || process.env.GM_TRAVEL_DRY_RUN === '1';
const SYNC_IATAS = new Set(
  (readArgValue('--iata') ?? process.env.GM_TRAVEL_SYNC_IATAS ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean),
);
const LIMIT = Number(readArgValue('--limit') ?? process.env.GM_TRAVEL_SYNC_LIMIT ?? 0);
const CONCURRENCY = Math.max(1, Math.min(20, Number(process.env.GM_TRAVEL_SYNC_CONCURRENCY ?? 8)));
const NON_IATA_TOKENS = new Set(['AIR', 'AND', 'CIP', 'INT', 'VIP']);
const PAGE_IATA_OVERRIDES = new Map([
  ['nevsehir-kapadokya-airports-services', 'NAV'],
]);

const SERVICE_DEFINITIONS = {
  fast_track: {
    slugs: ['fast_track', 'fast-track'],
    icon: 'zap',
    sortOrder: 1,
    en: ['Fast Track', 'Skip the security queue with dedicated fast-track lanes.'],
    ar: ['المسار السريع', 'تجاوز طوابير المطار عبر مسارات مخصصة وسريعة.'],
  },
  meet_and_greet: {
    slugs: ['meet_and_greet', 'meet-and-greet'],
    icon: 'handshake',
    sortOrder: 2,
    en: ['Meet & Greet', 'Personal airport assistance from arrival to departure.'],
    ar: ['الاستقبال والتوديع', 'مساعدة شخصية داخل المطار من الوصول إلى المغادرة.'],
  },
  lounge_access: {
    slugs: ['lounge_access', 'lounge-access'],
    icon: 'sofa',
    sortOrder: 3,
    en: ['Lounge Access', 'Relax in premium airport lounges before your flight.'],
    ar: ['دخول الصالة', 'استمتع بالراحة في صالات المطار المميزة قبل رحلتك.'],
  },
};

function readArgValue(name) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function decodeHtml(value = '') {
  const named = {
    amp: '&',
    quot: '"',
    apos: "'",
    '#039': "'",
    nbsp: ' ',
    ndash: '-',
    mdash: '-',
    lsquo: "'",
    rsquo: "'",
    ldquo: '"',
    rdquo: '"',
    '#8211': '-',
    '#8216': "'",
    '#8217': "'",
    '#8220': '"',
    '#8221': '"',
    '#038': '&',
    '#36': '$',
  };
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z0-9#]+);/g, (match, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity] ?? match;
  });
}

function stripTags(value = '') {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithRetry(url, options, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) return response;
      lastError = new Error(`Fetch failed ${response.status} ${response.statusText} for ${url}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchText(url) {
  const response = await fetchWithRetry(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/json',
      'user-agent': 'AirportFaster supplier price sync/1.0',
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText} for ${url}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await fetchWithRetry(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'AirportFaster supplier price sync/1.0',
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

function toAbsoluteUrl(href) {
  try {
    return new URL(decodeHtml(href), BASE_URL).toString();
  } catch {
    return null;
  }
}

function extractIata(...values) {
  for (const value of values) {
    const text = decodeHtml(value ?? '').toUpperCase();
    const commaMatch = text.match(/,\s*([A-Z0-9]{3})\s*,/);
    if (commaMatch) return commaMatch[1];
    const parenMatch = text.match(/\(([A-Z0-9]{3})\)/);
    if (parenMatch) return parenMatch[1];
    const slugCandidates = text
      .replace(/^HTTPS?:\/\/[^/]+\//, '')
      .split(/[^A-Z0-9]+/)
      .filter((part) => /^[A-Z0-9]{3}$/.test(part) && !NON_IATA_TOKENS.has(part));
    if (slugCandidates.length > 0) return slugCandidates[0];
  }
  return null;
}

async function fetchAllAirportPageHtml() {
  const fieldsUrl = new URL(ALL_AIRPORTS_URL);
  fieldsUrl.searchParams.set('_fields', 'id,modified,link,content');
  const page = await fetchJson(fieldsUrl.toString());
  return {
    html: page.content?.rendered ?? '',
    modified: page.modified ?? null,
    endpoint: fieldsUrl.toString(),
  };
}

function extractAirportCatalogue(html) {
  const airports = new Map();
  const linkPattern = /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const href = match[2];
    const label = stripTags(match[3]);
    const url = toAbsoluteUrl(href);
    if (!url || !label) continue;
    const pathname = new URL(url).pathname;
    const iataCode = extractIata(label, pathname);
    if (!iataCode) continue;
    airports.set(iataCode, { iataCode, url, label });
  }
  return [...airports.values()].sort((a, b) => a.iataCode.localeCompare(b.iataCode));
}

function normalizeText(value = '') {
  return decodeHtml(value)
    .toLowerCase()
    .replace(/int['’]?l/g, 'international')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function keyTokensForAirportLabel(label) {
  const primary = decodeHtml(label).split(/[,(–-]/)[0] ?? label;
  const stopwords = new Set([
    'airport',
    'airports',
    'international',
    'intl',
    'int',
    'services',
    'service',
    'the',
    'and',
  ]);
  return normalizeText(primary)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

function scoreAirportPage(page, airport) {
  const pageTokens = new Set(normalizeText(`${page.slug} ${stripTags(page.title?.rendered ?? '')}`).split(/\s+/));
  const tokens = keyTokensForAirportLabel(airport.label);
  if (tokens.length === 0) return 0;
  return tokens.reduce((score, token) => score + (pageTokens.has(token) ? 1 : 0), 0);
}

async function fetchWordPressPages() {
  const pages = [];
  for (let page = 1; page <= 50; page += 1) {
    const url = new URL(WP_PAGES_ENDPOINT);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('_fields', 'id,slug,link,title');
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'AirportFaster supplier price sync/1.0',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 400) break;
    if (!response.ok) {
      throw new Error(`Fetch failed ${response.status} ${response.statusText} for ${url}`);
    }
    const batch = await response.json();
    pages.push(...batch);
    if (batch.length < 100) break;
  }
  return pages;
}

function buildAirportPageLinks(catalogue, pages) {
  const catalogueByIata = new Map(catalogue.map((airport) => [airport.iataCode, airport]));
  // Match any page whose slug either contains "airport" or carries an IATA
  // code from the catalogue (slugs like
  // mohammed-v-intl-cmn-casablanca-morocco, marrakesh-menara-rak-marrakesh-...
  // and agadir-al-massira-aga-agadir-... don't include "airport" at all but
  // are real airport-service pages on the supplier site).
  const SKIP_SLUGS = new Set(['all-airports', 'airport-vip-services']);
  const iataPattern = new RegExp(
    `(?:^|[^a-z0-9])(${[...catalogueByIata.keys()].join('|')})(?:[^a-z0-9]|$)`,
    'i',
  );
  const airportPages = pages.filter((page) => {
    const slug = page.slug ?? '';
    if (SKIP_SLUGS.has(slug)) return false;
    if (/airport/.test(slug)) return true;
    return iataPattern.test(slug);
  });
  const byIata = new Map();

  for (const page of airportPages) {
    const title = stripTags(page.title?.rendered ?? '');
    let airport = null;
    const directIata = PAGE_IATA_OVERRIDES.get(page.slug) ?? extractIata(title, page.slug);
    if (directIata) {
      airport = catalogueByIata.get(directIata) ?? { iataCode: directIata, label: title };
    } else {
      let bestScore = 0;
      for (const candidate of catalogue) {
        const score = scoreAirportPage(page, candidate);
        if (score > bestScore) {
          bestScore = score;
          airport = candidate;
        }
      }
      if (bestScore < 1) airport = null;
    }
    if (!airport) continue;
    byIata.set(airport.iataCode, {
      iataCode: airport.iataCode,
      url: page.link,
      label: airport.label,
      wpPageId: page.id,
      wpPageSlug: page.slug,
      wpPageTitle: title,
    });
  }

  return [...byIata.values()].sort((a, b) => a.iataCode.localeCompare(b.iataCode));
}

function extractPageTitle(html) {
  const ogTitle = html.match(/<meta[^>]+property=(["'])og:title\1[^>]+content=(["'])(.*?)\2/i);
  if (ogTitle) return decodeHtml(ogTitle[3]).trim();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]) : null;
}

function parseTabData(html) {
  const tabs = [];
  const pattern =
    /<li\s+data-atts=(["'])([\s\S]*?)\1[^>]*>[\s\S]*?<span[^>]*class=(["'])[^"']*tab-label[^"']*\3[^>]*>([\s\S]*?)<\/span>/gi;
  for (const match of html.matchAll(pattern)) {
    const rawJson = decodeHtml(match[2]);
    let data;
    try {
      data = JSON.parse(rawJson);
    } catch {
      continue;
    }
    tabs.push({
      label: stripTags(match[4]),
      productIds: Array.isArray(data.include) ? data.include.map(String) : [],
      raw: data,
    });
  }
  return tabs.filter((tab) => tab.productIds.length > 0);
}

function extractInlineProductIds(html) {
  const ids = new Set();
  for (const match of html.matchAll(/\bdata-product_id=(["'])(\d+)\1/g)) {
    ids.add(match[2]);
  }
  return [...ids];
}

function productMatchesAirport(product, airportPage) {
  const airportTokens = new Set([
    ...keyTokensForAirportLabel(airportPage.title ?? ''),
    ...keyTokensForAirportLabel(airportPage.label ?? ''),
    airportPage.iataCode.toLowerCase(),
  ]);
  const productTokens = new Set(
    normalizeText(
      [
        product.name,
        product.slug,
        product.description,
        ...(product.tags ?? []).map((tag) => tag.name),
        ...(product.categories ?? []).map((category) => category.name),
      ].join(' '),
    ).split(/\s+/),
  );

  return [...airportTokens].some((token) => productTokens.has(token));
}

function mapService(product) {
  const tagText = (product.tags ?? []).map((tag) => tag.name).join(' ');
  const categoryText = (product.categories ?? []).map((category) => category.name).join(' ');
  const text = `${decodeHtml(product.name)} ${stripTags(product.description)} ${tagText} ${categoryText}`.toLowerCase();
  if (/\bmeet\s+(and|&)\s+(assist|greet)\b|\bmeet[-\s]?assist\b|\bcip\b/.test(text)) {
    return 'meet_and_greet';
  }
  if (/\bfast[-\s]?track\b/.test(text) && !/\bmeet\s+and\s+assist\b/.test(text)) return 'fast_track';
  if (/\blounge\b/.test(text)) return 'lounge_access';
  if (/\bassist\b/.test(text)) return 'meet_and_greet';
  return null;
}

function mapDirection(name, tabLabel) {
  const text = `${decodeHtml(name)} ${tabLabel}`.toLowerCase();
  if (/\btransfer\b|\btransit\b/.test(text)) return 'both';
  if (/\barrival\b|\bto\b/.test(text)) return 'arrival';
  if (/\bdeparture\b|\bfrom\b/.test(text)) return 'departure';
  return 'both';
}

function parseGroupSize(attributes) {
  const passengerAttribute = (attributes ?? []).find((attribute) =>
    /passenger|guest/i.test(attribute.name ?? attribute.taxonomy ?? ''),
  );
  const defaultTerm =
    passengerAttribute?.terms?.find((term) => term.default) ?? passengerAttribute?.terms?.[0];
  const label = defaultTerm?.name ? decodeHtml(defaultTerm.name) : null;
  if (!label) return { label: null, included: 1, slug: 'default' };

  const rangeMatch = label.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    return {
      label,
      included: Number(rangeMatch[2]),
      slug: defaultTerm.slug ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };
  }
  const singleMatch = label.match(/(\d+)/);
  return {
    label,
    included: singleMatch ? Number(singleMatch[1]) : 1,
    slug: defaultTerm.slug ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  };
}

function buildDisplayName(productName, tierLabel, airportName) {
  // Goal: customer-facing name like "Arrival Meet & Greet" or "VIP Royal Meet & Greet —
  // up to 4 pax". We derive it from the supplier's product name (which carries the
  // marketing tier — "ROYAL", "VIP", "STANDARD", "MEET AND ASSIST", etc.) rather
  // than the supplier company name itself.
  let name = decodeHtml(productName)
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+&\s+/g, ' & ')
    .replace(/–|—/g, '-')
    .trim();

  // Remove the airport name + city + IATA + "FROM/TO X" tail — that's already known
  // from the airport/service combination.
  if (airportName) {
    const escapedAirport = airportName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    name = name.replace(new RegExp(`\\b(?:FROM|TO|AT|IN)?\\s*${escapedAirport}\\s*(?:AIRPORT|INTERNATIONAL)?\\b`, 'gi'), ' ');
  }
  name = name
    .replace(/\b(?:FROM|TO|AT|IN)\s+[A-Z][A-Z\s'-]+$/i, '')
    .replace(/\b[A-Z]{3}\b(?:\s*(?:AIRPORT|INTL|INTERNATIONAL))?/g, '')
    .replace(/\b(?:AIRPORT|INTL|INTERNATIONAL)\b/gi, '')
    .replace(/[-–—]\s*$/g, '')
    .replace(/\s*[-–—]\s*[-–—]\s*/g, ' - ')
    .replace(/\s*-\s+-\s*/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-–—\s]+|[-–—\s]+$/g, '')
    .trim();

  // Title-case the result if it came in all-caps.
  if (name === name.toUpperCase()) {
    name = name
      .toLowerCase()
      .split(' ')
      .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
      .join(' ')
      .replace(/\bVip\b/g, 'VIP')
      .replace(/\bCip\b/g, 'CIP');
  }

  // "Meet And Assist" → "Meet & Greet" (our canonical product wording).
  name = name.replace(/Meet\s+And\s+Assist/gi, 'Meet & Greet');
  name = name.replace(/Meet\s+&\s+Assist/gi, 'Meet & Greet');

  // Append tier hint if it isn't already in the name.
  if (tierLabel && !name.toLowerCase().includes(tierLabel.toLowerCase())) {
    name = `${name} — ${tierLabel}`;
  }

  return name || SOURCE_NAME;
}

function productToPriceRecord(airportPage, tab, product) {
  const serviceSlug = mapService(product);
  const direction = mapDirection(product.name, tab.label);
  const priceMinor = Number.parseInt(product.prices?.price ?? '', 10);
  const currency = product.prices?.currency_code;
  const tier = parseGroupSize(product.attributes);
  const displayName = buildDisplayName(product.name, tier.label, airportPage.title);
  return {
    sourceExternalId: `wc-product:${product.id}:${direction}:${tier.slug}`,
    sourceProductId: String(product.id),
    airportIataCode: airportPage.iataCode,
    airportPageUrl: airportPage.url,
    airportPageTitle: airportPage.title,
    serviceSlug,
    direction,
    displayName,
    priceMinor,
    currency,
    groupSizeIncluded: tier.included,
    productName: decodeHtml(product.name),
    productSlug: product.slug,
    productUrl: product.permalink,
    productDescription: stripTags(product.description),
    tabLabel: tab.label,
    rawProduct: product,
  };
}

function compactPricePayload(record) {
  return {
    sourceExternalId: record.sourceExternalId,
    sourceProductId: record.sourceProductId,
    airportIataCode: record.airportIataCode,
    airportPageUrl: record.airportPageUrl,
    serviceSlug: record.serviceSlug,
    direction: record.direction,
    priceMinor: record.priceMinor,
    currency: record.currency,
    groupSizeIncluded: record.groupSizeIncluded,
    productName: record.productName,
    productSlug: record.productSlug,
    productUrl: record.productUrl,
    tabLabel: record.tabLabel,
  };
}

async function fetchAirportProducts(airportLink) {
  const html = await fetchText(airportLink.url);
  const title = extractPageTitle(html) ?? airportLink.label;
  const iataCode = airportLink.iataCode ?? extractIata(title, airportLink.label, airportLink.url);
  let tabs = parseTabData(html);
  if (tabs.length === 0) {
    const inlineProductIds = extractInlineProductIds(html);
    if (inlineProductIds.length > 0) {
      tabs = [{ label: 'Inline products', productIds: inlineProductIds, raw: { source: 'inline_product_grid' } }];
    }
  }
  const records = [];
  const failures = [];
  const skips = [];

  if (tabs.length === 0) {
    skips.push({
      entityType: 'airport_page',
      sourceKey: airportLink.url,
      reason: 'No Woodmart product tab IDs found on airport page',
      payload: { airportLink, title },
    });
    return { iataCode, title, url: airportLink.url, records, failures, skips };
  }

  for (const tab of tabs) {
    for (const productId of tab.productIds) {
      try {
        const product = await fetchJson(`${PRODUCT_ENDPOINT}/${productId}`);
        if (!productMatchesAirport(product, { ...airportLink, iataCode, title })) {
          continue;
        }
        records.push(productToPriceRecord({ iataCode, title, url: airportLink.url }, tab, product));
      } catch (error) {
        failures.push({
          entityType: 'product',
          sourceKey: String(productId),
          reason: error instanceof Error ? error.message : String(error),
          payload: { airportLink, tab },
        });
      }
    }
  }

  if (records.length === 0 && tabs.some((tab) => tab.productIds.length > 0)) {
    skips.push({
      entityType: 'airport_page',
      sourceKey: airportLink.url,
      reason: 'No supplier products matched the airport IATA/name after filtering unrelated product widgets',
      payload: { airportLink, title, tabCount: tabs.length },
    });
  }

  return { iataCode, title, url: airportLink.url, records, failures, skips };
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

async function ensureSupplier() {
  const existing = await prisma.supplier.findFirst({ where: { name: SOURCE_NAME } });
  if (existing) {
    // Backfill commissionPercent if missing — keeps the sync forward-compatible
    // for suppliers that were created before commission was a tracked field.
    if (existing.commissionPercent == null && !DRY_RUN) {
      return prisma.supplier.update({
        where: { id: existing.id },
        data: { commissionPercent: DEFAULT_COMMISSION_PERCENT },
      });
    }
    return existing;
  }
  if (DRY_RUN) {
    return {
      id: 'dry-run-supplier',
      name: SOURCE_NAME,
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
    };
  }
  return prisma.supplier.create({
    data: {
      name: SOURCE_NAME,
      legalName: SOURCE_NAME,
      status: 'verified',
      payoutCurrency: 'USD',
      commissionPercent: DEFAULT_COMMISSION_PERCENT,
      notes: 'Created by GM Travel Solution automated supplier price sync.',
    },
  });
}

// Look up the USD→EUR conversion rate from the `currency_rates` table, with
// graceful fallback to env override / hardcoded value so the sync never fails
// on a fresh DB.
async function getUsdToEurRate() {
  if (DRY_RUN) return FALLBACK_USD_TO_EUR;
  const row = await prisma.currencyRate.findUnique({
    where: { baseCurrency_quoteCurrency: { baseCurrency: 'USD', quoteCurrency: 'EUR' } },
  });
  if (row?.rate != null) {
    const n = Number(row.rate);
    if (Number.isFinite(n) && n > 0) return n;
  }
  // Seed a default so the admin can see + edit it in Settings.
  await prisma.currencyRate.upsert({
    where: { baseCurrency_quoteCurrency: { baseCurrency: 'USD', quoteCurrency: 'EUR' } },
    create: {
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: FALLBACK_USD_TO_EUR,
      fetchedAt: new Date(),
    },
    update: {},
  });
  return FALLBACK_USD_TO_EUR;
}

// Convert a supplier minor-unit price (USD cents) into customer-facing EUR
// minor units (cents) with the platform commission applied.
function toCustomerPriceMinorEur(supplierMinor, supplierCurrency, usdToEur, commissionPct) {
  const supplierEurMinor =
    supplierCurrency === 'EUR'
      ? supplierMinor
      : Math.round(supplierMinor * usdToEur);
  const withCommission = Math.round(supplierEurMinor * (1 + commissionPct / 100));
  return { supplierEurMinor, customerEurMinor: withCommission };
}

async function ensureServices() {
  const services = {};
  for (const [canonicalSlug, definition] of Object.entries(SERVICE_DEFINITIONS)) {
    const existing = await prisma.service.findFirst({
      where: { slug: { in: definition.slugs } },
    });
    if (existing) {
      services[canonicalSlug] = existing;
      continue;
    }
    if (DRY_RUN) {
      services[canonicalSlug] = { id: `dry-run-${canonicalSlug}`, slug: canonicalSlug };
      continue;
    }
    services[canonicalSlug] = await prisma.service.create({
      data: {
        slug: canonicalSlug,
        icon: definition.icon,
        sortOrder: definition.sortOrder,
        status: 'active',
        translations: {
          create: [
            { locale: 'en', name: definition.en[0], description: definition.en[1] },
            { locale: 'ar', name: definition.ar[0], description: definition.ar[1] },
          ],
        },
      },
    });
  }
  return services;
}

async function createImportLog(metadata) {
  if (DRY_RUN) return null;
  return prisma.importLog.create({
    data: {
      sourceName: SOURCE_NAME,
      jobName: JOB_NAME,
      status: 'running',
      metadata,
    },
  });
}

async function recordFailure(importLog, failure) {
  if (!importLog || DRY_RUN) return;
  await prisma.failedImport.create({
    data: {
      importLogId: importLog.id,
      sourceName: SOURCE_NAME,
      entityType: failure.entityType,
      sourceKey: failure.sourceKey ?? null,
      reason: failure.reason,
      payload: failure.payload == null ? Prisma.JsonNull : failure.payload,
    },
  });
}

async function importPriceRecord(record, context) {
  const airport = context.airportsByIata.get(record.airportIataCode);
  if (!airport) {
    return {
      status: 'failed',
      failure: {
        entityType: 'price',
        sourceKey: record.sourceExternalId,
        reason: `No AirportFaster airport found for IATA ${record.airportIataCode}`,
        payload: compactPricePayload(record),
      },
    };
  }
  const service = context.services[record.serviceSlug];
  if (!service) {
    return {
      status: 'failed',
      failure: {
        entityType: 'price',
        sourceKey: record.sourceExternalId,
        reason: `No AirportFaster service mapping found for product ${record.productName}`,
        payload: compactPricePayload(record),
      },
    };
  }
  if (!record.currency || !/^[A-Z]{3}$/.test(record.currency)) {
    return {
      status: 'failed',
      failure: {
        entityType: 'price',
        sourceKey: record.sourceExternalId,
        reason: 'Missing or invalid product currency',
        payload: compactPricePayload(record),
      },
    };
  }
  if (!Number.isFinite(record.priceMinor) || record.priceMinor <= 0) {
    return {
      status: 'failed',
      failure: {
        entityType: 'price',
        sourceKey: record.sourceExternalId,
        reason: 'Missing or invalid product price',
        payload: compactPricePayload(record),
      },
    };
  }
  if (!record.serviceSlug) {
    return {
      status: 'failed',
      failure: {
        entityType: 'price',
        sourceKey: record.sourceExternalId,
        reason: 'Could not map supplier product to AirportFaster service',
        payload: compactPricePayload(record),
      },
    };
  }

  if (DRY_RUN) {
    return { status: 'imported' };
  }

  const existing = await prisma.pricingRule.findFirst({
    where: { sourceName: SOURCE_NAME, sourceExternalId: record.sourceExternalId },
    select: { id: true },
  });
  const now = new Date();
  // Default validity window: from today to +1 year. Re-running this sync rolls
  // both dates forward so prices never expire while we keep syncing.
  const validFrom = now;
  const validTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  // Apply currency conversion + platform commission. Customer pays
  // `customerEurMinor` in EUR; supplier is owed `supplierEurMinor` (also in
  // EUR for consistent reporting). Both first-passenger and extra-passenger
  // fields are set to the customer price so the booking calculator scales
  // linearly with passenger count (one base price per passenger).
  const { supplierEurMinor, customerEurMinor } = toCustomerPriceMinorEur(
    record.priceMinor,
    record.currency,
    context.usdToEur,
    context.commissionPct,
  );

  await prisma.$transaction(async (tx) => {
    const airportService = await tx.airportService.upsert({
      where: {
        airportId_serviceId: {
          airportId: airport.id,
          serviceId: service.id,
        },
      },
      create: {
        airportId: airport.id,
        serviceId: service.id,
        isActive: true,
        directionAvailable: record.direction === 'both' ? 'both' : record.direction,
      },
      update: {
        isActive: true,
        directionAvailable: 'both',
      },
    });

    await tx.supplierAirport.upsert({
      where: {
        supplierId_airportId: {
          supplierId: context.supplier.id,
          airportId: airport.id,
        },
      },
      create: { supplierId: context.supplier.id, airportId: airport.id, status: 'active' },
      update: { status: 'active' },
    });

    await tx.supplierService.upsert({
      where: {
        supplierId_serviceId: {
          supplierId: context.supplier.id,
          serviceId: service.id,
        },
      },
      create: { supplierId: context.supplier.id, serviceId: service.id, status: 'active' },
      update: { status: 'active' },
    });

    await tx.supplierCoverage.upsert({
      where: {
        supplierId_airportServiceId: {
          supplierId: context.supplier.id,
          airportServiceId: airportService.id,
        },
      },
      create: {
        supplierId: context.supplier.id,
        airportServiceId: airportService.id,
        status: 'active',
        priority: 50,
      },
      update: { status: 'active', priority: 50 },
    });

    await tx.pricingRule.upsert({
      where: {
        sourceName_sourceExternalId: {
          sourceName: SOURCE_NAME,
          sourceExternalId: record.sourceExternalId,
        },
      },
      create: {
        airportServiceId: airportService.id,
        supplierId: context.supplier.id,
        displayName: record.displayName,
        mode: 'fixed',
        direction: record.direction,
        pricingModel: 'tiered',
        basePriceMinor: customerEurMinor,
        firstPassengerMinor: customerEurMinor,
        extraPassengerMinor: customerEurMinor,
        supplierCostMinor: supplierEurMinor,
        supplierCostFirstMinor: supplierEurMinor,
        supplierCostExtraMinor: supplierEurMinor,
        groupSizeIncluded: 1,
        currency: TARGET_CURRENCY,
        priority: 50,
        status: 'active',
        validFrom,
        validTo,
        passengerPricing: Prisma.JsonNull,
        peakRules: {
          source: SOURCE_NAME,
          productId: record.sourceProductId,
          productName: record.productName,
          productSlug: record.productSlug,
          productUrl: record.productUrl,
          airportPageUrl: record.airportPageUrl,
          airportPageTitle: record.airportPageTitle,
          importedBy: JOB_NAME,
        },
        sourceName: SOURCE_NAME,
        sourceExternalId: record.sourceExternalId,
        sourceSyncedAt: now,
      },
      update: {
        airportServiceId: airportService.id,
        supplierId: context.supplier.id,
        displayName: record.displayName,
        mode: 'fixed',
        direction: record.direction,
        pricingModel: 'tiered',
        basePriceMinor: customerEurMinor,
        firstPassengerMinor: customerEurMinor,
        extraPassengerMinor: customerEurMinor,
        supplierCostMinor: supplierEurMinor,
        supplierCostFirstMinor: supplierEurMinor,
        supplierCostExtraMinor: supplierEurMinor,
        groupSizeIncluded: 1,
        currency: TARGET_CURRENCY,
        priority: 50,
        status: 'active',
        validFrom,
        validTo,
        peakRules: {
          source: SOURCE_NAME,
          productId: record.sourceProductId,
          productName: record.productName,
          productSlug: record.productSlug,
          productUrl: record.productUrl,
          airportPageUrl: record.airportPageUrl,
          airportPageTitle: record.airportPageTitle,
          importedBy: JOB_NAME,
        },
        sourceSyncedAt: now,
      },
    });
  });

  return { status: existing ? 'updated' : 'imported' };
}

async function main() {
  const sourcePage = await fetchAllAirportPageHtml();
  const catalogue = extractAirportCatalogue(sourcePage.html);
  const wordpressPages = await fetchWordPressPages();
  let airportLinks = buildAirportPageLinks(catalogue, wordpressPages);
  if (SYNC_IATAS.size > 0) {
    airportLinks = airportLinks.filter((airport) => SYNC_IATAS.has(airport.iataCode));
  }
  if (LIMIT > 0) airportLinks = airportLinks.slice(0, LIMIT);

  const importLog = await createImportLog({
    sourcePageEndpoint: sourcePage.endpoint,
    productEndpoint: PRODUCT_ENDPOINT,
    pagesEndpoint: WP_PAGES_ENDPOINT,
    allAirportsModified: sourcePage.modified,
    catalogueAirportsSeen: catalogue.length,
    wordpressPagesSeen: wordpressPages.length,
    iataFilter: [...SYNC_IATAS],
    dryRun: DRY_RUN,
  });

  const summary = {
    source: SOURCE_NAME,
    dryRun: DRY_RUN,
    catalogueAirportsSeen: catalogue.length,
    wordpressPagesSeen: wordpressPages.length,
    airportPagesSeen: airportLinks.length,
    productRecordsSeen: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    skips: [],
    failures: [],
  };

  try {
    const supplier = await ensureSupplier();
    const services = await ensureServices();
    const usdToEur = await getUsdToEurRate();
    const commissionPct =
      supplier.commissionPercent != null
        ? Number(supplier.commissionPercent)
        : DEFAULT_COMMISSION_PERCENT;
    summary.usdToEurRate = usdToEur;
    summary.commissionPercent = commissionPct;
    const airports = await prisma.airport.findMany({
      select: { id: true, iataCode: true },
    });
    const airportsByIata = new Map(airports.map((airport) => [airport.iataCode, airport]));

    const pageResults = await runPool(
      airportLinks,
      async (airportLink) => {
        try {
          return await fetchAirportProducts(airportLink);
        } catch (error) {
          return {
            iataCode: airportLink.iataCode,
            title: airportLink.label,
            url: airportLink.url,
            records: [],
            skips: [],
            failures: [
              {
                entityType: 'airport_page',
                sourceKey: airportLink.url,
                reason: error instanceof Error ? error.message : String(error),
                payload: airportLink,
              },
            ],
          };
        }
      },
      CONCURRENCY,
    );

    for (const pageResult of pageResults) {
      for (const failure of pageResult.failures) {
        summary.failed += 1;
        summary.failures.push(failure);
        await recordFailure(importLog, failure);
      }
      for (const skip of pageResult.skips ?? []) {
        summary.skipped += 1;
        summary.skips.push(skip);
      }

      for (const record of pageResult.records) {
        summary.productRecordsSeen += 1;
        const result = await importPriceRecord(record, {
          supplier,
          services,
          airportsByIata,
          usdToEur,
          commissionPct,
        });
        if (result.status === 'imported') summary.imported += 1;
        if (result.status === 'updated') summary.updated += 1;
        if (result.status === 'skipped') summary.skipped += 1;
        if (result.status === 'failed') {
          summary.failed += 1;
          summary.failures.push(result.failure);
          await recordFailure(importLog, result.failure);
        }
      }
    }

    if (importLog) {
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: summary.failed > 0 ? (summary.imported + summary.updated > 0 ? 'partial' : 'failed') : 'success',
          syncFinishedAt: new Date(),
          recordsSeen: summary.productRecordsSeen,
          recordsImported: summary.imported,
          recordsUpdated: summary.updated,
          recordsSkipped: summary.skipped,
          recordsFailed: summary.failed,
          metadata: {
            sourcePageEndpoint: sourcePage.endpoint,
            productEndpoint: PRODUCT_ENDPOINT,
            pagesEndpoint: WP_PAGES_ENDPOINT,
            allAirportsModified: sourcePage.modified,
            catalogueAirportsSeen: catalogue.length,
            wordpressPagesSeen: wordpressPages.length,
            airportPagesSeen: summary.airportPagesSeen,
          },
        },
      });
    }
  } catch (error) {
    summary.failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    summary.failures.push({ entityType: 'job', reason: message });
    if (importLog) {
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: {
          status: 'failed',
          syncFinishedAt: new Date(),
          recordsSeen: summary.productRecordsSeen,
          recordsImported: summary.imported,
          recordsUpdated: summary.updated,
          recordsSkipped: summary.skipped,
          recordsFailed: summary.failed,
          errorMessage: message,
        },
      });
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify(summary, null, 2));
}

await main();
