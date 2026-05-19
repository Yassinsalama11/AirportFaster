'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { routing, usePathname, useRouter, type Locale } from '@/i18n/routing';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: Locale) {
    const queryString = searchParams.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.replace(href, { locale: nextLocale });
    });
  }

  return (
    <div className="inline-flex items-center gap-1 text-xs text-gray-500" aria-label="Language">
      {routing.locales.map((item, index) => (
        <span key={item} className="inline-flex items-center gap-1">
          {index > 0 && <span aria-hidden="true">|</span>}
          <button
            type="button"
            disabled={isPending || item === locale}
            onClick={() => switchLocale(item)}
            className={
              item === locale
                ? 'font-medium uppercase text-brand-gold'
                : 'uppercase transition-colors hover:text-brand-white disabled:cursor-not-allowed'
            }
          >
            {item}
          </button>
        </span>
      ))}
    </div>
  );
}
