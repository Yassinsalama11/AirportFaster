export type PassengerType = 'adult' | 'child' | 'infant';
export type PricingDirection = 'arrival' | 'departure' | 'both';
export type PricingModel = 'flat_per_type' | 'tiered' | 'group' | 'duration_based';

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface BookingPricingRule {
  id?: string;
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
  selectedRuleId?: string | null,
): BookingPricingRule | null {
  const applicableRules = getApplicablePricingRules(rules, selectedDirection);
  if (applicableRules.length === 0) return null;
  if (selectedRuleId) {
    const selected = applicableRules.find((rule) => rule.id === selectedRuleId);
    if (selected) return selected;
  }

  return applicableRules[0] ?? null;
}

export function getApplicablePricingRules(
  rules: BookingPricingRule[] | undefined,
  selectedDirection?: 'arrival' | 'departure' | '',
): BookingPricingRule[] {
  if (!rules || rules.length === 0) return [];
  const direction = selectedDirection || undefined;
  const applicableRules = direction
    ? rules.filter((rule) => rule.direction === direction || rule.direction === 'both' || rule.direction == null)
    : rules;

  return [...applicableRules].sort((a, b) => {
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return (a.basePriceMinor ?? 0) - (b.basePriceMinor ?? 0);
  });
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

export function getPricingRuleDisplayName(
  rule: BookingPricingRule | null | undefined,
  serviceName = 'Airport service',
): string {
  switch (rule?.pricingModel ?? 'flat_per_type') {
    case 'group':
      return 'Private group assistance';
    case 'tiered':
      return 'VIP individual assistance';
    case 'duration_based':
      return 'Dedicated timed assistance';
    case 'flat_per_type':
    default:
      return `Essential ${serviceName}`;
  }
}

export function getPricingRuleDescription(rule: BookingPricingRule | null | undefined): string {
  switch (rule?.pricingModel ?? 'flat_per_type') {
    case 'group':
      return `Designed for families and small groups. Includes up to ${rule?.groupSizeIncluded ?? 1} traveler${(rule?.groupSizeIncluded ?? 1) === 1 ? '' : 's'} before extra traveler pricing applies.`;
    case 'tiered':
      return 'Best for VIP assistance where the first traveler has a base rate and each extra traveler is priced separately.';
    case 'duration_based':
      return `Reserved assistance for a fixed service duration${rule?.durationHours ? ` of ${rule.durationHours} hour${rule.durationHours === 1 ? '' : 's'}` : ''}.`;
    case 'flat_per_type':
    default:
      return 'Simple per-traveler pricing for the selected airport service.';
  }
}
