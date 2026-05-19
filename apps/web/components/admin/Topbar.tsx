'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

interface TopbarProps {
  user: { name: string; email: string; role: string } | null;
  sidebarCollapsed?: boolean;
}

export function Topbar({ user, sidebarCollapsed: _sidebarCollapsed = false }: TopbarProps) {
  const t = useTranslations('admin.topbar');
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'A';

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <header
      className="h-16 bg-brand-navy/60 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md"
    >
      {/* Left: status indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400 hidden sm:block">{t('system_operational')}</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 text-sm hover:bg-white/10 hover:text-brand-white transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">{t('search')}</span>
          <kbd className="ms-2 text-xs bg-white/5 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
        </button>

        {/* Locale switcher */}
        <LocaleSwitcher />

        {/* Notification bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 hover:text-brand-white transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-brand-gold" />
        </button>

        {/* Staff user menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg hover:bg-white/5 p-1.5 transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-start hidden md:block">
                <p className="text-xs font-medium text-brand-off-white leading-none">
                  {user?.name ?? t('admin')}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 capitalize">
                  {user?.role?.replace('_', ' ') ?? t('staff')}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{user?.email ?? ''}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/admin/settings">{t('settings')}</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              disabled={isLoggingOut}
              className="text-gray-400 cursor-pointer"
            >
              {isLoggingOut ? t('logging_out') : t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
