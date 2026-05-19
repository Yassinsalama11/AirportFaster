import Link from 'next/link';

interface AirportTranslation {
  locale: string;
  name: string;
}

interface AirportService {
  isActive: boolean;
}

interface AirportImage {
  url: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

interface Airport {
  id: string;
  iataCode: string;
  slug: string;
  city: string;
  country: string;
  translations: AirportTranslation[];
  images?: AirportImage[];
  airportServices: AirportService[];
}

const COUNTRY_FLAG: Record<string, string> = {
  AE: '🇦🇪', GB: '🇬🇧', US: '🇺🇸', SA: '🇸🇦', QA: '🇶🇦',
  KW: '🇰🇼', BH: '🇧🇭', OM: '🇴🇲', EG: '🇪🇬', JO: '🇯🇴',
  TR: '🇹🇷', DE: '🇩🇪', FR: '🇫🇷', NL: '🇳🇱', SG: '🇸🇬',
  TH: '🇹🇭', IN: '🇮🇳', PK: '🇵🇰', MY: '🇲🇾', AU: '🇦🇺',
};

function getLocalizedName(translations: AirportTranslation[], locale: string) {
  return translations.find((t) => t.locale === locale)?.name
    ?? translations.find((t) => t.locale === 'en')?.name
    ?? 'Airport';
}

function getPrimaryAirportImage(images: AirportImage[] | undefined): string | undefined {
  return [...(images ?? [])].sort((a, b) => {
    if ((a.isPrimary ?? false) !== (b.isPrimary ?? false)) {
      return a.isPrimary ? -1 : 1;
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  })[0]?.url;
}

export function AirportCard({
  airport,
  locale,
  servicesLabel,
}: {
  airport: Airport;
  locale: string;
  servicesLabel: string;
}) {
  const flag = COUNTRY_FLAG[airport.country] ?? '';
  const imageUrl = getPrimaryAirportImage(airport.images);

  return (
    <Link
      href={`/airports/${airport.slug}`}
      className="bg-surface border border-line shadow-popover rounded-2xl group block rounded-[26px] overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand-gold/30 hover:shadow-gold"
    >
      <div className="relative aspect-[16/10] bg-surface-2">
        {imageUrl ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url("${imageUrl}")` }}
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 img-placeholder-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 inline-flex rounded-full bg-white/95 px-2.5 py-1 font-mono text-sm font-bold text-ink">
          {airport.iataCode}
        </span>
        <span className="absolute right-4 top-4 text-lg" title={airport.country}>
          {flag}
        </span>
      </div>
      <div className="p-6">
        <h3 className="font-semibold text-ink group-hover:text-brand-gold transition-colors truncate">
          {getLocalizedName(airport.translations, locale)}
        </h3>
        <p className="text-sm text-ink-3 mt-1">{airport.city}, {airport.country}</p>
        <p className="text-xs text-ink-3 mt-3">
          {servicesLabel}
        </p>
      </div>
    </Link>
  );
}
