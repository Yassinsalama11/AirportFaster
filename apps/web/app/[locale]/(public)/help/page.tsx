import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  Search,
  CalendarCheck,
  CreditCard,
  RotateCcw,
  Handshake,
  ArrowRight,
  Mail,
  MessageCircle,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react';
import { SchemaScript } from '@/components/public/SchemaScript';
import { breadcrumbSchema } from '@/lib/schema';
import { localeAlternates, ogLocales } from '@/lib/seo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, FadeInStagger, FadeInItem } from '@/components/ui/fade-in';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';
const WHATSAPP_NUMBER = (process.env['NEXT_PUBLIC_WHATSAPP_NUMBER'] ?? '441748220006').replace(
  /\D/g,
  '',
);
const WHATSAPP_HELP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hello, I need help with my AirportFaster booking',
)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('help');
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    openGraph: { title: t('meta_title'), description: t('meta_description'), url: `${BASE_URL}/${locale}/help`, ...ogLocales(locale) },
    alternates: localeAlternates('/help', locale),
  };
}

// STATIC: move to CMS when admin FAQ builder is live
const CATEGORIES = [
  {
    slug: 'booking',
    title: 'Booking',
    description: 'How to book, what information you need, and managing existing bookings.',
    icon: CalendarCheck,
  },
  {
    slug: 'payment',
    title: 'Payment',
    description: 'Accepted payment methods, security, and when you are charged.',
    icon: CreditCard,
  },
  {
    slug: 'cancellation',
    title: 'Cancellation & Refunds',
    description: 'Cancellation policy, refund timelines, and how to cancel a booking.',
    icon: RotateCcw,
  },
  {
    slug: 'suppliers',
    title: 'Service Providers',
    description: 'Who delivers your airport services and how providers are vetted.',
    icon: Handshake,
  },
];

export default async function HelpCentrePage() {
  const t = await getTranslations('help');

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: BASE_URL },
    { name: 'Help Centre', url: `${BASE_URL}/help` },
  ]);

  return (
    <div className="bg-bg">
      <SchemaScript schema={breadcrumb} />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span className="text-ink">Help Centre</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative py-16 lg:py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-brand-gold/10 blur-3xl opacity-60" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-5 lg:px-8 text-center">
          <FadeIn>
            <Badge variant="gold" className="mb-6">
              <LifeBuoy className="w-3 h-3 me-1.5" />
              Help Centre
            </Badge>
          </FadeIn>

          <FadeIn delay={0.05}>
            <h1 className="text-display-lg font-bold text-ink tracking-tight text-balance mb-4">
              {t('title')}
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="text-body-lg text-ink-2 max-w-xl mx-auto mb-10">
              {t('subtitle')}
            </p>
          </FadeIn>

          {/* Search box */}
          <FadeIn delay={0.15}>
            <form
              action="/help"
              method="get"
              className="bg-surface rounded-full border border-line shadow-card-hover p-1.5 max-w-xl mx-auto flex items-center gap-2"
            >
              <div className="ps-4">
                <Search className="w-4 h-4 text-ink-3" />
              </div>
              <Input
                name="q"
                type="search"
                placeholder={t('search_placeholder')}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent px-2"
                aria-label={t('search_placeholder')}
              />
              <Button
                type="submit"
                variant="gold"
                size="default"
                className="shrink-0 font-bold text-brand-black"
              >
                Search
              </Button>
            </form>
          </FadeIn>
        </div>
      </section>

      {/* Categories grid */}
      <section className="max-w-6xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
        <FadeIn>
          <div className="mb-10">
            <h2 className="text-display-sm font-bold text-ink tracking-tight">
              {t('popular_topics')}
            </h2>
            <p className="text-body-md text-ink-2 mt-2">
              Browse our most-asked questions by topic.
            </p>
          </div>
        </FadeIn>

        <FadeInStagger
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          staggerDelay={0.06}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <FadeInItem key={cat.slug}>
                <Link
                  href={`/help/${cat.slug}`}
                  className="group block bg-surface rounded-2xl border border-line shadow-card hover-lift hover:shadow-card-hover transition-shadow p-6 h-full"
                >
                  <div className="w-11 h-11 rounded-2xl bg-brand-gold/15 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-brand-gold-dark" />
                  </div>
                  <h3 className="text-body-lg font-semibold text-ink mb-2 tracking-tight group-hover:text-brand-gold-dark transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-sm text-ink-2 leading-relaxed mb-5">{cat.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-ink group-hover:gap-2 transition-all">
                    View articles
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </span>
                </Link>
              </FadeInItem>
            );
          })}
        </FadeInStagger>
      </section>

      {/* Contact CTA */}
      <section className="max-w-6xl mx-auto px-5 lg:px-8 pb-24">
        <FadeIn>
          <div className="bg-surface rounded-3xl border border-line shadow-card p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <Badge variant="secondary" className="mb-4">
                  {t('contact_us')}
                </Badge>
                <h3 className="text-display-sm font-bold text-ink tracking-tight mb-2">
                  Still need help?
                </h3>
                <p className="text-body-md text-ink-2 max-w-md">{t('contact_subtitle')}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="gold" size="lg" className="font-bold text-brand-black" asChild>
                  <a href="mailto:support@airportfaster.com">
                    <Mail className="w-4 h-4" />
                    Send a message
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href={WHATSAPP_HELP_URL} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4" />
                    Live chat
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
