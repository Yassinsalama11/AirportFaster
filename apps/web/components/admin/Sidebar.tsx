'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  Activity,
  AlertTriangle,
  Undo2,
  Plane,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';

interface NavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  groupKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'overview', href: '/admin', icon: LayoutDashboard, groupKey: 'main' },
  { labelKey: 'bookings', href: '/admin/bookings', icon: ClipboardList, groupKey: 'operations' },
  { labelKey: 'operations', href: '/admin/operations', icon: Activity, groupKey: 'operations' },
  { labelKey: 'incidents', href: '/admin/incidents', icon: AlertTriangle, groupKey: 'operations' },
  { labelKey: 'refunds', href: '/admin/refunds', icon: Undo2, groupKey: 'operations' },
  { labelKey: 'airports', href: '/admin/airports', icon: Plane, groupKey: 'content' },
  { labelKey: 'suppliers', href: '/admin/suppliers', icon: Building2, groupKey: 'business' },
  { labelKey: 'customers', href: '/admin/customers', icon: Users, groupKey: 'business' },
  { labelKey: 'finance', href: '/admin/finance', icon: CreditCard, groupKey: 'business' },
  { labelKey: 'analytics', href: '/admin/analytics', icon: BarChart3, groupKey: 'analytics' },
  { labelKey: 'notifications', href: '/admin/notifications', icon: Bell, groupKey: 'analytics' },
  { labelKey: 'settings', href: '/admin/settings', icon: Settings, groupKey: 'admin' },
  { labelKey: 'roles', href: '/admin/roles', icon: ShieldCheck, groupKey: 'admin' },
];

const GROUPS = ['main', 'operations', 'content', 'business', 'analytics', 'admin'];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-y-0 start-0 h-full bg-brand-navy/95 border-e border-white/5 flex flex-col z-50 overflow-hidden backdrop-blur-2xl light:bg-white/90"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5 min-h-[72px]">
        <BrandLogo
          compact={collapsed}
          markClassName={collapsed ? 'h-10 w-10 rounded-xl' : 'h-10 w-[190px]'}
          subtitle={collapsed ? undefined : t('console')}
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="sr-only"
            >
              <span className="text-brand-white font-semibold text-lg leading-none whitespace-nowrap">
                AirportFaster
              </span>
              <p className="text-gray-500 text-xs mt-0.5">{t('console')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.groupKey === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="mb-4">
              <AnimatePresence>
                {!collapsed && group !== 'Main' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 mb-1 text-xs font-medium text-gray-600 uppercase tracking-widest whitespace-nowrap"
                  >
                    {t(`groups.${group}`)}
                  </motion.p>
                )}
              </AnimatePresence>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const isActive =
                    item.href === '/admin'
                      ? pathname === '/admin' || pathname.endsWith('/admin')
                      : pathname.includes(item.href.replace('/admin', ''));
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? t(item.labelKey) : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lg text-sm transition-all duration-150 group relative',
                          collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
                          isActive
                            ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'
                            : 'text-gray-400 hover:text-brand-white hover:bg-white/5 border border-transparent'
                        )}
                      >
                        <Icon
                          className={cn(
                            'flex-shrink-0 transition-colors',
                            collapsed ? 'w-5 h-5' : 'w-4 h-4',
                            isActive ? 'text-brand-gold' : 'text-gray-500 group-hover:text-brand-white'
                          )}
                        />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="font-medium whitespace-nowrap overflow-hidden"
                            >
                              {t(item.labelKey)}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {isActive && !collapsed && (
                          <span className="ms-auto w-1.5 h-1.5 rounded-full bg-brand-gold flex-shrink-0" />
                        )}
                        {/* Tooltip when collapsed */}
                        {collapsed && (
                          <span className="absolute start-full ms-2 px-2 py-1 rounded-md bg-brand-navy border border-white/10 text-xs text-brand-off-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-elevated-lg">
                            {t(item.labelKey)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-4 border-t border-white/5">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-gray-500 hover:text-brand-white hover:bg-white/5 transition-colors',
            collapsed && 'justify-center'
          )}
          aria-label={collapsed ? t('expand_sidebar') : t('collapse_sidebar')}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>{t('collapse')}</span>
            </>
          )}
        </button>
        {!collapsed && <p className="px-3 mt-2 text-xs text-gray-600">v0.1.0</p>}
      </div>
    </motion.aside>
  );
}
