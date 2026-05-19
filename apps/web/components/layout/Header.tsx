'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Menu, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { cn } from '@/lib/utils';

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/search', label: t('find_airports') },
    { href: '/services', label: t('services') },
    { href: '/for-business', label: t('for_business') },
    { href: '/help', label: t('help') },
  ];

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled ? 'glass-light' : 'bg-bg/0'
        )}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <BrandLogo
              href="/"
              priority
              className="shrink-0"
              markClassName="h-10 w-[200px] sm:h-11 sm:w-[230px]"
            />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {links.map((link) => {
                const isActive = pathname.includes(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative px-4 py-2 text-sm font-medium transition-colors',
                      isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="active-nav"
                        className="absolute inset-0 -z-10 bg-surface-2 rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-2">
              <Link
                href="/manage"
                className="hidden lg:block px-3 py-2 text-sm text-ink-2 hover:text-ink transition-colors"
              >
                {t('manage_booking')}
              </Link>
              <div className="hidden md:flex">
                <LocaleSwitcher />
              </div>
              <Button size="default" variant="gold" asChild className="hidden md:flex">
                <Link href="/search">
                  <Search className="w-4 h-4" />
                  {t('book_now')}
                </Link>
              </Button>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2.5 text-ink hover:bg-surface-2 rounded-full transition-colors"
                aria-label={t('open_menu')}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            <div
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute end-0 top-0 bottom-0 w-80 max-w-[85vw] bg-surface flex flex-col p-6 rounded-s-3xl shadow-popover"
            >
              <div className="flex items-center justify-between mb-8">
                <BrandLogo
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="shrink-0"
                  markClassName="h-10 w-[200px]"
                />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-2.5 text-ink hover:bg-surface-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 flex-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3.5 rounded-2xl text-ink hover:bg-surface-2 transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/manage"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3.5 rounded-2xl text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
                >
                  {t('manage_booking')}
                </Link>
              </nav>
              <div className="space-y-3 pt-6 border-t border-line">
                <div className="flex items-center gap-2 px-1">
                  <LocaleSwitcher />
                </div>
                <Button asChild variant="gold" className="w-full" size="lg">
                  <Link href="/search" onClick={() => setMobileOpen(false)}>
                    {t('book_now')}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
