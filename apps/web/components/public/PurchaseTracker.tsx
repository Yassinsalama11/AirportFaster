'use client';

import { useEffect } from 'react';
import { trackPurchase } from '@/lib/analytics';

interface PurchaseTrackerProps {
  bookingId: string;
  bookingRef?: string;
  amountMinorUnits: number;
  currency: string;
}

export function PurchaseTracker({
  bookingId,
  bookingRef,
  amountMinorUnits,
  currency,
}: PurchaseTrackerProps) {
  useEffect(() => {
    const transactionId = bookingRef || bookingId;
    const key = `af_purchase_tracked_${transactionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage may be unavailable
    }
    const value = amountMinorUnits / 100;
    trackPurchase(
      transactionId,
      [
        {
          item_id: bookingId,
          item_name: 'AirportFaster Booking',
          quantity: 1,
          price: value,
        },
      ],
      value,
      currency,
    );
  }, [bookingId, bookingRef, amountMinorUnits, currency]);

  return null;
}
