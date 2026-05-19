import * as React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb, type BreadcrumbItem } from '@/components/admin/Breadcrumb';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb items={breadcrumb} className="mb-3" />
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-bold text-brand-off-white">{title}</h1>
          {description && (
            <p className="mt-1 text-body-sm text-brand-muted">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
