// GA4 event tracking via GTM dataLayer.
// All events follow GA4's Recommended Events schema (snake_case names,
// standard parameter shapes for items/value/currency/transaction_id) so
// reports light up automatically.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

type EventParams = Record<string, unknown>;

export function trackEvent(event: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

// ── Typed helpers for the canonical funnel events ─────────────────────────────

interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
}

export function trackSelectItem(item: AnalyticsItem, currency = 'EUR'): void {
  trackEvent('select_item', { currency, items: [item] });
}

export function trackBeginCheckout(
  items: AnalyticsItem[],
  value: number,
  currency = 'EUR',
): void {
  trackEvent('begin_checkout', { currency, value, items });
}

export function trackPurchase(
  transactionId: string,
  items: AnalyticsItem[],
  value: number,
  currency = 'EUR',
): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency,
    value,
    items,
  });
}

export function trackGenerateLead(
  formDestination: string,
  value?: number,
  currency = 'EUR',
): void {
  trackEvent('generate_lead', {
    form_destination: formDestination,
    ...(value !== undefined ? { value, currency } : {}),
  });
}
