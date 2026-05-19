import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Globe, Heart } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Separator } from '@/components/ui/separator';

const SOCIALS = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/airportfaster',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'X',
    href: 'https://x.com/airportfaster',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/airportfaster',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/airportfaster',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@airportfaster',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    label: 'Snapchat',
    href: 'https://www.snapchat.com/add/airportfaster',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.053.359.53-.06.569-.51.868-.99 1.169-.12.074-.225.135-.315.18.012.03.042.075.093.15.258.351 1.099 1.561 1.099 2.491 0 .12-.045.225-.12.3-.199.213-.735.391-1.62.54-.195.03-.36.045-.465.135-.09.075-.179.225-.209.345-.6.24-.21 1.049-1.034 1.049-.271 0-.526-.053-.767-.1-.378-.075-.753-.15-1.129-.015C14.87 21.13 12.87 21.9 12 21.9c-.87 0-2.87-.77-3.93-1.546-.376-.135-.751-.06-1.129.015-.241.047-.496.1-.767.1-.824 0-.974-.81-1.034-1.049-.03-.12-.119-.27-.209-.345-.105-.09-.27-.105-.465-.135-.885-.149-1.421-.327-1.62-.54-.075-.075-.12-.18-.12-.3 0-.93.841-2.14 1.099-2.491.051-.075.081-.12.093-.15-.09-.045-.195-.106-.315-.18-.48-.301-.93-.6-.99-1.169 0 0 .177-.53.359-.53.12 0 .299.016.464.104.374.181.733.285 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.853 1.069 11.21.793 12.206.793z" />
      </svg>
    ),
  },
];

export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();

  const services = [
    { label: t('fast_track'), href: '/services/fast-track' },
    { label: t('meet_greet'), href: '/services/meet-and-greet' },
    { label: t('lounge_access'), href: '/services/lounge-access' },
    { label: t('browse_airports'), href: '/airports' },
  ];

  const company = [
    { label: t('for_business'), href: '/for-business' },
    { label: t('help_center'), href: '/help' },
    { label: t('manage_booking'), href: '/manage' },
  ];

  const legal = [
    { label: t('privacy'), href: '/legal/privacy' },
    { label: t('terms'), href: '/legal/terms' },
    { label: t('cookies'), href: '/legal/cookies' },
  ];

  return (
    <footer className="bg-surface-2 mt-24 border-t border-line">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <BrandLogo href="/" className="mb-5" markClassName="h-11 w-[230px]" />
            <p className="text-sm text-ink-2 leading-relaxed max-w-[18rem]">{t('tagline')}</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-ink-3">
              <Globe className="w-4 h-4 text-brand-gold-dark" />
              {t('tagline_bottom')}
            </div>
            {/* Social icons */}
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center text-ink-3 hover:text-ink hover:border-brand-gold/40 hover:bg-brand-gold/8 transition-colors"
                >
                  {social.svg}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-5">
              {t('services_title')}
            </h4>
            <ul className="space-y-3">
              {services.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-ink-2 hover:text-ink transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-5">
              {t('company_title')}
            </h4>
            <ul className="space-y-3">
              {company.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-ink-2 hover:text-ink transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink uppercase tracking-widest mb-5">
              {t('legal_title')}
            </h4>
            <ul className="space-y-3">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-ink-2 hover:text-ink transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-3">
          <p>{t('copyright', { year })}</p>
          <p className="flex items-center gap-1.5">
            Made with <Heart className="w-3.5 h-3.5 fill-brand-gold text-brand-gold" /> for premium
            travellers
          </p>
        </div>
      </div>
    </footer>
  );
}
