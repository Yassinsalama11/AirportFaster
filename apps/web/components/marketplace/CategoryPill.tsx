'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface CategoryPillProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
}

export function CategoryPill({ icon: Icon, label, href, active = false }: CategoryPillProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        className={cn(
          'flex flex-col items-center gap-2 py-3 px-4 rounded-2xl border transition-colors min-w-[88px]',
          active
            ? 'border-ink bg-surface shadow-pill'
            : 'border-transparent text-ink-3 hover:text-ink hover:border-line'
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="text-xs font-medium whitespace-nowrap">{label}</span>
      </motion.div>
    </Link>
  );
}
