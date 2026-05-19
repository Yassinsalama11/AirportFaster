import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-gray-400 hover:text-brand-off-white transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast ? 'text-brand-off-white font-medium' : 'text-gray-400')}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
