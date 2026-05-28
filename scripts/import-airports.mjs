import { readFileSync, existsSync } from 'node:fs';

const dbModulePath = process.env.AIRPORTFASTER_DB_MODULE ?? '../packages/db/dist/index.js';
const { prisma } = await import(dbModulePath);

const SERVICE_DEFINITIONS = [
  {
    slugs: ['fast_track', 'fast-track'],
    canonicalSlug: 'fast_track',
    icon: 'zap',
    sortOrder: 1,
    en: ['Fast Track', 'Skip the security queue with dedicated fast-track lanes.'],
    ar: ['المسار السريع', 'تجاوز طوابير المطار عبر مسارات مخصصة وسريعة.'],
  },
  {
    slugs: ['meet_and_greet', 'meet-and-greet'],
    canonicalSlug: 'meet_and_greet',
    icon: 'handshake',
    sortOrder: 2,
    en: ['Meet & Greet', 'Personal airport assistance from arrival to departure.'],
    ar: ['الاستقبال والتوديع', 'مساعدة شخصية داخل المطار من الوصول إلى المغادرة.'],
  },
  {
    slugs: ['lounge_access', 'lounge-access'],
    canonicalSlug: 'lounge_access',
    icon: 'sofa',
    sortOrder: 3,
    en: ['Lounge Access', 'Relax in premium airport lounges before your flight.'],
    ar: ['دخول الصالة', 'استمتع بالراحة في صالات المطار المميزة قبل رحلتك.'],
  },
];

const AIRPORTS = [
  ['MEL', 'Melbourne Airport', 'Melbourne', 'AU', 'Australia', 'أستراليا', 'ملبورن', 'Australia/Melbourne'],
  ['SYD', 'Sydney International Airport', 'Sydney', 'AU', 'Australia', 'أستراليا', 'سيدني', 'Australia/Sydney'],
  ['ADL', 'Adelaide International Airport', 'Adelaide', 'AU', 'Australia', 'أستراليا', 'أديلايد', 'Australia/Adelaide'],
  ['DRW', 'Darwin International Airport', 'Darwin', 'AU', 'Australia', 'أستراليا', 'داروين', 'Australia/Darwin'],
  ['SCL', 'Arturo Merino Benitez International Airport', 'Santiago', 'CL', 'Chile', 'تشيلي', 'سانتياغو', 'America/Santiago'],
  ['ABJ', 'Abidjan Port Bouet International Airport', 'Abidjan', 'CI', "Côte d'Ivoire", 'كوت ديفوار', 'أبيدجان', 'Africa/Abidjan'],
  ['LCA', 'Larnaca International Airport', 'Larnaca', 'CY', 'Cyprus', 'قبرص', 'لارنكا', 'Asia/Nicosia'],
  ['CPH', 'Copenhagen Kastrup Airport', 'Copenhagen', 'DK', 'Denmark', 'الدنمارك', 'كوبنهاغن', 'Europe/Copenhagen'],
  ['RMF', 'Marsa Alam International Airport', 'Marsa Alam', 'EG', 'Egypt', 'مصر', 'مرسى علم', 'Africa/Cairo'],
  ['SSH', 'Sharm El-Sheikh International Airport', 'Sharm El-Sheikh', 'EG', 'Egypt', 'مصر', 'شرم الشيخ', 'Africa/Cairo'],
  ['HBE', 'Borg El Arab International Airport', 'Alexandria', 'EG', 'Egypt', 'مصر', 'الإسكندرية', 'Africa/Cairo'],
  ['HRG', 'Hurghada International Airport', 'Hurghada', 'EG', 'Egypt', 'مصر', 'الغردقة', 'Africa/Cairo'],
  ['SPX', 'Sphinx International Airport', 'Giza', 'EG', 'Egypt', 'مصر', 'الجيزة', 'Africa/Cairo'],
  ['CAI', 'Cairo International Airport', 'Cairo', 'EG', 'Egypt', 'مصر', 'القاهرة', 'Africa/Cairo'],
  ['LXR', 'Luxor International Airport', 'Luxor', 'EG', 'Egypt', 'مصر', 'الأقصر', 'Africa/Cairo'],
  ['DBB', 'El Alamein International Airport', 'El Alamein', 'EG', 'Egypt', 'مصر', 'العلمين', 'Africa/Cairo'],
  ['ASW', 'Aswan International Airport', 'Aswan', 'EG', 'Egypt', 'مصر', 'أسوان', 'Africa/Cairo'],
  ['BOD', 'Bordeaux Airport', 'Bordeaux', 'FR', 'France', 'فرنسا', 'بوردو', 'Europe/Paris'],
  ['CDG', 'Charles de Gaulle International Airport', 'Paris', 'FR', 'France', 'فرنسا', 'باريس', 'Europe/Paris'],
  ['LYS', 'Lyon Airport', 'Lyon', 'FR', 'France', 'فرنسا', 'ليون', 'Europe/Paris'],
  ['MRS', 'Marseille Provence Airport', 'Marseille', 'FR', 'France', 'فرنسا', 'مرسيليا', 'Europe/Paris'],
  ['MPL', 'Montpellier Airport', 'Montpellier', 'FR', 'France', 'فرنسا', 'مونبلييه', 'Europe/Paris'],
  ['NCE', "Nice Cote d'Azur Airport", 'Nice', 'FR', 'France', 'فرنسا', 'نيس', 'Europe/Paris'],
  ['ORY', 'Paris Orly Airport', 'Paris', 'FR', 'France', 'فرنسا', 'باريس', 'Europe/Paris'],
  ['BUS', 'Batumi International Airport', 'Batumi', 'GE', 'Georgia', 'جورجيا', 'باتومي', 'Asia/Tbilisi'],
  ['TBS', 'Tbilisi International Airport', 'Tbilisi', 'GE', 'Georgia', 'جورجيا', 'تبليسي', 'Asia/Tbilisi'],
  ['FRA', 'Frankfurt International Airport', 'Frankfurt', 'DE', 'Germany', 'ألمانيا', 'فرانكفورت', 'Europe/Berlin'],
  ['MUC', 'Munich International Airport', 'Munich', 'DE', 'Germany', 'ألمانيا', 'ميونخ', 'Europe/Berlin'],
  ['BER', 'Berlin Brandenburg Airport', 'Berlin', 'DE', 'Germany', 'ألمانيا', 'برلين', 'Europe/Berlin'],
  ['BHX', 'Birmingham Airport', 'Birmingham', 'GB', 'United Kingdom', 'المملكة المتحدة', 'برمنغهام', 'Europe/London'],
  ['BOH', 'Bournemouth Airport', 'Bournemouth', 'GB', 'United Kingdom', 'المملكة المتحدة', 'بورنموث', 'Europe/London'],
  ['CWL', 'Cardiff Airport', 'Cardiff', 'GB', 'United Kingdom', 'المملكة المتحدة', 'كارديف', 'Europe/London'],
  ['DSA', 'Doncaster Sheffield Airport', 'Doncaster', 'GB', 'United Kingdom', 'المملكة المتحدة', 'دونكاستر', 'Europe/London'],
  ['EMA', 'East Midlands Airport', 'Castle Donington', 'GB', 'United Kingdom', 'المملكة المتحدة', 'إيست مدلاندز', 'Europe/London'],
  ['EXT', 'Exeter Airport', 'Exeter', 'GB', 'United Kingdom', 'المملكة المتحدة', 'إكستر', 'Europe/London'],
  ['HUY', 'Humberside Airport', 'Humberside', 'GB', 'United Kingdom', 'المملكة المتحدة', 'هامبرسايد', 'Europe/London'],
  ['INV', 'Inverness Airport', 'Inverness', 'GB', 'United Kingdom', 'المملكة المتحدة', 'إنفرنيس', 'Europe/London'],
  ['LBA', 'Leeds Bradford Airport', 'Leeds', 'GB', 'United Kingdom', 'المملكة المتحدة', 'ليدز', 'Europe/London'],
  ['LCY', 'London City Airport', 'London', 'GB', 'United Kingdom', 'المملكة المتحدة', 'لندن', 'Europe/London'],
  ['LHR', 'Heathrow Airport', 'London', 'GB', 'United Kingdom', 'المملكة المتحدة', 'لندن', 'Europe/London'],
  ['LPL', 'Liverpool John Lennon Airport', 'Liverpool', 'GB', 'United Kingdom', 'المملكة المتحدة', 'ليفربول', 'Europe/London'],
  ['MME', 'Teesside International Airport', 'Teesside', 'GB', 'United Kingdom', 'المملكة المتحدة', 'تيسايد', 'Europe/London'],
  ['NCL', 'Newcastle International Airport', 'Newcastle upon Tyne', 'GB', 'United Kingdom', 'المملكة المتحدة', 'نيوكاسل', 'Europe/London'],
  ['NWI', 'Norwich Airport', 'Norwich', 'GB', 'United Kingdom', 'المملكة المتحدة', 'نورويتش', 'Europe/London'],
  ['PIK', 'Glasgow Prestwick Airport', 'Prestwick', 'GB', 'United Kingdom', 'المملكة المتحدة', 'بريستويك', 'Europe/London'],
  ['PLY', 'Plymouth City Airport', 'Plymouth', 'GB', 'United Kingdom', 'المملكة المتحدة', 'بليموث', 'Europe/London'],
  ['SOU', 'Southampton Airport', 'Southampton', 'GB', 'United Kingdom', 'المملكة المتحدة', 'ساوثهامبتون', 'Europe/London'],
  ['STN', 'London Stansted Airport', 'London', 'GB', 'United Kingdom', 'المملكة المتحدة', 'لندن', 'Europe/London'],
  ['SWS', 'Swansea Airport', 'Swansea', 'GB', 'United Kingdom', 'المملكة المتحدة', 'سوانزي', 'Europe/London'],
  ['TRE', 'Tiree Airport', 'Tiree', 'GB', 'United Kingdom', 'المملكة المتحدة', 'تيري', 'Europe/London'],
  ['IOM', 'Isle of Man Airport', 'Castletown', 'IM', 'Isle of Man', 'جزيرة مان', 'كاسلتاون', 'Europe/Isle_of_Man'],
  ['JER', 'Jersey Airport', 'Saint Peter', 'JE', 'Jersey', 'جيرسي', 'سانت بيتر', 'Europe/Jersey'],
  ['ACC', 'Kotoka International Airport', 'Accra', 'GH', 'Ghana', 'غانا', 'أكرا', 'Africa/Accra'],
  ['CNN', 'Kannur International Airport', 'Kannur', 'IN', 'India', 'الهند', 'كانور', 'Asia/Kolkata'],
  ['BLR', 'Kempegowda International Airport', 'Bangalore', 'IN', 'India', 'الهند', 'بنغالورو', 'Asia/Kolkata'],
  ['BGW', 'Baghdad International Airport', 'Baghdad', 'IQ', 'Iraq', 'العراق', 'بغداد', 'Asia/Baghdad'],
  ['NAP', 'Naples International Airport', 'Naples', 'IT', 'Italy', 'إيطاليا', 'نابولي', 'Europe/Rome'],
  ['MXP', 'Milan Malpensa Airport', 'Milan', 'IT', 'Italy', 'إيطاليا', 'ميلانو', 'Europe/Rome'],
  ['AQJ', 'King Hussein International Airport', 'Aqaba', 'JO', 'Jordan', 'الأردن', 'العقبة', 'Asia/Amman'],
  ['KWI', 'Kuwait International Airport', 'Kuwait', 'KW', 'Kuwait', 'الكويت', 'الكويت', 'Asia/Kuwait'],
  ['MFM', 'Macau International Airport', 'Macau', 'MO', 'Macau', 'ماكاو', 'ماكاو', 'Asia/Macau'],
  ['BKI', 'Kota Kinabalu International Airport', 'Kota Kinabalu', 'MY', 'Malaysia', 'ماليزيا', 'كوتا كينابالو', 'Asia/Kuching'],
  ['KCH', 'Kuching International Airport', 'Kuching', 'MY', 'Malaysia', 'ماليزيا', 'كوتشينغ', 'Asia/Kuching'],
  ['LGK', 'Langkawi International Airport', 'Langkawi', 'MY', 'Malaysia', 'ماليزيا', 'لانكاوي', 'Asia/Kuala_Lumpur'],
  ['AGA', 'Agadir Al Massira Airport', 'Agadir', 'MA', 'Morocco', 'المغرب', 'أكادير', 'Africa/Casablanca'],
  ['FEZ', 'Fes-Saiss Airport', 'Fes', 'MA', 'Morocco', 'المغرب', 'فاس', 'Africa/Casablanca'],
  ['RAK', 'Marrakesh Menara Airport', 'Marrakesh', 'MA', 'Morocco', 'المغرب', 'مراكش', 'Africa/Casablanca'],
  ['CMN', 'Mohammed V International Airport', 'Casablanca', 'MA', 'Morocco', 'المغرب', 'الدار البيضاء', 'Africa/Casablanca'],
  ['OUD', 'Oujda Angads Airport', 'Oujda', 'MA', 'Morocco', 'المغرب', 'وجدة', 'Africa/Casablanca'],
  ['RBA', 'Rabat-Sale Airport', 'Sale', 'MA', 'Morocco', 'المغرب', 'سلا', 'Africa/Casablanca'],
  ['TNG', 'Tangier Ibn Battouta Airport', 'Tangier', 'MA', 'Morocco', 'المغرب', 'طنجة', 'Africa/Casablanca'],
  ['VIL', 'Dakhla Airport', 'Dakhla', 'MA', 'Morocco', 'المغرب', 'الداخلة', 'Africa/Casablanca'],
  ['EUN', 'Hassan I Airport', 'Laayoune', 'MA', 'Morocco', 'المغرب', 'العيون', 'Africa/Casablanca'],
  ['MPM', 'Maputo International Airport', 'Maputo', 'MZ', 'Mozambique', 'موزمبيق', 'مابوتو', 'Africa/Maputo'],
  ['AMS', 'Amsterdam Airport Schiphol', 'Amsterdam', 'NL', 'Netherlands', 'هولندا', 'أمستردام', 'Europe/Amsterdam'],
  ['AKL', 'Auckland International Airport', 'Auckland', 'NZ', 'New Zealand', 'نيوزيلندا', 'أوكلاند', 'Pacific/Auckland'],
  ['CHC', 'Christchurch International Airport', 'Christchurch', 'NZ', 'New Zealand', 'نيوزيلندا', 'كرايستشرش', 'Pacific/Auckland'],
  ['NPE', 'Hawke Bay Airport', 'Napier', 'NZ', 'New Zealand', 'نيوزيلندا', 'نابير', 'Pacific/Auckland'],
  ['NSN', 'Nelson Airport', 'Nelson', 'NZ', 'New Zealand', 'نيوزيلندا', 'نيلسون', 'Pacific/Auckland'],
  ['NPL', 'New Plymouth Airport', 'New Plymouth', 'NZ', 'New Zealand', 'نيوزيلندا', 'نيو بلايموث', 'Pacific/Auckland'],
  ['PMR', 'Palmerston North Airport', 'Palmerston North', 'NZ', 'New Zealand', 'نيوزيلندا', 'بالمرستون نورث', 'Pacific/Auckland'],
  ['ZQN', 'Queenstown Airport', 'Queenstown', 'NZ', 'New Zealand', 'نيوزيلندا', 'كوينزتاون', 'Pacific/Auckland'],
  ['WLG', 'Wellington International Airport', 'Wellington', 'NZ', 'New Zealand', 'نيوزيلندا', 'ويلينغتون', 'Pacific/Auckland'],
  ['ABV', 'Nnamdi Azikiwe International Airport', 'Abuja', 'NG', 'Nigeria', 'نيجيريا', 'أبوجا', 'Africa/Lagos'],
  ['BEY', 'Beirut-Rafic Hariri International Airport', 'Beirut', 'LB', 'Lebanon', 'لبنان', 'بيروت', 'Asia/Beirut'],
  ['MCT', 'Muscat International Airport', 'Muscat', 'OM', 'Oman', 'عُمان', 'مسقط', 'Asia/Muscat'],
  ['LIS', 'Lisbon International Airport', 'Lisbon', 'PT', 'Portugal', 'البرتغال', 'لشبونة', 'Europe/Lisbon'],
  ['DOH', 'Hamad International Airport', 'Doha', 'QA', 'Qatar', 'قطر', 'الدوحة', 'Asia/Qatar'],
  ['KGL', 'Kigali International Airport', 'Kigali', 'RW', 'Rwanda', 'رواندا', 'كيغالي', 'Africa/Kigali'],
  ['SVO', 'Sheremetyevo International Airport', 'Moscow', 'RU', 'Russia', 'روسيا', 'موسكو', 'Europe/Moscow'],
  ['DME', 'Domodedovo International Airport', 'Moscow', 'RU', 'Russia', 'روسيا', 'موسكو', 'Europe/Moscow'],
  ['VKO', 'Vnukovo International Airport', 'Moscow', 'RU', 'Russia', 'روسيا', 'موسكو', 'Europe/Moscow'],
  ['CPT', 'Cape Town International Airport', 'Cape Town', 'ZA', 'South Africa', 'جنوب أفريقيا', 'كيب تاون', 'Africa/Johannesburg'],
  ['BCN', 'Josep Tarradellas Barcelona-El Prat Airport', 'Barcelona', 'ES', 'Spain', 'إسبانيا', 'برشلونة', 'Europe/Madrid'],
  ['MAD', 'Adolfo Suarez Madrid-Barajas Airport', 'Madrid', 'ES', 'Spain', 'إسبانيا', 'مدريد', 'Europe/Madrid'],
  ['GVA', 'Geneva Airport', 'Geneva', 'CH', 'Switzerland', 'سويسرا', 'جنيف', 'Europe/Zurich'],
  ['ZRH', 'Zurich Airport', 'Zurich', 'CH', 'Switzerland', 'سويسرا', 'زيورخ', 'Europe/Zurich'],
  ['ESB', 'Ankara Esenboga Airport', 'Ankara', 'TR', 'Turkey', 'تركيا', 'أنقرة', 'Europe/Istanbul'],
  ['BJV', 'Milas-Bodrum Airport', 'Bodrum', 'TR', 'Turkey', 'تركيا', 'بودروم', 'Europe/Istanbul'],
  ['ADB', 'Izmir Adnan Menderes Airport', 'Izmir', 'TR', 'Turkey', 'تركيا', 'إزمير', 'Europe/Istanbul'],
  ['IST', 'Istanbul Airport', 'Istanbul', 'TR', 'Turkey', 'تركيا', 'إسطنبول', 'Europe/Istanbul'],
  ['SAW', 'Istanbul Sabiha Gokcen International Airport', 'Istanbul', 'TR', 'Turkey', 'تركيا', 'إسطنبول', 'Europe/Istanbul'],
  ['TZX', 'Trabzon Airport', 'Trabzon', 'TR', 'Turkey', 'تركيا', 'طرابزون', 'Europe/Istanbul'],
  ['NAV', 'Nevsehir Kapadokya Airport', 'Nevsehir', 'TR', 'Turkey', 'تركيا', 'نوشهر', 'Europe/Istanbul'],
  ['DLM', 'Dalaman Airport', 'Dalaman', 'TR', 'Turkey', 'تركيا', 'دالامان', 'Europe/Istanbul'],
  ['AYT', 'Antalya Airport', 'Antalya', 'TR', 'Turkey', 'تركيا', 'أنطاليا', 'Europe/Istanbul'],
  ['NBE', 'Enfidha-Hammamet International Airport', 'Enfidha', 'TN', 'Tunisia', 'تونس', 'النفيضة', 'Africa/Tunis'],
  ['MIR', 'Monastir Habib Bourguiba International Airport', 'Monastir', 'TN', 'Tunisia', 'تونس', 'المنستير', 'Africa/Tunis'],
].map(([iataCode, name, city, country, countryName, countryNameAr, cityAr, timezone]) => ({
  iataCode,
  name,
  city,
  country,
  countryName,
  countryNameAr,
  cityAr,
  timezone,
}));

const DRY_RUN = process.argv.includes('--dry-run');
const AIRPORTS_CSV = process.env.OURAIRPORTS_CSV ?? '/tmp/ourairports.csv';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://airportfaster.com';
const SUPPLIER_NAME = process.env.SUPPLIER_NAME ?? 'Cairo Airport Fast Track';

const EMBEDDED_METADATA = {
  "MEL": {"icaoCode":"YMML","latitude":-37.670732,"longitude":144.837898,"officialName":"Melbourne Airport"},
  "SYD": {"icaoCode":"YSSY","latitude":-33.946098,"longitude":151.177002,"officialName":"Sydney Kingsford Smith International Airport"},
  "ADL": {"icaoCode":"YPAD","latitude":-34.947512,"longitude":138.533393,"officialName":"Adelaide International Airport"},
  "DRW": {"icaoCode":"YPDN","latitude":-12.41497,"longitude":130.88185,"officialName":"Darwin International Airport / RAAF Darwin"},
  "SCL": {"icaoCode":"SCEL","latitude":-33.393001556396484,"longitude":-70.78579711914062,"officialName":"Comodoro Arturo Merino Benítez International Airport"},
  "ABJ": {"icaoCode":"DIAP","latitude":5.26139,"longitude":-3.92629,"officialName":"Félix-Houphouët-Boigny International Airport"},
  "LCA": {"icaoCode":"LCLK","latitude":34.875099,"longitude":33.624901,"officialName":"Larnaca International Airport"},
  "CPH": {"icaoCode":"EKCH","latitude":55.617900848389,"longitude":12.656000137329,"officialName":"Copenhagen Kastrup Airport"},
  "RMF": {"icaoCode":"HEMA","latitude":25.555548,"longitude":34.59245,"officialName":"Marsa Alam International Airport"},
  "SSH": {"icaoCode":"HESH","latitude":27.977272,"longitude":34.394717,"officialName":"Sharm El Sheikh International Airport"},
  "HBE": {"icaoCode":"HEAX","latitude":30.93249,"longitude":29.696437,"officialName":"Alexandria International Airport"},
  "HRG": {"icaoCode":"HEGN","latitude":27.176776,"longitude":33.796692,"officialName":"Hurghada International Airport"},
  "SPX": {"icaoCode":"HESX","latitude":30.108179,"longitude":30.895728,"officialName":"Sphinx International Airport"},
  "CAI": {"icaoCode":"HECA","latitude":30.111534,"longitude":31.396694,"officialName":"Cairo International Airport"},
  "LXR": {"icaoCode":"HELX","latitude":25.671018,"longitude":32.706446,"officialName":"Luxor International Airport"},
  "DBB": {"icaoCode":"HEAL","latitude":30.924324,"longitude":28.46161,"officialName":"El Alamein International Airport"},
  "ASW": {"icaoCode":"HESN","latitude":23.961075,"longitude":32.820382,"officialName":"Aswan International Airport"},
  "BOD": {"icaoCode":"LFBD","latitude":44.82865,"longitude":-0.715356,"officialName":"Bordeaux–Mérignac Airport"},
  "CDG": {"icaoCode":"LFPG","latitude":49.00896,"longitude":2.554117,"officialName":"Charles de Gaulle International Airport"},
  "LYS": {"icaoCode":"LFLL","latitude":45.725996,"longitude":5.090139,"officialName":"Lyon Saint-Exupéry Airport"},
  "MRS": {"icaoCode":"LFML","latitude":43.438088,"longitude":5.2125,"officialName":"Marseille Provence Airport"},
  "MPL": {"icaoCode":"LFMT","latitude":43.576199,"longitude":3.96301,"officialName":"Montpellier-Méditerranée Airport"},
  "NCE": {"icaoCode":"LFMN","latitude":43.658401,"longitude":7.21587,"officialName":"Nice-Côte d'Azur Airport"},
  "ORY": {"icaoCode":"LFPO","latitude":48.729499,"longitude":2.358963,"officialName":"Paris-Orly Airport"},
  "BUS": {"icaoCode":"UGSB","latitude":41.60939,"longitude":41.600315,"officialName":"Alexander Kartveli Batumi International Airport"},
  "TBS": {"icaoCode":"UGTB","latitude":41.669201,"longitude":44.9547,"officialName":"Tbilisi International Airport"},
  "FRA": {"icaoCode":"EDDF","latitude":50.026706,"longitude":8.55835,"officialName":"Frankfurt Main Airport"},
  "MUC": {"icaoCode":"EDDM","latitude":48.353802,"longitude":11.7861,"officialName":"Munich Airport"},
  "BER": {"icaoCode":"EDDB","latitude":52.361738,"longitude":13.502341,"officialName":"Berlin Brandenburg Airport"},
  "BHX": {"icaoCode":"EGBB","latitude":52.453899,"longitude":-1.74803,"officialName":"Birmingham Airport"},
  "BOH": {"icaoCode":"EGHH","latitude":50.779999,"longitude":-1.8425,"officialName":"Bournemouth Airport"},
  "CWL": {"icaoCode":"EGFF","latitude":51.396702,"longitude":-3.34333,"officialName":"Cardiff Airport"},
  "DSA": {"icaoCode":"EGCN","latitude":53.474722,"longitude":-1.004444,"officialName":"Doncaster Sheffield Airport"},
  "EMA": {"icaoCode":"EGNX","latitude":52.8311,"longitude":-1.32806,"officialName":"East Midlands Airport"},
  "EXT": {"icaoCode":"EGTE","latitude":50.734402,"longitude":-3.41389,"officialName":"Exeter International Airport"},
  "HUY": {"icaoCode":"EGNJ","latitude":53.574401,"longitude":-0.350833,"officialName":"Humberside Airport"},
  "INV": {"icaoCode":"EGPE","latitude":57.5425,"longitude":-4.0475,"officialName":"Inverness Airport"},
  "LBA": {"icaoCode":"EGNM","latitude":53.865898,"longitude":-1.66057,"officialName":"Leeds Bradford Airport"},
  "LCY": {"icaoCode":"EGLC","latitude":51.505299,"longitude":0.055278,"officialName":"London City Airport"},
  "LHR": {"icaoCode":"EGLL","latitude":51.4706,"longitude":-0.461941,"officialName":"Heathrow Airport"},
  "LPL": {"icaoCode":"EGGP","latitude":53.333599,"longitude":-2.84972,"officialName":"Liverpool John Lennon Airport"},
  "MME": {"icaoCode":"EGNV","latitude":54.509201,"longitude":-1.42941,"officialName":"Teesside International Airport"},
  "NCL": {"icaoCode":"EGNT","latitude":55.037498,"longitude":-1.69167,"officialName":"Newcastle International Airport"},
  "NWI": {"icaoCode":"EGSH","latitude":52.6758,"longitude":1.28278,"officialName":"Norwich Airport"},
  "PIK": {"icaoCode":"EGPK","latitude":55.509399,"longitude":-4.58667,"officialName":"Glasgow Prestwick Airport"},
  "PLY": {"icaoCode":"EGHD","latitude":50.422798,"longitude":-4.10583,"officialName":"Plymouth City Airport"},
  "SOU": {"icaoCode":"EGHI","latitude":50.950298,"longitude":-1.3568,"officialName":"Southampton Airport"},
  "STN": {"icaoCode":"EGSS","latitude":51.884998,"longitude":0.235,"officialName":"London Stansted Airport"},
  "SWS": {"icaoCode":"EGFH","latitude":51.605301,"longitude":-4.06783,"officialName":"Swansea Airport"},
  "TRE": {"icaoCode":"EGPU","latitude":56.499199,"longitude":-6.86917,"officialName":"Tiree Airport"},
  "IOM": {"icaoCode":"EGNS","latitude":54.083302,"longitude":-4.62389,"officialName":"Isle of Man Airport"},
  "JER": {"icaoCode":"EGJJ","latitude":49.207901,"longitude":-2.19551,"officialName":"Jersey Airport"},
  "ACC": {"icaoCode":"DGAA","latitude":5.605189800262451,"longitude":-0.16678600013256073,"officialName":"Kotoka International Airport"},
  "CNN": {"icaoCode":"VOKN","latitude":11.916343,"longitude":75.544979,"officialName":"Kannur International Airport"},
  "BLR": {"icaoCode":"VOBL","latitude":13.1979,"longitude":77.706299,"officialName":"Kempegowda International Airport Bengaluru"},
  "BGW": {"icaoCode":"ORBI","latitude":33.262501,"longitude":44.2346,"officialName":"Baghdad International Airport / New Al Muthana Air Base"},
  "NAP": {"icaoCode":"LIRN","latitude":40.886002,"longitude":14.2908,"officialName":"Naples International Airport"},
  "MXP": {"icaoCode":"LIMC","latitude":45.6306,"longitude":8.72811,"officialName":"Milan Malpensa International Airport"},
  "AQJ": {"icaoCode":"OJAQ","latitude":29.611601,"longitude":35.018101,"officialName":"King Hussein International Airport"},
  "KWI": {"icaoCode":"OKKK","latitude":29.224487,"longitude":47.969813,"officialName":"Kuwait International Airport"},
  "MFM": {"icaoCode":"VMMC","latitude":22.149599,"longitude":113.592003,"officialName":"Macau International Airport"},
  "BKI": {"icaoCode":"WBKK","latitude":5.932743,"longitude":116.049324,"officialName":"Kota Kinabalu International Airport"},
  "KCH": {"icaoCode":"WBGG","latitude":1.487364,"longitude":110.352859,"officialName":"Kuching International Airport"},
  "LGK": {"icaoCode":"WMKL","latitude":6.32973,"longitude":99.728699,"officialName":"Langkawi International Airport"},
  "AGA": {"icaoCode":"GMAD","latitude":30.322478,"longitude":-9.412003,"officialName":"Al Massira Airport"},
  "FEZ": {"icaoCode":"GMFF","latitude":33.927299,"longitude":-4.97796,"officialName":"Fes Saïss International Airport"},
  "RAK": {"icaoCode":"GMMX","latitude":31.604807,"longitude":-8.035788,"officialName":"Marrakesh Menara Airport"},
  "CMN": {"icaoCode":"GMMN","latitude":33.3675,"longitude":-7.58997,"officialName":"Mohammed V International Airport"},
  "OUD": {"icaoCode":"GMFO","latitude":34.789558,"longitude":-1.926041,"officialName":"Oujda Angads Airport"},
  "RBA": {"icaoCode":"GMME","latitude":34.051498,"longitude":-6.75152,"officialName":"Rabat-Salé Airport"},
  "TNG": {"icaoCode":"GMTT","latitude":35.731741,"longitude":-5.921459,"officialName":"Tangier Ibn Battuta Airport"},
  "VIL": {"icaoCode":"GMMH","latitude":23.7183,"longitude":-15.932,"officialName":"Dakhla Airport"},
  "EUN": {"icaoCode":"GMML","latitude":27.142467,"longitude":-13.224947,"officialName":"Laayoune Hassan I International Airport"},
  "MPM": {"icaoCode":"FQMA","latitude":-25.920799,"longitude":32.572601,"officialName":"Maputo Airport"},
  "AMS": {"icaoCode":"EHAM","latitude":52.308601,"longitude":4.76389,"officialName":"Amsterdam Airport Schiphol"},
  "AKL": {"icaoCode":"NZAA","latitude":-37.01199,"longitude":174.786331,"officialName":"Auckland International Airport"},
  "CHC": {"icaoCode":"NZCH","latitude":-43.489029,"longitude":172.532065,"officialName":"Christchurch International Airport"},
  "NPE": {"icaoCode":"NZNR","latitude":-39.465801,"longitude":176.869995,"officialName":"Hawke's Bay Airport"},
  "NSN": {"icaoCode":"NZNS","latitude":-41.298302,"longitude":173.220993,"officialName":"Nelson Airport"},
  "NPL": {"icaoCode":"NZNP","latitude":-39.00859832763672,"longitude":174.1790008544922,"officialName":"New Plymouth Airport"},
  "PMR": {"icaoCode":"NZPM","latitude":-40.320599,"longitude":175.617004,"officialName":"Palmerston North Airport"},
  "ZQN": {"icaoCode":"NZQN","latitude":-45.019205,"longitude":168.746379,"officialName":"Queenstown Airport"},
  "WLG": {"icaoCode":"NZWN","latitude":-41.326839,"longitude":174.806862,"officialName":"Wellington International Airport"},
  "ABV": {"icaoCode":"DNAA","latitude":9.00679,"longitude":7.26317,"officialName":"Nnamdi Azikiwe International Airport"},
  "BEY": {"icaoCode":"OLBA","latitude":33.819833,"longitude":35.487443,"officialName":"Beirut Rafic Hariri International Airport"},
  "MCT": {"icaoCode":"OOMS","latitude":23.600218,"longitude":58.285268,"officialName":"Muscat International Airport"},
  "LIS": {"icaoCode":"LPPT","latitude":38.7813,"longitude":-9.13592,"officialName":"Lisbon Humberto Delgado Airport"},
  "DOH": {"icaoCode":"OTHH","latitude":25.273056,"longitude":51.608056,"officialName":"Hamad International Airport"},
  "KGL": {"icaoCode":"HRYR","latitude":-1.96863,"longitude":30.1395,"officialName":"Kigali International Airport"},
  "SVO": {"icaoCode":"UUEE","latitude":55.976858,"longitude":37.41121,"officialName":"Sheremetyevo International Airport"},
  "DME": {"icaoCode":"UUDD","latitude":55.408798,"longitude":37.9063,"officialName":"Domodedovo International Airport"},
  "VKO": {"icaoCode":"UUWW","latitude":55.591499,"longitude":37.261501,"officialName":"Vnukovo International Airport"},
  "CPT": {"icaoCode":"FACT","latitude":-33.97403,"longitude":18.604333,"officialName":"Cape Town International Airport"},
  "BCN": {"icaoCode":"LEBL","latitude":41.2971,"longitude":2.07846,"officialName":"Josep Tarradellas Barcelona-El Prat Airport"},
  "MAD": {"icaoCode":"LEMD","latitude":40.493407,"longitude":-3.572249,"officialName":"Adolfo Suárez Madrid–Barajas Airport"},
  "GVA": {"icaoCode":"LSGG","latitude":46.238098,"longitude":6.10895,"officialName":"Geneva International Airport"},
  "ZRH": {"icaoCode":"LSZH","latitude":47.458056,"longitude":8.548056,"officialName":"Zürich Airport"},
  "ESB": {"icaoCode":"LTAC","latitude":40.128101,"longitude":32.995098,"officialName":"Esenboğa International Airport"},
  "BJV": {"icaoCode":"LTFE","latitude":37.249314,"longitude":27.66401,"officialName":"Milas Bodrum International Airport"},
  "ADB": {"icaoCode":"LTBJ","latitude":38.2924,"longitude":27.157,"officialName":"Adnan Menderes International Airport"},
  "IST": {"icaoCode":"LTFM","latitude":41.274874,"longitude":28.732136,"officialName":"İstanbul Airport"},
  "SAW": {"icaoCode":"LTFJ","latitude":40.898602,"longitude":29.3092,"officialName":"Istanbul Sabiha Gökçen International Airport"},
  "TZX": {"icaoCode":"LTCG","latitude":40.995098,"longitude":39.7897,"officialName":"Trabzon International Airport"},
  "NAV": {"icaoCode":"LTAZ","latitude":38.7719,"longitude":34.5345,"officialName":"Nevşehir Kapadokya Airport"},
  "DLM": {"icaoCode":"LTBS","latitude":36.7131,"longitude":28.7925,"officialName":"Dalaman International Airport"},
  "AYT": {"icaoCode":"LTAI","latitude":36.898701,"longitude":30.800501,"officialName":"Antalya International Airport"},
  "NBE": {"icaoCode":"DTNH","latitude":36.075833,"longitude":10.438611,"officialName":"Enfidha - Hammamet International Airport"},
  "MIR": {"icaoCode":"DTMB","latitude":35.75809860229492,"longitude":10.75469970703125,"officialName":"Monastir Habib Bourguiba International Airport"},
};

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function loadAirportMetadata() {
  const metadata = new Map(Object.entries(EMBEDDED_METADATA));
  if (!existsSync(AIRPORTS_CSV)) return metadata;
  const lines = readFileSync(AIRPORTS_CSV, 'utf8').trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() ?? '');
  const index = Object.fromEntries(headers.map((header, idx) => [header, idx]));
  const byIata = metadata;
  for (const line of lines) {
    const row = parseCsvLine(line);
    const iata = row[index.iata_code];
    if (!iata) continue;
    byIata.set(iata, {
      icaoCode: row[index.icao_code] || undefined,
      latitude: row[index.latitude_deg] ? Number(row[index.latitude_deg]) : undefined,
      longitude: row[index.longitude_deg] ? Number(row[index.longitude_deg]) : undefined,
      officialName: row[index.name] || undefined,
    });
  }
  return byIata;
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

async function uniqueSlug(name, iataCode, existingAirportId) {
  const base = slugify(name) || `${iataCode.toLowerCase()}-airport`;
  let slug = base;
  let suffix = 2;
  while (true) {
    const found = await prisma.airport.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === existingAirportId) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

function englishDescription(airport) {
  return `${airport.name} (${airport.iataCode}) serves ${airport.city}, ${airport.countryName}. AirportFaster enables premium airport services at this airport, including Fast Track, Meet & Greet, and Lounge Access where live supplier pricing is available.`;
}

function arabicDescription(airport) {
  return `${airport.name} (${airport.iataCode}) يخدم ${airport.cityAr} في ${airport.countryNameAr}. توفر AirportFaster خدمات مطار مميزة في هذا المطار، بما في ذلك المسار السريع والاستقبال والتوديع ودخول الصالة عند توفر الأسعار من الموردين.`;
}

function seoFor(airport, slug) {
  return {
    metaTitle: `Airport Services at ${airport.iataCode} | AirportFaster`,
    metaDescription: `Book Fast Track, Meet & Greet and Lounge Access at ${airport.name} (${airport.iataCode}) in ${airport.city}.`,
    ogTitle: `${airport.name} (${airport.iataCode}) Airport Services`,
    ogDescription: `Premium airport services at ${airport.name}: Fast Track, Meet & Greet and Lounge Access.`,
    canonicalUrl: `${BASE_URL}/en/airports/${slug}`,
    schemaJson: {
      '@context': 'https://schema.org',
      '@type': 'Airport',
      name: airport.name,
      iataCode: airport.iataCode,
      address: {
        '@type': 'PostalAddress',
        addressLocality: airport.city,
        addressCountry: airport.country,
      },
      url: `${BASE_URL}/en/airports/${slug}`,
    },
  };
}

async function resolveServices() {
  const services = [];
  for (const definition of SERVICE_DEFINITIONS) {
    let service = await prisma.service.findFirst({
      where: { slug: { in: definition.slugs } },
      include: { translations: true },
    });
    if (!service) {
      service = await prisma.service.create({
        data: {
          slug: definition.canonicalSlug,
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
        include: { translations: true },
      });
    } else if (service.status !== 'active') {
      service = await prisma.service.update({
        where: { id: service.id },
        data: { status: 'active', icon: service.icon ?? definition.icon, sortOrder: definition.sortOrder },
        include: { translations: true },
      });
    }
    for (const [locale, [name, description]] of [
      ['en', definition.en],
      ['ar', definition.ar],
    ]) {
      await prisma.serviceTranslation.upsert({
        where: { serviceId_locale: { serviceId: service.id, locale } },
        update: { name, description },
        create: { serviceId: service.id, locale, name, description },
      });
    }
    services.push(service);
  }
  return services;
}

async function main() {
  const metadataByIata = loadAirportMetadata();
  const services = await resolveServices();
  const supplier = await prisma.supplier.findFirst({
    where: { name: { equals: SUPPLIER_NAME, mode: 'insensitive' } },
    select: { id: true, name: true },
  });

  if (!supplier) {
    throw new Error(`Supplier not found: ${SUPPLIER_NAME}`);
  }

  const summary = {
    created: 0,
    updated: 0,
    airportServices: 0,
    supplierAirports: 0,
    supplierServices: 0,
    supplierCoverages: 0,
    missingMetadata: [],
  };

  if (DRY_RUN) {
    const existing = await prisma.airport.findMany({
      where: { iataCode: { in: AIRPORTS.map((airport) => airport.iataCode) } },
      select: { iataCode: true },
    });
    console.log(JSON.stringify({
      dryRun: true,
      requested: AIRPORTS.length,
      existing: existing.length,
      toCreate: AIRPORTS.length - existing.length,
      supplier: supplier.name,
      services: services.map((service) => service.slug),
      missingMetadata: AIRPORTS
        .filter((airport) => !metadataByIata.has(airport.iataCode))
        .map((airport) => airport.iataCode),
    }, null, 2));
    return;
  }

  for (const airport of AIRPORTS) {
    const meta = metadataByIata.get(airport.iataCode);
    if (!meta) summary.missingMetadata.push(airport.iataCode);

    const existing = await prisma.airport.findUnique({
      where: { iataCode: airport.iataCode },
      select: { id: true, slug: true },
    });
    const slug = existing?.slug ?? await uniqueSlug(airport.name, airport.iataCode);

    const savedAirport = await prisma.airport.upsert({
      where: { iataCode: airport.iataCode },
      update: {
        icaoCode: meta?.icaoCode,
        country: airport.country,
        city: airport.city,
        timezone: airport.timezone,
        latitude: meta?.latitude,
        longitude: meta?.longitude,
        status: 'active',
        publishedAt: new Date(),
      },
      create: {
        iataCode: airport.iataCode,
        icaoCode: meta?.icaoCode,
        slug,
        country: airport.country,
        city: airport.city,
        timezone: airport.timezone,
        latitude: meta?.latitude,
        longitude: meta?.longitude,
        status: 'active',
        publishedAt: new Date(),
      },
      select: { id: true, slug: true },
    });

    summary[existing ? 'updated' : 'created'] += 1;

    await prisma.airportTranslation.upsert({
      where: { airportId_locale: { airportId: savedAirport.id, locale: 'en' } },
      update: { name: airport.name, description: englishDescription(airport) },
      create: {
        airportId: savedAirport.id,
        locale: 'en',
        name: airport.name,
        description: englishDescription(airport),
      },
    });
    await prisma.airportTranslation.upsert({
      where: { airportId_locale: { airportId: savedAirport.id, locale: 'ar' } },
      update: { name: `مطار ${airport.cityAr}`, description: arabicDescription(airport) },
      create: {
        airportId: savedAirport.id,
        locale: 'ar',
        name: `مطار ${airport.cityAr}`,
        description: arabicDescription(airport),
      },
    });

    await prisma.airportSeo.upsert({
      where: { airportId: savedAirport.id },
      update: seoFor(airport, savedAirport.slug),
      create: { airportId: savedAirport.id, ...seoFor(airport, savedAirport.slug) },
    });

    await prisma.supplierAirport.upsert({
      where: { supplierId_airportId: { supplierId: supplier.id, airportId: savedAirport.id } },
      update: { status: 'active' },
      create: { supplierId: supplier.id, airportId: savedAirport.id, status: 'active' },
    });
    summary.supplierAirports += 1;

    for (const service of services) {
      await prisma.supplierService.upsert({
        where: { supplierId_serviceId: { supplierId: supplier.id, serviceId: service.id } },
        update: { status: 'active' },
        create: { supplierId: supplier.id, serviceId: service.id, status: 'active' },
      });
      summary.supplierServices += 1;

      const airportService = await prisma.airportService.upsert({
        where: { airportId_serviceId: { airportId: savedAirport.id, serviceId: service.id } },
        update: {
          isActive: true,
          minimumLeadHours: 2,
          maxLeadDays: 365,
          directionAvailable: 'both',
        },
        create: {
          airportId: savedAirport.id,
          serviceId: service.id,
          isActive: true,
          minimumLeadHours: 2,
          maxLeadDays: 365,
          directionAvailable: 'both',
        },
        select: { id: true },
      });
      summary.airportServices += 1;

      await prisma.supplierCoverage.upsert({
        where: {
          supplierId_airportServiceId: {
            supplierId: supplier.id,
            airportServiceId: airportService.id,
          },
        },
        update: { status: 'active' },
        create: {
          supplierId: supplier.id,
          airportServiceId: airportService.id,
          status: 'active',
          priority: 0,
        },
      });
      summary.supplierCoverages += 1;
    }
  }

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
