import { prisma, Prisma } from '@airportfaster/db';
import type { CreatePricingRule, UpdatePricingRule, CreatePromoCode } from './validators.js';

// ── Pricing Rules ─────────────────────────────────────────────────────────────

export async function listPricingRules(airportServiceId: string) {
  return prisma.pricingRule.findMany({
    where: { airportServiceId },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function findPricingRuleById(id: string) {
  return prisma.pricingRule.findUnique({ where: { id } });
}

export async function createPricingRule(data: CreatePricingRule) {
  return prisma.pricingRule.create({
    data: {
      airportServiceId: data.airportServiceId,
      supplierId: data.supplierId ?? null,
      mode: data.mode,
      direction: data.direction,
      pricingModel: data.pricingModel,
      basePriceMinor: data.basePriceMinor ?? null,
      firstPassengerMinor: data.firstPassengerMinor ?? null,
      extraPassengerMinor: data.extraPassengerMinor ?? null,
      groupSizeIncluded: data.groupSizeIncluded ?? null,
      durationHours: data.durationHours ?? null,
      supplierCostMinor: data.supplierCostMinor ?? null,
      supplierCostFirstMinor: data.supplierCostFirstMinor ?? null,
      supplierCostExtraMinor: data.supplierCostExtraMinor ?? null,
      markupType: data.markupType ?? null,
      markupValue: data.markupValue != null ? new Prisma.Decimal(data.markupValue) : null,
      currency: data.currency,
      passengerPricing: data.passengerPricing
        ? (data.passengerPricing as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      peakRules: data.peakRules != null ? (data.peakRules as Prisma.InputJsonValue) : Prisma.JsonNull,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validTo: data.validTo ? new Date(data.validTo) : null,
      priority: data.priority,
      status: data.status,
    },
  });
}

export async function updatePricingRule(id: string, data: UpdatePricingRule) {
  return prisma.pricingRule.update({
    where: { id },
    data: {
      supplierId: data.supplierId ?? undefined,
      mode: data.mode,
      direction: data.direction,
      pricingModel: data.pricingModel,
      basePriceMinor: data.basePriceMinor ?? undefined,
      firstPassengerMinor: data.firstPassengerMinor ?? undefined,
      extraPassengerMinor: data.extraPassengerMinor ?? undefined,
      groupSizeIncluded: data.groupSizeIncluded ?? undefined,
      durationHours: data.durationHours ?? undefined,
      supplierCostMinor: data.supplierCostMinor ?? undefined,
      supplierCostFirstMinor: data.supplierCostFirstMinor ?? undefined,
      supplierCostExtraMinor: data.supplierCostExtraMinor ?? undefined,
      markupType: data.markupType ?? undefined,
      markupValue:
        data.markupValue != null ? new Prisma.Decimal(data.markupValue) : undefined,
      currency: data.currency,
      passengerPricing: data.passengerPricing
        ? (data.passengerPricing as Prisma.InputJsonValue)
        : undefined,
      validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
      validTo: data.validTo ? new Date(data.validTo) : undefined,
      priority: data.priority,
      status: data.status,
    },
  });
}

export async function softDeletePricingRule(id: string) {
  return prisma.pricingRule.update({
    where: { id },
    data: { status: 'inactive' },
  });
}

export async function findActiveRulesForService(airportServiceId: string) {
  const now = new Date();
  return prisma.pricingRule.findMany({
    where: {
      airportServiceId,
      status: 'active',
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
        { OR: [{ validTo: null }, { validTo: { gte: now } }] },
      ],
    },
    orderBy: [
      // supplier-specific first — we'll sort in JS since supplierId nullable ordering varies
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });
}

// ── Currency Rates ────────────────────────────────────────────────────────────

export async function findCurrencyRate(baseCurrency: string, quoteCurrency: string) {
  return prisma.currencyRate.findUnique({
    where: { baseCurrency_quoteCurrency: { baseCurrency, quoteCurrency } },
  });
}

// ── Promo Codes ───────────────────────────────────────────────────────────────

export async function listPromoCodes() {
  return prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function findPromoCodeByCode(code: string) {
  return prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
}

export async function findPromoCodeById(id: string) {
  return prisma.promoCode.findUnique({ where: { id } });
}

export async function createPromoCode(data: CreatePromoCode) {
  return prisma.promoCode.create({
    data: {
      code: data.code.toUpperCase(),
      discountType: data.discountType,
      discountValue: new Prisma.Decimal(data.discountValue),
      currency: data.currency ?? null,
      maxRedemptions: data.maxRedemptions ?? null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validTo: data.validTo ? new Date(data.validTo) : null,
      minBookingMinor: data.minBookingMinor ?? null,
      status: data.status,
    },
  });
}

export async function updatePromoCode(id: string, data: Partial<CreatePromoCode>) {
  return prisma.promoCode.update({
    where: { id },
    data: {
      discountType: data.discountType,
      discountValue:
        data.discountValue != null ? new Prisma.Decimal(data.discountValue) : undefined,
      currency: data.currency,
      maxRedemptions: data.maxRedemptions,
      validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
      validTo: data.validTo ? new Date(data.validTo) : undefined,
      minBookingMinor: data.minBookingMinor,
      status: data.status,
    },
  });
}
