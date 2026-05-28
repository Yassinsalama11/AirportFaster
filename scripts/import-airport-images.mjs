import { Readable } from 'node:stream';

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
  url.searchParams.set('per_page', '10');
  const data = await fetchJson(url, { Authorization: PEXELS_API_KEY });
  return (data.photos ?? [])
    .filter((photo) => photo.width > 1200 && photo.width > photo.height)
    .map((photo) => ({
      url: photo.src?.original ?? photo.src?.large2x ?? photo.src?.large,
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
  url.searchParams.set('per_page', '10');
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
      creditUrl: photo.links?.html,
    }))
    .filter((candidate) => candidate.url);
}

async function findImage(airportName, city) {
  const candidates = PEXELS_API_KEY
    ? await searchPexels(airportName, city)
    : await searchUnsplash(airportName, city);
  if (candidates.length > 0) return candidates[0];

  if (PEXELS_API_KEY && UNSPLASH_ACCESS_KEY) {
    const fallback = await searchUnsplash(airportName, city);
    return fallback[0] ?? null;
  }
  return null;
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

async function processAirport(airport, storage) {
  const airportName = getAirportName(airport);
  const candidate = await findImage(airportName, airport.city);
  if (!candidate) {
    return { iataCode: airport.iataCode, status: 'skipped', reason: 'no API image candidate' };
  }

  const original = await downloadImage(candidate.url);
  const webp = await toWebp(original);
  const filename = `airports/${airport.iataCode.toLowerCase()}-${slugify(airportName)}.webp`;
  const url = await storage.upload(filename, Readable.from(webp), 'image/webp');
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
        OR: [{ ogImage: null }, { ogImage: '' }],
      },
      data: {
        ogImage: url,
      },
    });
  });

  return {
    iataCode: airport.iataCode,
    status: 'updated',
    source: candidate.source,
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
  const results = await runPool(airports, (airport) => processAirport(airport, storage), CONCURRENCY);
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
