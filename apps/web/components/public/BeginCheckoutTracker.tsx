'use client';

import { useEffect } from 'react';
import { trackBeginCheckout } from '@/lib/analytics';

interface BeginCheckoutTrackerProps {
  airportSlug: string;
  serviceSlug?: string;
  serviceName?: string;
  priceMinorUnits?: number;
  currency?: string;
}

export function BeginCheckoutTracker({
  airportSlug,
  serviceSlug,
  serviceName,
  priceMinorUnits,
  currency = 'EUR',
}: BeginCheckoutTrackerProps) {
  useEffect(() => {
    const key = `af_begin_checkout_${airportSlug}_${serviceSlug ?? ''}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // ignore
    }
    const value = priceMinorUnits ? priceMinorUnits / 100 : 0;
    trackBeginCheckout(
      [
        {
          item_id: `${airportSlug}/${serviceSlug ?? 'unknown'}`,
          item_name: serviceName ?? serviceSlug ?? 'AirportFaster Service',
          item_category: serviceSlug ?? 'unknown',
          ...(value > 0 ? { price: value } : {}),
          quantity: 1,
        },
      ],
      value,
      currency,
    );
  }, [airportSlug, serviceSlug, serviceName, priceMinorUnits, currency]);

  return null;
}
