import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SchemaScript } from '@/components/public/SchemaScript';
import { breadcrumbSchema } from '@/lib/schema';
import { localeAlternates, ogLocales } from '@/lib/seo';
import { ForBusinessForm } from './ForBusinessForm';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('for_business');
  const title = t('hero_title');
  const description = t('hero_subtitle');
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/for-business`,
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: title }],
      ...ogLocales(locale),
    },
    twitter: { card: 'summary_large_image', site: '@airportfaster', title, description },
    alternates: localeAlternates('/for-business', locale),
  };
}

export default async function ForBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('for_business');
  const tCommon = await getTranslations('common');

  const partnerTypes = [
    { titleKey: 'partner_airports_title', descKey: 'partner_airports_desc', icon: '✈️' },
    { titleKey: 'partner_airlines_title', descKey: 'partner_airlines_desc', icon: '🛫' },
    { titleKey: 'partner_corporate_title', descKey: 'partner_corporate_desc', icon: '💼' },
    { titleKey: 'partner_ota_title', descKey: 'partner_ota_desc', icon: '🌐' },
  ] as const;

  const stats = [
    { value: t('stat_bookings_value'), label: t('stat_bookings_label'), desc: t('stat_bookings_desc') },
    { value: t('stat_airports_value'), label: t('stat_airports_label'), desc: t('stat_airports_desc') },
    { value: t('stat_rating_value'), label: t('stat_rating_label'), desc: t('stat_rating_desc') },
  ];

  const breadcrumb = breadcrumbSchema([
    { name: tCommon('home'), url: `${BASE_URL}/${locale}` },
    { name: t('breadcrumb'), url: `${BASE_URL}/${locale}/for-business` },
  ]);

  return (
    <>
      <SchemaScript schema={breadcrumb} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">{tCommon('home')}</Link>
          <span>/</span>
          <span className="text-ink">{t('breadcrumb')}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[40rem] h-[40rem] rounded-full bg-brand-gold/10 blur-3xl opacity-60" />
          <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-100/40 blur-3xl opacity-60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
          <h1 className="text-4xl md:text-6xl font-bold text-ink tracking-tight mb-6 max-w-3xl">{t('hero_title')}</h1>
          <p className="text-ink-2 text-xl max-w-2xl mb-8">{t('hero_subtitle')}</p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-gold text-brand-black font-bold rounded-full hover:bg-brand-gold-light transition-colors text-base"
          >
            {t('hero_cta')} <span className="rtl:rotate-180">→</span>
          </a>
        </div>
      </section>

      {/* Partner Types */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-ink mb-12 text-center">{t('partners_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {partnerTypes.map((p) => (
            <div
              key={p.titleKey}
              className="bg-surface border border-line rounded-2xl p-8 shadow-card hover:shadow-card-hover hover:border-brand-gold/30 transition-all"
            >
              <div className="text-4xl mb-4">{p.icon}</div>
              <h3 className="text-xl font-semibold text-ink mb-3">{t(p.titleKey)}</h3>
              <p className="text-ink-2 leading-relaxed">{t(p.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why AirportFaster */}
      <section className="bg-surface-2 border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-3xl font-bold text-ink mb-12 text-center">{t('why_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label} className="bg-surface border border-line rounded-2xl p-8 shadow-card">
                <div className="text-4xl font-bold text-brand-gold-dark mb-2" dir="ltr">{s.value}</div>
                <div className="text-ink font-semibold mb-2">{s.label}</div>
                <p className="text-sm text-ink-2">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-ink mb-4">{t('contact_title')}</h2>
        <p className="text-ink-2 mb-10">{t('contact_subtitle')}</p>
        <ForBusinessForm />
      </section>
    </>
  );
}
