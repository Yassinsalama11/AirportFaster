'use client';

import Link from 'next/link';
import { trackSelectItem } from '@/lib/analytics';

interface BookNowButtonProps {
  href: string;
  serviceSlug: string;
  serviceName: string;
  airportSlug: string;
  price?: number;
  children: React.ReactNode;
  className?: string;
}

export function BookNowButton({
  href,
  serviceSlug,
  serviceName,
  airportSlug,
  price,
  children,
  className,
}: BookNowButtonProps) {
  function handleClick() {
    trackSelectItem({
      item_id: `${airportSlug}/${serviceSlug}`,
      item_name: serviceName,
      item_category: serviceSlug,
      ...(price !== undefined ? { price } : {}),
    });
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
