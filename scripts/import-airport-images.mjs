import { Readable } from 'node:stream';
import crypto from 'node:crypto';

const dbModulePath = process.env.AIRPORTFASTER_DB_MODULE ?? '../packages/db/dist/index.js';
const storageModulePath = process.env.AIRPORTFASTER_STORAGE_MODULE ?? '../packages/api/dist/lib/storage.js';

const [{ prisma }, { getStorageAdapter }, sharpModule] = await Promise.all([
  import(dbModulePath),
  import(storageModulePath),
  import('sharp'),
]);

const sharp = sharpModule.default ?? sharpModule;

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const CONCURRENCY = Number(process.env.AIRPORT_IMAGE_IMPORT_CONCURRENCY ?? '15');
const OVERWRITE = process.argv.includes('--overwrite');
const LIMIT = Number(process.env.AIRPORT_IMAGE_IMPORT_LIMIT ?? '0');
const TARGET_IATAS = (process.env.AIRPORT_IMAGE_IMPORT_IATAS ?? '')
  .split(',')
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);
const PROVIDER_ORDER = (process.env.AIRPORT_IMAGE_PROVIDER_ORDER ?? 'pexels,unsplash')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value === 'pexels' || value === 'unsplash');

if (!PEXELS_API_KEY && !UNSPLASH_ACCESS_KEY) {
  throw new Error('Set PEXELS_API_KEY or UNSPLASH_ACCESS_KEY before running the image import.');
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getAirportName(airport) {
  return (
    airport.translations.find((translation) => translation.locale === 'en')?.name ??
    airport.translations[0]?.name ??
    `${airport.city} Airport`
  );
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Image API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function searchPexels(airportName, city) {
  if (!PEXELS_API_KEY) return [];
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', `${airportName} ${city} airport`);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', '30');
  const data = await fetchJson(url, { Authorization: PEXELS_API_KEY });
  return (data.photos ?? [])
    .filter((photo) => photo.width > 1200 && photo.width > photo.height)
    .map((photo) => ({
      url: photo.src?.original ?? photo.src?.large2x ?? photo.src?.large,
      providerId: String(photo.id),
      width: photo.width,
      height: photo.height,
      source: 'pexels',
      creditUrl: photo.url,
    }))
    .filter((candidate) => candidate.url);
}

async function searchUnsplash(airportName, city) {
  if (!UNSPLASH_ACCESS_KEY) return [];
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', `${airportName} ${city} airport terminal`);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', '30');
  url.searchParams.set('content_filter', 'high');
  const data = await fetchJson(url, {
    Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    'Accept-Version': 'v1',
  });
  return (data.results ?? [])
    .filter((photo) => photo.width > 1200 && photo.width > photo.height)
    .map((photo) => ({
      url: photo.urls?.raw
        ? `${photo.urls.raw}&w=1800&h=1013&fit=crop&crop=entropy&fm=jpg&q=85`
        : photo.urls?.full,
      width: photo.width,
      height: photo.height,
      source: 'unsplash',
      providerId: String(photo.id),
      creditUrl: photo.links?.html,
    }))
    .filter((candidate) => candidate.url);
}

async function searchProvider(provider, airportName, city) {
  if (provider === 'pexels') return searchPexels(airportName, city);
  if (provider === 'unsplash') return searchUnsplash(airportName, city);
  return [];
}

async function findImageCandidates(airportName, city, iataCode) {
  const queries = [
    `${airportName} ${iataCode} airport`,
    `${airportName} airport terminal`,
    `${airportName} ${city}`,
    `${city} airport terminal`,
  ];
  const seen = new Set();
  const candidates = [];

  for (const query of queries) {
    for (const provider of PROVIDER_ORDER) {
      const results = await searchProvider(provider, query, city);
      for (const result of results) {
        const key = `${result.source}:${result.providerId ?? result.url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(result);
      }
    }
  }

  return candidates;
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AirportFaster airport image importer/1.0',
    },
  });
  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Invalid image content type: ${contentType}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function toWebp(buffer) {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Image dimensions could not be detected.');
  }
  if (metadata.width <= 1200 || metadata.width <= metadata.height) {
    throw new Error(`Image is not valid landscape >1200px: ${metadata.width}x${metadata.height}`);
  }
  return sharp(buffer)
    .resize(1600, 900, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toBuffer();
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function buildExistingImageHashes(targetAirportIds) {
  const targetIds = new Set(targetAirportIds);
  const existingImages = await prisma.airportImage.findMany({
    where: {
      isPrimary: true,
      airportId: {
        notIn: [...targetIds],
      },
    },
    select: {
      url: true,
    },
  });
  const hashes = new Set();
  await runPool(existingImages, async (image) => {
    try {
      const buffer = await downloadImage(image.url);
      hashes.add(hashBuffer(buffer));
    } catch {
      // Existing image hash checks are best-effort; upload/search should not fail because one CDN file is unavailable.
    }
  }, 10);
  return hashes;
}

async function processAirport(airport, storage, reservedHashes) {
  const airportName = getAirportName(airport);
  const candidates = await findImageCandidates(airportName, airport.city, airport.iataCode);
  if (candidates.length === 0) {
    return { iataCode: airport.iataCode, status: 'skipped', reason: 'no API image candidate' };
  }

  let selected = null;
  for (const candidate of candidates) {
    try {
      const original = await downloadImage(candidate.url);
      const webp = await toWebp(original);
      const hash = hashBuffer(webp);
      if (reservedHashes.has(hash)) continue;
      reservedHashes.add(hash);
      selected = { candidate, webp };
      break;
    } catch {
      // Continue to the next API candidate; fast completion matters more than perfect image selection.
    }
  }

  if (!selected) {
    return {
      iataCode: airport.iataCode,
      status: 'skipped',
      reason: 'no unique valid landscape image candidate',
    };
  }

  const filename = `airports/${airport.iataCode.toLowerCase()}-${slugify(airportName)}.webp`;
  const url = await storage.upload(filename, Readable.from(selected.webp), 'image/webp');
  const altText = `${airportName} (${airport.iataCode})`;

  await prisma.$transaction(async (tx) => {
    await tx.airportImage.deleteMany({
      where: {
        airportId: airport.id,
        isPrimary: true,
      },
    });
    await tx.airportImage.create({
      data: {
        airportId: airport.id,
        url,
        altText,
        isPrimary: true,
        sortOrder: 0,
      },
    });
    await tx.airportSeo.updateMany({
      where: {
        airportId: airport.id,
      },
      data: {
        ogImage: url,
      },
    });
  });

  return {
    iataCode: airport.iataCode,
    status: 'updated',
    source: selected.candidate.source,
    url,
  };
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      try {
        results[currentIndex] = await worker(items[currentIndex]);
      } catch (error) {
        results[currentIndex] = {
          iataCode: items[currentIndex].iataCode,
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const airports = await prisma.airport.findMany({
    where: {
      status: 'active',
      ...(TARGET_IATAS.length > 0 ? { iataCode: { in: TARGET_IATAS } } : {}),
      ...(OVERWRITE ? {} : { images: { none: { isPrimary: true } } }),
    },
    include: {
      translations: true,
      images: true,
    },
    orderBy: { iataCode: 'asc' },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  });

  const storage = getStorageAdapter();
  const existingHashes = await buildExistingImageHashes(airports.map((airport) => airport.id));
  const results = await runPool(
    airports,
    (airport) => processAirport(airport, storage, existingHashes),
    CONCURRENCY,
  );
  const summary = {
    requested: airports.length,
    updated: results.filter((result) => result.status === 'updated').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
