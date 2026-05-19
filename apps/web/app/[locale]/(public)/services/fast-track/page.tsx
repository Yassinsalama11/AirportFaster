import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { ServiceLandingPage } from '../_service-landing';
import { localeAlternates, ogLocales } from '@/lib/seo';

export const revalidate = 3600;

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('service_pages');
  const tFooter = await getTranslations('footer');
  const name = tFooter('fast_track');
  const title = `${name} | AirportFaster`;
  const description = t('fast_track.what_is');
  return {
    title,
    description,
    openGraph: { title, description, url: `${BASE_URL}/${locale}/services/fast-track`, ...ogLocales(locale) },
    alternates: localeAlternates('/services/fast-track', locale),
  };
}

export default function FastTrackPage() {
  return <ServiceLandingPage slug="fast-track" serviceKey="fast_track" />;
}
