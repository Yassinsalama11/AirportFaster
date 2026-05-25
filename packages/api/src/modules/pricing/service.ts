import {
  findActiveRulesForService,
  findCurrencyRate,
  findPromoCodeByCode,
} from './repository.js';

export interface QuoteParams {
  airportServiceId: string;
  passengers: number;
  passengerTypes?: Array<'adult' | 'child' | 'infant'>;
  direction?: 'arrival' | 'departure' | 'transit';
  pricingRuleId?: string;
  currency: string; // requested display currency
  promoCode?: string;
  supplierId?: string;
}

interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

function getPassengerCounts(params: QuoteParams): PassengerCounts {
  if (params.passengerTypes && params.passengerTypes.length > 0) {
    return params.passengerTypes.reduce<PassengerCounts>(
      (counts, type) => {
        if (type === 'adult') counts.adults += 1;
        if (type === 'child') counts.children += 1;
        if (type === 'infant') counts.infants += 1;
        return counts;
      },
      { adults: 0, children: 0, infants: 0 },
    );
  }

  return { adults: params.passengers, children: 0, infants: 0 };
}

function totalPassengers(counts: PassengerCounts): number {
  return counts.adults + counts.children + counts.infants;
}

function calculateModelPrice(
  rule: Awaited<ReturnType<typeof findActiveRulesForService>>[number],
  counts: PassengerCounts,
  source: 'customer' | 'supplier',
): number {
  const total = totalPassengers(counts);
  const base =
    source === 'customer'
      ? rule.basePriceMinor ?? 0
      : rule.supplierCostMinor ?? rule.basePriceMinor ?? 0;
  const first =
    source === 'customer'
      ? rule.firstPassengerMinor ?? base
      : rule.supplierCostFirstMinor ?? rule.supplierCostMinor ?? rule.firstPassengerMinor ?? base;
  const extra =
    source === 'customer'
      ? rule.extraPassengerMinor ?? 0
      : rule.supplierCostExtraMinor ?? rule.supplierCostMinor ?? rule.extraPassengerMinor ?? 0;

  switch (rule.pricingModel) {
    case 'flat_per_type': {
      if (source === 'customer' && rule.passengerPricing) {
        const pax = rule.passengerPricing as Record<string, number>;
        return (
          (pax['adult'] ?? base) * counts.adults +
          (pax['child'] ?? pax['adult'] ?? base) * counts.children +
          (pax['infant'] ?? 0) * counts.infants
        );
      }
      return base * total;
    }
    case 'tiered':
      if (total === 0) return 0;
      return first + Math.max(0, total - 1) * extra;
    case 'group':
      return base + Math.max(0, total - (rule.groupSizeIncluded ?? 1)) * extra;
    case 'duration_based':
      return base * total;
    default:
      return base * total;
  }
}

export interface QuoteResult {
  customerPriceMinor: number;
  supplierCostMinor: number;
  markupMinor: number;
  discountMinor: number;
  taxEstimateMinor: 0;
  marginMinor: number;
  currency: string; // rule's native currency
  displayCurrency: string; // requested display currency
  appliedRuleId: string;
  promoCodeApplied?: string;
}

/**
 * Compute a quote for an airport service.
 * Pure computation — no writes, no audit logs. Does DB reads.
 */
export async function quote(params: QuoteParams): Promise<QuoteResult | null> {
  const now = new Date();
  const rules = await findActiveRulesForService(params.airportServiceId);

  if (rules.length === 0) return null;

  // Sort: supplier-specific beat general, then by priority desc
  const sorted = [...rules].sort((a, b) => {
    const aSupplier = a.supplierId != null ? 1 : 0;
    const bSupplier = b.supplierId != null ? 1 : 0;
    if (aSupplier !== bSupplier) return bSupplier - aSupplier;
    return b.priority - a.priority;
  });

  // Filter by supplierId match if provided
  const applicable = sorted.filter((r) => {
    if (params.direction && params.direction !== 'transit' && r.direction !== params.direction && r.direction !== 'both') {
      return false;
    }
    if (params.supplierId) {
      return r.supplierId === params.supplierId || r.supplierId === null;
    }
    return true;
  });

  if (applicable.length === 0) return null;

  const selectedRule = params.pricingRuleId
    ? applicable.find((r) => r.id === params.pricingRuleId)
    : undefined;
  const rule = selectedRule ?? applicable[0]!;
  const passengerCounts = getPassengerCounts(params);

  // Step 3-4: Compute base customer price from rule
  let customerPriceMinor: number;
  let supplierCostMinor: number;
  let markupMinor: number;

  if (rule.mode === 'fixed') {
    customerPriceMinor = calculateModelPrice(rule, passengerCounts, 'customer');
    supplierCostMinor = calculateModelPrice(rule, passengerCounts, 'supplier');
    markupMinor = 0;
  } else {
    // cost_plus_markup
    const cost = calculateModelPrice(rule, passengerCounts, 'supplier');
    supplierCostMinor = cost;
    const mv = rule.markupValue ? Number(rule.markupValue) : 0;

    if (rule.markupType === 'percentage') {
      // To avoid float drift: multiply by (10000 + mv*100) then divide by 10000
      customerPriceMinor = Math.round((cost * (10000 + mv * 100)) / 10000);
    } else {
      // fixed_amount — mv is already in minor units
      customerPriceMinor = Math.round(cost + mv);
    }
    markupMinor = customerPriceMinor - supplierCostMinor;
  }

  // Step 6: Apply promo code discount
  let discountMinor = 0;
  let promoCodeApplied: string | undefined;

  if (params.promoCode) {
    const promo = await findPromoCodeByCode(params.promoCode);
    if (promo && promo.status === 'active') {
      const now2 = now;
      const validNow =
        (!promo.validFrom || promo.validFrom <= now2) &&
        (!promo.validTo || promo.validTo >= now2);
      const redemptionsOk =
        promo.maxRedemptions == null ||
        promo.redemptionsUsed < promo.maxRedemptions;
      const minOk =
        promo.minBookingMinor == null ||
        customerPriceMinor >= promo.minBookingMinor;

      if (validNow && redemptionsOk && minOk) {
        const dv = Number(promo.discountValue);
        if (promo.discountType === 'percentage') {
          discountMinor = Math.round((customerPriceMinor * dv) / 100);
        } else {
          discountMinor = Math.round(dv);
        }
        discountMinor = Math.min(discountMinor, customerPriceMinor);
        customerPriceMinor = customerPriceMinor - discountMinor;
        promoCodeApplied = promo.code;
      }
    }
  }

  // Step 7: Currency conversion
  const ruleCurrency = rule.currency;
  let displayCurrency = params.currency;
  let finalPrice = customerPriceMinor;

  if (params.currency !== ruleCurrency) {
    const rate = await findCurrencyRate(ruleCurrency, params.currency);
    if (rate) {
      finalPrice = Math.round(customerPriceMinor * Number(rate.rate));
    } else {
      // No rate found — return in rule's native currency
      displayCurrency = ruleCurrency;
    }
  }

  // Step 8: Return result
  const marginMinor = finalPrice - Math.round(supplierCostMinor * (params.currency === ruleCurrency ? 1 : Number((await findCurrencyRate(ruleCurrency, displayCurrency))?.rate ?? 1)));

  return {
    customerPriceMinor: finalPrice,
    supplierCostMinor,
    markupMinor,
    discountMinor,
    taxEstimateMinor: 0,
    marginMinor: Math.max(0, finalPrice - supplierCostMinor),
    currency: ruleCurrency,
    displayCurrency,
    appliedRuleId: rule.id,
    promoCodeApplied,
  };
}
