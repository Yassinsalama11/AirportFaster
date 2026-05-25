export type PassengerType = 'adult' | 'child' | 'infant';
export type PricingDirection = 'arrival' | 'departure' | 'both';
export type PricingModel = 'flat_per_type' | 'tiered' | 'group' | 'duration_based';

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface BookingPricingRule {
  basePriceMinor: number | null;
  currency: string;
  direction?: PricingDirection | null;
  pricingModel?: PricingModel | null;
  firstPassengerMinor?: number | null;
  extraPassengerMinor?: number | null;
  groupSizeIncluded?: number | null;
  durationHours?: number | null;
  priority?: number | null;
  passengerPricing?: Record<string, number> | null;
}

export function getPassengerCounts(passengers: Array<{ type: PassengerType }>): PassengerCounts {
  return passengers.reduce<PassengerCounts>(
    (counts, passenger) => {
      if (passenger.type === 'adult') counts.adults += 1;
      if (passenger.type === 'child') counts.children += 1;
      if (passenger.type === 'infant') counts.infants += 1;
      return counts;
    },
    { adults: 0, children: 0, infants: 0 },
  );
}

export function calculatePriceMinor(
  rule: BookingPricingRule | null | undefined,
  passengers: PassengerCounts,
): number {
  if (!rule) return 0;
  const total = passengers.adults + passengers.children + passengers.infants;

  switch (rule.pricingModel ?? 'flat_per_type') {
    case 'flat_per_type':
      return (
        (rule.passengerPricing?.['adult'] ?? 0) * passengers.adults +
        (rule.passengerPricing?.['child'] ?? 0) * passengers.children +
        (rule.passengerPricing?.['infant'] ?? 0) * passengers.infants
      );
    case 'tiered':
      if (total === 0) return 0;
      return (rule.firstPassengerMinor ?? 0) + Math.max(0, total - 1) * (rule.extraPassengerMinor ?? 0);
    case 'group':
      return (
        (rule.basePriceMinor ?? 0) +
        Math.max(0, total - (rule.groupSizeIncluded ?? 1)) * (rule.extraPassengerMinor ?? 0)
      );
    case 'duration_based':
      return (rule.basePriceMinor ?? 0) * total;
    default:
      return (rule.basePriceMinor ?? 0) * total;
  }
}

export function selectPricingRule(
  rules: BookingPricingRule[] | undefined,
  selectedDirection?: 'arrival' | 'departure' | '',
): BookingPricingRule | null {
  if (!rules || rules.length === 0) return null;
  const direction = selectedDirection || undefined;
  const applicableRules = direction
    ? rules.filter((rule) => rule.direction === direction || rule.direction === 'both' || rule.direction == null)
    : rules;

  return [...applicableRules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0] ?? null;
}

export function formatCurrency(amountMinor: number | null | undefined, currency = 'EUR'): string {
  if (amountMinor == null) return '—';
  const safeCurrency = currency.trim().toUpperCase() || 'EUR';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    }).format(amountMinor / 100);
  } catch {
    return `${safeCurrency} ${(amountMinor / 100).toFixed(2)}`;
  }
}
