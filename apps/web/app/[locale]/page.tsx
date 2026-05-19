import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  ArrowRight,
  Search,
  Zap,
  Users,
  Star,
  Shield,
  Clock,
  Sparkles,
  Plane,
  TrendingUp,
  Award,
} from 'lucide-react';
import { SchemaScript } from '@/components/public/SchemaScript';
import { faqSchema, howToSchema } from '@/lib/schema';
import { localeAlternates, ogLocales } from '@/lib/seo';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookingComposer } from '@/components/public/BookingComposer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, FadeInStagger, FadeInItem } from '@/components/ui/fade-in';
import { AirportCard } from '@/components/marketplace/AirportCard';
import { ServiceCard } from '@/components/marketplace/ServiceCard';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const title = 'AirportFaster — Premium Airport Services';
  const description = t('hero_sub');
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}`,
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: title }],
      ...ogLocales(locale),
    },
    twitter: {
      card: 'summary_large_image',
      site: '@airportfaster',
      title,
      description,
      images: [`${BASE_URL}/og-image.png`],
    },
    alternates: localeAlternates('', locale),
  };
}

interface AirportTranslation {
  locale: string;
  name: string;
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
  airportServices: Array<{ isActive: boolean }>;
}

async function getFeaturedAirports(): Promise<Airport[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/airports?featured=true&limit=8`, {
      next: { revalidate: 300, tags: ['airports'] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { success: boolean; data: { airports: Airport[] } };
    return data.success ? data.data.airports : [];
  } catch {
    return [];
  }
}

function getLocalName(translations: AirportTranslation[], locale: string) {
  return (
    translations.find((tr) => tr.locale === locale)?.name ??
    translations.find((tr) => tr.locale === 'en')?.name ??
    'Airport'
  );
}

function getPrimaryAirportImage(images: AirportImage[] | undefined): string | undefined {
  return [...(images ?? [])].sort((a, b) => {
    if ((a.isPrimary ?? false) !== (b.isPrimary ?? false)) {
      return a.isPrimary ? -1 : 1;
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  })[0]?.url;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('home');
  const airports = await getFeaturedAirports();

  const services = [
    {
      icon: Zap,
      name: t('fast_track_name'),
      description: t('fast_track_desc'),
      from: t('fast_track_from'),
      detail: t('fast_track_detail'),
      href: '/services/fast-track',
      imgVariant: 2 as const,
      // Sunlit airport corridor with travellers walking briskly — evokes priority/fast passage
      imageUrl: 'https://images.unsplash.com/photo-1596226004757-09d33a19ea5d?w=1200&q=80&auto=format&fit=crop',
    },
    {
      icon: Users,
      name: t('meet_greet_name'),
      description: t('meet_greet_desc'),
      from: t('meet_greet_from'),
      detail: t('meet_greet_detail'),
      href: '/services/meet-and-greet',
      imgVariant: 3 as const,
      // Silhouette of arriving traveller at terminal with plane in view — meet at arrivals
      imageUrl: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?w=1200&q=80&auto=format&fit=crop',
    },
    {
      icon: Star,
      name: t('lounge_name'),
      description: t('lounge_desc'),
      from: t('lounge_from'),
      detail: t('lounge_detail'),
      href: '/services/lounge-access',
      imgVariant: 5 as const,
      // Traveller with feet up at gate, plane visible through window — relaxed lounge vibe
      imageUrl: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1200&q=80&auto=format&fit=crop',
    },
  ];

  const steps = [
    { n: '01', icon: Search, title: t('step1_title'), desc: t('step1_desc') },
    { n: '02', icon: Sparkles, title: t('step2_title'), desc: t('step2_desc') },
    { n: '03', icon: Shield, title: t('step3_title'), desc: t('step3_desc') },
    { n: '04', icon: Plane, title: t('step4_title'), desc: t('step4_desc') },
  ];

  const trustBadges = [
    { icon: Shield, label: t('trust_secure') },
    { icon: Clock, label: t('trust_instant') },
    { icon: Award, label: t('trust_rated') },
  ];

  const stats = [
    { value: t('stats_airports_value'), label: t('stats_airports_label') },
    { value: t('stats_bookings_value'), label: t('stats_bookings_label') },
    { value: t('stats_countries_value'), label: t('stats_countries_label') },
    { value: t('stats_rating_value'), label: t('stats_rating_label') },
  ];

  const faqs = [
    { q: t('faq_q1'), a: t('faq_a1') },
    { q: t('faq_q2'), a: t('faq_a2') },
    { q: t('faq_q3'), a: t('faq_a3') },
    { q: t('faq_q4'), a: t('faq_a4') },
  ];

  const homeFaqSchema = faqSchema(faqs.map((f) => ({ question: f.q, answer: f.a })));
  const homeHowToSchema = howToSchema({
    name: t('how_title'),
    description: t('how_subtitle'),
    steps: steps.map((s) => ({ name: s.title, text: s.desc })),
  });

  return (
    <>
      <SchemaScript schema={homeFaqSchema} />
      <SchemaScript schema={homeHowToSchema} />
      <Header />
      <main className="overflow-x-hidden pt-16 lg:pt-18">
        {/* ─── HERO ──────────────────────────────────────────────────── */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32">
          {/* Background blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -right-32 w-[40rem] h-[40rem] rounded-full bg-brand-gold/10 blur-3xl opacity-60" />
            <div className="absolute top-1/3 -left-32 w-[30rem] h-[30rem] rounded-full bg-blue-200/40 blur-3xl opacity-50" />
            <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-pink-100/50 blur-3xl opacity-50" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <FadeIn>
                <Badge variant="gold" className="mb-6">
                  <Sparkles className="w-3 h-3 me-1.5" />
                  {t('hero_eyebrow')}
                </Badge>
              </FadeIn>

              <FadeIn delay={0.05}>
                <h1 className="text-display-2xl font-bold text-ink text-balance leading-[1.02] mb-6">
                  {t('hero_line1')}
                  <br />
                  <span className="gradient-text-gold">{t('hero_line2')}</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.1}>
                <p className="text-body-xl text-ink-2 max-w-2xl mx-auto mb-10 text-balance">
                  {t('hero_sub')}
                </p>
              </FadeIn>

              {/* Booking composer */}
              <FadeIn delay={0.15}>
                <div className="mb-6">
                  <BookingComposer
                    labels={{
                      airportLabel: t('compose_airport_label'),
                      airportPlaceholder: t('compose_airport_placeholder'),
                      serviceLabel: t('compose_service_label'),
                      servicePlaceholder: t('compose_service_placeholder'),
                      dateLabel: t('compose_date_label'),
                      travelersLabel: t('compose_travelers_label'),
                      adults: t('compose_adults'),
                      adultsHint: t('compose_adults_hint'),
                      children: t('compose_children'),
                      childrenHint: t('compose_children_hint'),
                      infants: t('compose_infants'),
                      infantsHint: t('compose_infants_hint'),
                      searchAirportPlaceholder: t('compose_search_airport'),
                      noAirportsFound: t('compose_no_airports'),
                      loadingAirports: t('compose_loading_airports'),
                      ctaBook: t('compose_cta_book'),
                      ctaSearching: t('compose_cta_searching'),
                    }}
                  />
                </div>
              </FadeIn>

              {/* Trust signals row */}
              <FadeIn delay={0.2}>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-ink-2 mb-12">
                  {trustBadges.map((b) => {
                    const Icon = b.icon;
                    return (
                      <span key={b.label} className="flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-brand-gold-dark" />
                        {b.label}
                      </span>
                    );
                  })}
                </div>
              </FadeIn>

              {/* Stats inline */}
              <FadeInStagger
                className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
                staggerDelay={0.06}
              >
                {stats.map((s) => (
                  <FadeInItem key={s.label}>
                    <div className="bg-surface/60 backdrop-blur-sm rounded-2xl border border-line/60 p-4 hover-lift hover:bg-surface transition-colors">
                      <p className="text-2xl md:text-3xl font-bold text-ink tracking-tight" dir="ltr">
                        {s.value}
                      </p>
                      <p className="text-xs text-ink-3 mt-1">{s.label}</p>
                    </div>
                  </FadeInItem>
                ))}
              </FadeInStagger>
            </div>
          </div>
        </section>

        {/* ─── SERVICES SECTION ──────────────────────────────────────── */}
        <section className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <FadeIn>
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
                <div className="max-w-xl">
                  <Badge variant="secondary" className="mb-4">
                    {t('services_eyebrow')}
                  </Badge>
                  <h2 className="text-display-lg font-bold text-ink tracking-tight whitespace-pre-line">
                    {t('services_title')}
                  </h2>
                  <p className="text-body-lg text-ink-2 mt-4">{t('services_subtitle')}</p>
                </div>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:gap-2 transition-all"
                >
                  {t('services_view_all')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            </FadeIn>

            <FadeInStagger
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              staggerDelay={0.08}
            >
              {services.map((s) => (
                <FadeInItem key={s.name}>
                  <ServiceCard
                    icon={s.icon}
                    title={s.name}
                    description={s.description}
                    from={s.from}
                    detail={s.detail}
                    href={s.href}
                    ctaLabel={t('learn_more')}
                    imgVariant={s.imgVariant}
                    imageUrl={s.imageUrl}
                  />
                </FadeInItem>
              ))}
            </FadeInStagger>
          </div>
        </section>

        {/* ─── HOW IT WORKS ──────────────────────────────────────────── */}
        <section className="py-20 lg:py-28 bg-surface-2 border-y border-line">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <Badge variant="secondary" className="mb-4">
                  {t('how_eyebrow')}
                </Badge>
                <h2 className="text-display-lg font-bold text-ink tracking-tight whitespace-pre-line">
                  {t('how_title')}
                </h2>
                <p className="text-body-lg text-ink-2 mt-4">{t('how_subtitle')}</p>
              </div>
            </FadeIn>

            <FadeInStagger
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              staggerDelay={0.08}
            >
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <FadeInItem key={step.n}>
                    <div className="bg-surface rounded-3xl border border-line p-6 h-full hover-lift hover:shadow-card-hover transition-shadow">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-brand-gold/15 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-brand-gold-dark" />
                        </div>
                        <span className="text-3xl font-bold text-line-2 tracking-tighter" dir="ltr">
                          {step.n}
                        </span>
                      </div>
                      <h3 className="text-body-lg font-semibold text-ink mb-2 tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-sm text-ink-2 leading-relaxed">{step.desc}</p>
                    </div>
                  </FadeInItem>
                );
              })}
            </FadeInStagger>
          </div>
        </section>

        {/* ─── POPULAR AIRPORTS ──────────────────────────────────────── */}
        {airports.length > 0 && (
          <section className="py-20 lg:py-28">
            <div className="max-w-7xl mx-auto px-5 lg:px-8">
              <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
                  <div className="max-w-xl">
                    <Badge variant="secondary" className="mb-4">
                      <TrendingUp className="w-3 h-3 me-1.5" />
                      {t('airports_eyebrow')}
                    </Badge>
                    <h2 className="text-display-lg font-bold text-ink tracking-tight">
                      {t('airports_title')}
                    </h2>
                    <p className="text-body-lg text-ink-2 mt-4">{t('airports_subtitle')}</p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/airports">
                      {t('airports_view_all')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>

              <FadeInStagger
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
                staggerDelay={0.06}
              >
                {airports.map((airport, i) => (
                  <FadeInItem key={airport.id}>
                    <AirportCard
                      iataCode={airport.iataCode}
                      name={getLocalName(airport.translations, locale)}
                      city={airport.city}
                      country={airport.country}
                      slug={airport.slug}
                      servicesCount={airport.airportServices.filter((s) => s.isActive).length}
                      rating={4.6 + (i % 4) * 0.1}
                      imgVariant={((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6}
                      imageUrl={getPrimaryAirportImage(airport.images)}
                    />
                  </FadeInItem>
                ))}
              </FadeInStagger>
            </div>
          </section>
        )}

        {/* ─── TESTIMONIALS / TRUST ──────────────────────────────────── */}
        <section className="py-20 lg:py-28 bg-surface-2 border-y border-line">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <FadeIn>
              <div className="text-center max-w-2xl mx-auto mb-12">
                <Badge variant="secondary" className="mb-4">
                  {t('reviews_eyebrow')}
                </Badge>
                <h2 className="text-display-lg font-bold text-ink tracking-tight">
                  {t('reviews_title')}
                </h2>
                <p className="text-body-lg text-ink-2 mt-4">{t('reviews_subtitle')}</p>
              </div>
            </FadeIn>

            <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.08}>
              {[1, 2, 3].map((i) => (
                <FadeInItem key={i}>
                  <div className="bg-surface rounded-3xl border border-line p-7 h-full hover-lift hover:shadow-card-hover transition-shadow">
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-brand-gold text-brand-gold" />
                      ))}
                    </div>
                    <p className="text-ink text-body-md leading-relaxed mb-6">
                      {t(`review_${i}_text` as 'review_1_text')}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full img-placeholder-${i + 2}`} />
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {t(`review_${i}_name` as 'review_1_name')}
                        </p>
                        <p className="text-xs text-ink-3">
                          {t(`review_${i}_role` as 'review_1_role')}
                        </p>
                      </div>
                    </div>
                  </div>
                </FadeInItem>
              ))}
            </FadeInStagger>
          </div>
        </section>

        {/* ─── FAQ ───────────────────────────────────────────────────── */}
        <section className="py-20 lg:py-28">
          <div className="max-w-3xl mx-auto px-5 lg:px-8">
            <FadeIn>
              <div className="text-center mb-12">
                <Badge variant="secondary" className="mb-4">
                  {t('faq_eyebrow')}
                </Badge>
                <h2 className="text-display-lg font-bold text-ink tracking-tight">
                  {t('faq_title')}
                </h2>
              </div>
            </FadeIn>

            <FadeInStagger className="space-y-3" staggerDelay={0.05}>
              {faqs.map((faq) => (
                <FadeInItem key={faq.q}>
                  <details className="group bg-surface rounded-2xl border border-line hover:border-line-2 transition-colors">
                    <summary className="flex items-start justify-between gap-4 p-6 cursor-pointer list-none">
                      <span className="text-body-md font-semibold text-ink">{faq.q}</span>
                      <span className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-ink shrink-0 group-open:rotate-45 transition-transform duration-200">
                        +
                      </span>
                    </summary>
                    <div className="px-6 pb-6 text-body-sm text-ink-2 leading-relaxed">{faq.a}</div>
                  </details>
                </FadeInItem>
              ))}
            </FadeInStagger>
          </div>
        </section>

        {/* ─── CTA ───────────────────────────────────────────────────── */}
        <section className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <div className="relative overflow-hidden rounded-4xl border border-line bg-surface p-10 text-center shadow-card-hover lg:p-20">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/15 via-transparent to-transparent" />
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/15 rounded-full blur-3xl" />

              <FadeIn>
                <div className="relative z-10 max-w-2xl mx-auto">
                  <h2 className="text-display-lg font-bold text-ink tracking-tight whitespace-pre-line mb-6">
                    {t('cta_title')}
                  </h2>
                  <p className="text-body-lg text-ink-2 mb-8">{t('cta_sub')}</p>
                  <Button size="xl" variant="gold" asChild>
                    <Link href="/search">
                      {t('cta_button')}
                      <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
