import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const BRAND_NAME = 'AirportFaster';
const LOGO_SRC = '/airportfaster-logo.png';
// Intrinsic dimensions of the PNG — required by next/image for static files
const LOGO_W = 1200;
const LOGO_H = 300;

type BrandLogoProps = {
  href?: string;
  compact?: boolean;
  priority?: boolean;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  subtitle?: string | undefined;
  onClick?: () => void;
};

function LogoImage({
  compact,
  priority,
  className,
}: {
  compact?: boolean;
  priority?: boolean;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden',
        compact ? 'h-10 w-10 rounded-xl' : 'h-11 w-[220px]',
        className,
      )}
    >
      <Image
        src={LOGO_SRC}
        alt={BRAND_NAME}
        width={LOGO_W}
        height={LOGO_H}
        priority={priority ?? false}
        className={cn(
          'block h-full max-w-none object-contain',
          compact ? 'w-[132px] object-left' : 'w-full object-left',
        )}
      />
    </span>
  );
}

export function BrandLogo({
  href = '/',
  compact = false,
  priority = false,
  className,
  markClassName,
  textClassName,
  subtitle,
  onClick,
}: BrandLogoProps) {
  const content = (
    <>
      <LogoImage compact={compact} priority={priority} className={markClassName} />
      {!compact && subtitle && (
        <span className="min-w-0">
          <span className={cn('sr-only', textClassName)}>{BRAND_NAME}</span>
          <span className="mt-1 block text-[11px] text-brand-muted">{subtitle}</span>
        </span>
      )}
    </>
  );

  return (
    <Link
      href={href}
      {...(onClick ? { onClick } : {})}
      className={cn('inline-flex items-center gap-3', className)}
      aria-label={BRAND_NAME}
    >
      {content}
    </Link>
  );
}
