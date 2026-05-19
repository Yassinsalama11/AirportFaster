import {
  findActiveRulesForService,
  findCurrencyRate,
  findPromoCodeByCode,
} from './repository.js';

export interface QuoteParams {
  airportServiceId: string;
  passengers: number;
  currency: string; // requested display currency
  promoCode?: string;
  supplierId?: string;
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
    if (params.supplierId) {
      return r.supplierId === params.supplierId || r.supplierId === null;
    }
    return true;
  });

  if (applicable.length === 0) return null;

  const rule = applicable[0]!;

  // Step 3-4: Compute base customer price from rule
  let customerPriceMinor: number;
  let supplierCostMinor: number;
  let markupMinor: number;

  if (rule.mode === 'fixed') {
    customerPriceMinor = rule.basePriceMinor ?? 0;
    supplierCostMinor = rule.basePriceMinor ?? 0;
    markupMinor = 0;
  } else {
    // cost_plus_markup
    const cost = rule.supplierCostMinor ?? 0;
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

  // Step 5: Apply passenger multiplier
  if (rule.passengerPricing && params.passengers > 1) {
    const pax = rule.passengerPricing as Record<string, number>;
    const key = String(params.passengers);
    const multiplier = pax[key] ?? pax['default'] ?? 1.0;
    customerPriceMinor = Math.round(customerPriceMinor * multiplier);
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
