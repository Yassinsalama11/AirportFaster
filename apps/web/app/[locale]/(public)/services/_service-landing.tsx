import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SchemaScript } from '@/components/public/SchemaScript';
import { serviceSchema, breadcrumbSchema, faqSchema, howToSchema, speakableSchema } from '@/lib/schema';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

export type ServiceKey = 'fast_track' | 'meet_and_greet' | 'lounge_access';
export type ServiceSlug = 'fast-track' | 'meet-and-greet' | 'lounge-access';

interface AirportResult {
  id: string;
  iataCode: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  services: Array<{ id: string; slug: string; name: string; fromPriceMinorUnits: number; currency: string }>;
}

async function getAirports(slug: ServiceSlug): Promise<AirportResult[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/search?service=${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600, tags: ['airports', 'services'] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { success: boolean; data: { results: AirportResult[] } };
    return data.success ? data.data.results : [];
  } catch {
    return [];
  }
}

interface Props {
  slug: ServiceSlug;
  serviceKey: ServiceKey;
}

export async function ServiceLandingPage({ slug, serviceKey }: Props) {
  const airports = await getAirports(slug);

  const tPages = await getTranslations('service_pages');
  const tCommon = await getTranslations('common');

  const tFooter = await getTranslations('footer');
  const nameMap: Record<ServiceKey, string> = {
    fast_track: tFooter('fast_track'),
    meet_and_greet: tFooter('meet_greet'),
    lounge_access: tFooter('lounge_access'),
  };
  const name = nameMap[serviceKey];

  const howItWorks = [1, 2, 3].map((i) => ({
    step: String(i).padStart(2, '0'),
    title: tPages(`${serviceKey}.step${i}_title`),
    description: tPages(`${serviceKey}.step${i}_desc`),
  }));

  const faqs = [1, 2, 3, 4].map((i) => ({
    question: tPages(`${serviceKey}.faq${i}_q`),
    answer: tPages(`${serviceKey}.faq${i}_a`),
  }));

  const benefits = [1, 2, 3].map((i) => tPages(`${serviceKey}.benefit${i}`));
  const whatIs = tPages(`${serviceKey}.what_is`);

  const breadcrumb = breadcrumbSchema([
    { name: tCommon('home'), url: `${BASE_URL}/en` },
    { name: tPages('services_breadcrumb'), url: `${BASE_URL}/en/services` },
    { name, url: `${BASE_URL}/en/services/${slug}` },
  ]);
  const svcSchema = serviceSchema({ name, description: whatIs, slug });
  const faqSchemaData = faqSchema(faqs);
  const howToSchemaData = howToSchema({
    name: tPages('how_to_book_title', { name }),
    description: whatIs,
    steps: howItWorks.map((s) => ({ name: s.title, text: s.description })),
  });
  const speakable = speakableSchema(['.service-what-is', '.service-hero-intro', 'h1']);

  return (
    <>
      <SchemaScript schema={svcSchema} />
      <SchemaScript schema={breadcrumb} />
      <SchemaScript schema={faqSchemaData} />
      <SchemaScript schema={howToSchemaData} />
      <SchemaScript schema={speakable} />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">{tCommon('home')}</Link>
          <span>/</span>
          <Link href="/services" className="hover:text-ink transition-colors">{tPages('services_breadcrumb')}</Link>
          <span>/</span>
          <span className="text-ink">{name}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[36rem] h-[36rem] rounded-full bg-brand-gold/10 blur-3xl opacity-60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight mb-4">{name}</h1>
          <p className="service-hero-intro text-ink-2 text-lg max-w-2xl">
            {tPages('default.intro', { name })}
          </p>
        </div>
      </section>

      {/* What Is — direct answer block for featured snippets & AI */}
      <section className="border-t border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-bold text-ink mb-3">{tPages('what_is_title', { name })}</h2>
          <p className="service-what-is text-ink-2 leading-relaxed">{whatIs}</p>
          <ul className="mt-6 space-y-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-ink-2">
                <span className="mt-0.5 text-brand-gold-dark flex-shrink-0">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-surface-2 border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-ink mb-10">{tPages('how_to_book_title', { name })}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="bg-surface border border-line rounded-2xl p-6 shadow-card">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/15 text-brand-gold-dark text-sm font-bold mb-4">
                  {item.step}
                </span>
                <h3 className="font-semibold text-ink mb-2">{item.title}</h3>
                <p className="text-sm text-ink-2">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Airports Grid */}
      {airports.length > 0 && (
        <section className="border-b border-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-2xl font-bold text-ink mb-8">
              {tPages('airports_offering', { name })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {airports.map((airport) => {
                const svc = airport.services.find((s) => s.slug === slug);
                const priceDisplay = svc
                  ? `${tCommon('from')} €${(svc.fromPriceMinorUnits / 100).toFixed(0)}`
                  : null;
                return (
                  <div key={airport.id} className="bg-surface border border-line rounded-2xl p-6 shadow-card hover:shadow-card-hover hover:border-brand-gold/30 transition-all flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span dir="ltr" className="inline-flex px-2.5 py-1 bg-brand-gold/15 text-brand-gold-dark text-sm font-mono font-bold rounded">
                        {airport.iataCode}
                      </span>
                      <div>
                        <div className="font-semibold text-ink text-sm">{airport.name}</div>
                        <div className="text-xs text-ink-3">{airport.city}, {airport.country}</div>
                      </div>
                    </div>
                    {priceDisplay && (
                      <p className="text-brand-gold-dark text-sm font-medium" dir="ltr">{priceDisplay}</p>
                    )}
                    <Link
                      href={`/airports/${airport.slug}/${slug}`}
                      className="inline-flex items-center gap-1 text-sm text-brand-gold-dark hover:text-brand-gold font-medium transition-colors mt-auto"
                    >
                      {tPages('book_cta')} <span className="rtl:rotate-180">→</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-surface border-t border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-ink mb-8">{tPages('faqs_title')}</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="bg-surface-2 border border-line rounded-2xl">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-ink">{faq.question}</span>
                  <span className="text-brand-gold-dark ms-4 flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-ink-2 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
