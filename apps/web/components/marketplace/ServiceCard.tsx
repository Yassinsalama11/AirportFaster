import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  from: string;
  detail: string;
  href: string;
  ctaLabel: string;
  variant?: 'default' | 'featured';
  imgVariant?: 1 | 2 | 3 | 4 | 5 | 6;
  imageUrl?: string | undefined;
}

export function ServiceCard({
  icon: Icon,
  title,
  description,
  from,
  detail,
  href,
  ctaLabel,
  variant = 'default',
  imgVariant = 2,
  imageUrl,
}: ServiceCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <div
        className={cn(
          'h-full overflow-hidden rounded-3xl border border-line bg-surface shadow-card hover-lift hover:shadow-card-hover transition-shadow flex flex-col',
          variant === 'featured' && 'ring-2 ring-brand-gold/30'
        )}
      >
        <div className={cn('relative aspect-[16/10] overflow-hidden', !imageUrl && `img-placeholder-${imgVariant}`)}>
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-transparent" />
          <div className="absolute top-4 start-4 w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center shadow-pill">
            <Icon className="w-5 h-5 text-ink" />
          </div>
        </div>
        <div className="p-6 flex-1 flex flex-col">
          <h3 className="text-display-sm font-bold text-ink tracking-tight">{title}</h3>
          <p className="text-sm text-ink-2 mt-2 leading-relaxed">{description}</p>
          <div className="mt-auto pt-5">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs text-ink-3">{detail}</p>
                <p className="text-lg font-bold text-ink mt-0.5" dir="ltr">
                  {from}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center group-hover:bg-brand-gold group-hover:text-ink transition-colors">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
              </div>
            </div>
            <p className="text-xs text-brand-gold-dark font-medium">{ctaLabel} →</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
