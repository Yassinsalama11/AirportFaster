// Seeds the UK/Channel Islands airports that GM Travel Solution covers but
// we don't have in our DB yet. Idempotent — uses upsert keyed on iataCode.
// Run inside Railway: `railway ssh -- 'cd /app && node scripts/seed-uk-airports.mjs'`

const dbModulePath = process.env.AIRPORTFASTER_DB_MODULE ?? '../packages/db/dist/index.js';
const { prisma } = await import(dbModulePath);

const UK_TIMEZONE = 'Europe/London';
const JE_TIMEZONE = 'Europe/Jersey';
const IM_TIMEZONE = 'Europe/Isle_of_Man';

const AIRPORTS = [
  { iata: 'BHX', icao: 'EGBB', slug: 'birmingham-airport',         country: 'GB', city: 'Birmingham',  tz: UK_TIMEZONE, lat: 52.4539, lon: -1.7480, en: 'Birmingham Airport',               ar: 'مطار برمنغهام' },
  { iata: 'BOH', icao: 'EGHH', slug: 'bournemouth-airport',        country: 'GB', city: 'Bournemouth', tz: UK_TIMEZONE, lat: 50.7800, lon: -1.8417, en: 'Bournemouth Airport',              ar: 'مطار بورنموث' },
  { iata: 'CWL', icao: 'EGFF', slug: 'cardiff-airport',            country: 'GB', city: 'Cardiff',     tz: UK_TIMEZONE, lat: 51.3967, lon: -3.3433, en: 'Cardiff Airport',                  ar: 'مطار كارديف' },
  { iata: 'DSA', icao: 'EGCN', slug: 'doncaster-sheffield-airport',country: 'GB', city: 'Doncaster',   tz: UK_TIMEZONE, lat: 53.4744, lon: -1.0044, en: 'Doncaster Sheffield Airport',      ar: 'مطار دونكاستر شيفيلد' },
  { iata: 'EMA', icao: 'EGNX', slug: 'east-midlands-airport',      country: 'GB', city: 'Castle Donington', tz: UK_TIMEZONE, lat: 52.8311, lon: -1.3281, en: 'East Midlands Airport',     ar: 'مطار إيست ميدلاندز' },
  { iata: 'EXT', icao: 'EGTE', slug: 'exeter-airport',             country: 'GB', city: 'Exeter',      tz: UK_TIMEZONE, lat: 50.7344, lon: -3.4139, en: 'Exeter Airport',                   ar: 'مطار إكستر' },
  { iata: 'HUY', icao: 'EGNJ', slug: 'humberside-airport',         country: 'GB', city: 'Kirmington',  tz: UK_TIMEZONE, lat: 53.5744, lon: -0.3508, en: 'Humberside Airport',               ar: 'مطار هامبرسايد' },
  { iata: 'INV', icao: 'EGPE', slug: 'inverness-airport',          country: 'GB', city: 'Inverness',   tz: UK_TIMEZONE, lat: 57.5425, lon: -4.0475, en: 'Inverness Airport',                ar: 'مطار إنفرنيس' },
  { iata: 'IOM', icao: 'EGNS', slug: 'isle-of-man-airport',        country: 'IM', city: 'Ballasalla',  tz: IM_TIMEZONE, lat: 54.0833, lon: -4.6233, en: 'Isle of Man Airport (Ronaldsway)', ar: 'مطار جزيرة مان' },
  { iata: 'JER', icao: 'EGJJ', slug: 'jersey-airport',             country: 'JE', city: 'Saint Peter', tz: JE_TIMEZONE, lat: 49.2079, lon: -2.1955, en: 'Jersey Airport',                   ar: 'مطار جيرسي' },
  { iata: 'LBA', icao: 'EGNM', slug: 'leeds-bradford-airport',     country: 'GB', city: 'Leeds',       tz: UK_TIMEZONE, lat: 53.8659, lon: -1.6605, en: 'Leeds Bradford Airport',           ar: 'مطار ليدز برادفورد' },
  { iata: 'LCY', icao: 'EGLC', slug: 'london-city-airport',        country: 'GB', city: 'London',      tz: UK_TIMEZONE, lat: 51.5053, lon:  0.0553, en: 'London City Airport',              ar: 'مطار لندن سيتي' },
  { iata: 'LPL', icao: 'EGGP', slug: 'liverpool-john-lennon-airport', country: 'GB', city: 'Liverpool', tz: UK_TIMEZONE, lat: 53.3336, lon: -2.8497, en: 'Liverpool John Lennon Airport',  ar: 'مطار ليفربول جون لينون' },
  { iata: 'MME', icao: 'EGNV', slug: 'teesside-international-airport', country: 'GB', city: 'Darlington', tz: UK_TIMEZONE, lat: 54.5092, lon: -1.4294, en: 'Teesside International Airport', ar: 'مطار تيسايد الدولي' },
  { iata: 'NCL', icao: 'EGNT', slug: 'newcastle-airport',          country: 'GB', city: 'Newcastle',   tz: UK_TIMEZONE, lat: 55.0375, lon: -1.6917, en: 'Newcastle Airport',                ar: 'مطار نيوكاسل' },
  { iata: 'NWI', icao: 'EGSH', slug: 'norwich-airport',            country: 'GB', city: 'Norwich',     tz: UK_TIMEZONE, lat: 52.6758, lon:  1.2828, en: 'Norwich International Airport',    ar: 'مطار نورويتش الدولي' },
  { iata: 'PIK', icao: 'EGPK', slug: 'glasgow-prestwick-airport',  country: 'GB', city: 'Prestwick',   tz: UK_TIMEZONE, lat: 55.5094, lon: -4.5867, en: 'Glasgow Prestwick Airport',        ar: 'مطار غلاسكو بريستويك' },
  { iata: 'PLY', icao: 'EGHD', slug: 'plymouth-city-airport',      country: 'GB', city: 'Plymouth',    tz: UK_TIMEZONE, lat: 50.4228, lon: -4.1058, en: 'Plymouth City Airport',            ar: 'مطار بليموث سيتي' },
  { iata: 'SOU', icao: 'EGHI', slug: 'southampton-airport',        country: 'GB', city: 'Southampton', tz: UK_TIMEZONE, lat: 50.9503, lon: -1.3568, en: 'Southampton Airport',              ar: 'مطار ساوثهامبتون' },
  { iata: 'STN', icao: 'EGSS', slug: 'london-stansted-airport',    country: 'GB', city: 'London',      tz: UK_TIMEZONE, lat: 51.8860, lon:  0.2389, en: 'London Stansted Airport',          ar: 'مطار لندن ستانستيد' },
  { iata: 'SWS', icao: 'EGFH', slug: 'swansea-airport',            country: 'GB', city: 'Swansea',     tz: UK_TIMEZONE, lat: 51.6053, lon: -4.0678, en: 'Swansea Airport',                  ar: 'مطار سوانزي' },
  { iata: 'TRE', icao: 'EGPU', slug: 'tiree-airport',              country: 'GB', city: 'Tiree',       tz: UK_TIMEZONE, lat: 56.4992, lon: -6.8692, en: 'Tiree Airport',                    ar: 'مطار تيري' },
];

function descriptionEn(name, iata, city) {
  return `${name} (${iata}) serves ${city} and the surrounding region. Book premium airport services — fast track, meet & greet, and lounge access — for arrivals, departures, and connections.`;
}

function descriptionAr(name, iata) {
  return `${name} (${iata}). احجز الخدمات المتميزة في المطار — المسار السريع والاستقبال والوداع ودخول الصالات — للوصول والمغادرة والترانزيت.`;
}

async function main() {
  const now = new Date();
  const summary = { upserted: 0, skipped: 0 };

  for (const a of AIRPORTS) {
    const existingBySlug = await prisma.airport.findUnique({ where: { slug: a.slug }, select: { id: true, iataCode: true } });
    const existingByIata = await prisma.airport.findUnique({ where: { iataCode: a.iata }, select: { id: true, slug: true } });

    if (existingByIata) {
      summary.skipped += 1;
      console.log(`skip: ${a.iata} already exists at slug=${existingByIata.slug}`);
      continue;
    }
    if (existingBySlug) {
      summary.skipped += 1;
      console.log(`skip: slug ${a.slug} already taken by IATA=${existingBySlug.iataCode}`);
      continue;
    }

    await prisma.airport.create({
      data: {
        iataCode: a.iata,
        icaoCode: a.icao,
        slug: a.slug,
        country: a.country,
        city: a.city,
        timezone: a.tz,
        latitude: a.lat,
        longitude: a.lon,
        status: 'active',
        publishedAt: now,
        translations: {
          create: [
            { locale: 'en', name: a.en, description: descriptionEn(a.en, a.iata, a.city) },
            { locale: 'ar', name: a.ar, description: descriptionAr(a.ar, a.iata) },
          ],
        },
      },
    });
    summary.upserted += 1;
    console.log(`created: ${a.iata}  ${a.en}`);
  }

  console.log('\n' + JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

await main();
