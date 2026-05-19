'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/admin/Sidebar';
import { Topbar } from '@/components/admin/Topbar';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  user: { name: string; email: string; role: string } | null;
  children: React.ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-brand-black text-brand-off-white flex">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-200',
          collapsed ? 'ms-[72px]' : 'ms-64'
        )}
      >
        <Topbar user={user} sidebarCollapsed={collapsed} />
        <motion.main
          className="flex-1 p-6 lg:p-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
