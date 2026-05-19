import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AirportCardProps {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  slug: string;
  servicesCount: number;
  fromPrice?: string;
  rating?: number;
  imgVariant?: 1 | 2 | 3 | 4 | 5 | 6;
  imageUrl?: string | undefined;
}

export function AirportCard({
  iataCode,
  name,
  city,
  country,
  slug,
  servicesCount,
  fromPrice,
  rating,
  imgVariant = 1,
  imageUrl,
}: AirportCardProps) {
  return (
    <Link href={`/airports/${slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-surface border border-line shadow-card hover-lift hover:shadow-card-hover transition-shadow">
        {/* Image area */}
        <div className={cn('relative aspect-[4/3] overflow-hidden', `img-placeholder-${imgVariant}`)}>
          {imageUrl && (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url("${imageUrl}")` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-3 start-3">
            <Badge className="font-mono bg-white/95 text-ink" dir="ltr">
              {iataCode}
            </Badge>
          </div>
          {rating !== undefined && (
            <div className="absolute top-3 end-3 flex items-center gap-1 bg-white/95 text-ink rounded-full px-2.5 py-1 text-xs font-semibold">
              <Star className="w-3 h-3 fill-brand-gold text-brand-gold" />
              {rating.toFixed(1)}
            </div>
          )}
          <div className="absolute bottom-3 end-3 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4 text-ink" />
          </div>
        </div>
        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-ink-3 mb-1">{country}</p>
          <h3 className="font-semibold text-ink text-body-md truncate group-hover:text-brand-gold-dark transition-colors">
            {name}
          </h3>
          <p className="text-sm text-ink-2 mt-0.5">{city}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
            <span className="text-xs text-ink-3">{servicesCount} services</span>
            {fromPrice && (
              <span className="text-sm font-semibold text-ink" dir="ltr">
                {fromPrice}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
