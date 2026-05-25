import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Zap, Users, Armchair, Star, Shield, Plane } from 'lucide-react';
import { SchemaScript } from '@/components/public/SchemaScript';
import { breadcrumbSchema, itemListSchema } from '@/lib/schema';
import { localeAlternates, ogLocales } from '@/lib/seo';

export const revalidate = 3600;

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

interface ServiceTranslation { locale: string; name: string; description?: string; }
interface Service { id: string; slug: string; icon?: string; translations: ServiceTranslation[]; }

async function getServices(): Promise<Service[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/services`, {
      next: { revalidate: 3600, tags: ['services'] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { success: boolean; data: { services: Service[] } };
    return data.success ? data.data.services : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('services_list');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    openGraph: { title: t('meta_title'), description: t('meta_description'), url: `${BASE_URL}/${locale}/services`, ...ogLocales(locale) },
    alternates: localeAlternates('/services', locale),
  };
}

function ServiceIcon({ slug }: { slug: string }) {
  const s = slug.replace(/-/g, '_');
  if (s.includes('fast_track')) return <Zap className="w-7 h-7" />;
  if (s.includes('meet') || s.includes('greet')) return <Users className="w-7 h-7" />;
  if (s.includes('lounge') || s.includes('vip')) return <Armchair className="w-7 h-7" />;
  if (s.includes('security') || s.includes('premium')) return <Shield className="w-7 h-7" />;
  if (s.includes('transfer') || s.includes('flight')) return <Plane className="w-7 h-7" />;
  return <Star className="w-7 h-7" />;
}

export default async function ServicesDirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const services = await getServices();
  const t = await getTranslations('services_list');
  const tCommon = await getTranslations('common');

  const breadcrumb = breadcrumbSchema([
    { name: tCommon('home'), url: BASE_URL },
    { name: t('breadcrumb'), url: `${BASE_URL}/services` },
  ]);

  const serviceList = itemListSchema(
    services.map((service) => ({
      name:
        service.translations.find((tr) => tr.locale === 'en')?.name ??
        service.translations[0]?.name ??
        service.slug,
      url: `${BASE_URL}/en/services/${service.slug}`,
    })),
  );

  return (
    <>
      <SchemaScript schema={breadcrumb} />
      <SchemaScript schema={serviceList} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">{tCommon('home')}</Link>
          <span>/</span>
          <span className="text-ink">{t('breadcrumb')}</span>
        </nav>
      </div>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[36rem] h-[36rem] rounded-full bg-brand-gold/10 blur-3xl opacity-60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight mb-4">{t('hero_title')}</h1>
          <p className="text-ink-2 text-lg max-w-2xl">{t('hero_subtitle')}</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {services.length === 0 ? (
          <p className="text-ink-3">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => {
              const name =
                service.translations.find((tr) => tr.locale === locale)?.name ??
                service.translations.find((tr) => tr.locale === 'en')?.name ??
                service.slug;
              const description =
                service.translations.find((tr) => tr.locale === locale)?.description ??
                service.translations.find((tr) => tr.locale === 'en')?.description ?? '';
              return (
                <Link
                  key={service.id}
                  href={`/services/${service.slug}`}
                  className="block bg-surface border border-line rounded-2xl p-6 hover:border-brand-gold/30 hover:shadow-card-hover shadow-card transition-all flex flex-col"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-gold/15 text-brand-gold-dark mb-4">
                    <ServiceIcon slug={service.slug} />
                  </div>
                  <h2 className="text-lg font-semibold text-ink mb-2">{name}</h2>
                  {description && (
                    <p className="text-sm text-ink-2 mb-4 flex-1">{description}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-brand-gold-dark text-sm font-medium mt-auto">
                    {t('see_all_airports')} <span className="rtl:rotate-180">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-surface-2 border-t border-line">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-ink mb-4">{t('cta_title')}</h2>
          <p className="text-ink-2 mb-8">{t('cta_subtitle')}</p>
          <Link
            href="/airports"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-gold text-brand-black font-bold rounded-full hover:bg-brand-gold-light transition-colors"
          >
            {t('cta_button')} <span className="rtl:rotate-180">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
