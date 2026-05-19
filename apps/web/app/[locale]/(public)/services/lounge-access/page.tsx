import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
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
  const name = tFooter('lounge_access');
  const title = `${name} | AirportFaster`;
  const description = t('lounge_access.what_is');
  return {
    title,
    description,
    openGraph: { title, description, url: `${BASE_URL}/${locale}/services/lounge-access`, ...ogLocales(locale) },
    alternates: localeAlternates('/services/lounge-access', locale),
  };
}

export default function LoungeAccessPage() {
  return <ServiceLandingPage slug="lounge-access" serviceKey="lounge_access" />;
}
