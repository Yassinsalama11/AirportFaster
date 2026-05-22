import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import { hasLocale } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { SchemaScript } from '@/components/public/SchemaScript';
import { SuspenseBoundary } from '@/components/SuspenseBoundary';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { routing, type Locale } from '@/i18n/routing';
import { organizationSchema, websiteSchema } from '@/lib/schema';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

// Arabic font — only loaded when locale is 'ar', self-hosted by Next.js
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-arabic',
  preload: false,
});

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF7' },
    { media: '(prefers-color-scheme: dark)', color: '#FAFAF7' },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: {
      default: 'AirportFaster — Premium Airport Services',
      template: '%s | AirportFaster',
    },
    description:
      'Book fast track, meet & greet, and lounge access at airports worldwide. Premium airport experience platform.',
    metadataBase: new URL(BASE_URL),
    openGraph: {
      siteName: 'AirportFaster',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_AR'],
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'AirportFaster — Premium Airport Services',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@airportfaster',
      images: [`${BASE_URL}/og-image.png`],
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        en: `${BASE_URL}/en`,
        ar: `${BASE_URL}/ar`,
        'x-default': `${BASE_URL}/en`,
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  const fontClassName = locale === 'ar'
    ? `${inter.variable} ${notoSansArabic.variable} light`
    : `${inter.variable} light`;

  return (
    <html lang={locale} dir={direction} className={fontClassName}>
      <head>
        {/* Preconnect to external origins for faster resource loading */}
        <link rel="preconnect" href="https://us.i.posthog.com" />
        <link rel="preconnect" href="https://us-assets.i.posthog.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body>
        <SchemaScript schema={organizationSchema()} />
        <SchemaScript schema={websiteSchema()} />
        <NextIntlClientProvider locale={locale as Locale} messages={messages}>
          <ThemeProvider>
            <SuspenseBoundary fallback={null}>
              <PostHogProvider>{children}</PostHogProvider>
            </SuspenseBoundary>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
