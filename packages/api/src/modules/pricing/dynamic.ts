import { prisma } from '@airportfaster/db';
import { quote } from './service.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DemandSignals {
  bookingsLast7Days: number;
  searchesLast24h: number;
  availableCapacity: number;
  maxCapacity: number;
  daysUntilService: number;
  isHighSeason: boolean;
}

// ── Demand multiplier heuristic ───────────────────────────────────────────────

export function calculateDemandMultiplier(signals: DemandSignals): number {
  let multiplier = 1.0;

  // Capacity utilization
  const utilization =
    signals.maxCapacity > 0
      ? signals.availableCapacity / signals.maxCapacity
      : 0;
  // Note: availableCapacity is *remaining* slots, so utilization here means "how full"
  // We interpret (maxCapacity - availableCapacity) / maxCapacity as "used"
  const usedFraction =
    signals.maxCapacity > 0
      ? (signals.maxCapacity - signals.availableCapacity) / signals.maxCapacity
      : 0;

  if (usedFraction > 0.95) {
    multiplier += 0.4; // +40%
  } else if (usedFraction > 0.8) {
    multiplier += 0.2; // +20%
  }

  // Urgency: 3 days or less until service
  if (signals.daysUntilService <= 3) {
    multiplier += 0.15; // +15%
  }

  // High season: July (7), August (8), December (12)
  if (signals.isHighSeason) {
    multiplier += 0.1; // +10%
  }

  // Low demand: promotional discount
  if (signals.bookingsLast7Days < 3) {
    multiplier -= 0.1; // -10%
  }

  // Clamp between 0.8 and 1.5
  return Math.min(1.5, Math.max(0.8, multiplier));
}

// ── Collect demand signals from DB ───────────────────────────────────────────

async function collectDemandSignals(
  airportServiceId: string,
  serviceDate: Date,
): Promise<DemandSignals> {
  const now = new Date();

  // Bookings in last 7 days for this service
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const bookingsLast7Days = await prisma.booking.count({
    where: {
      airportServiceId,
      createdAt: { gte: sevenDaysAgo },
      status: { notIn: ['cancelled', 'failed', 'draft'] },
    },
  });

  // Searches in last 24h for this airport service's airport/service
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const airportService = await prisma.airportService.findUnique({
    where: { id: airportServiceId },
    select: { airportId: true, serviceId: true },
  });

  const searchesLast24h = airportService
    ? await prisma.searchEvent.count({
        where: {
          airportId: airportService.airportId,
          serviceId: airportService.serviceId,
          createdAt: { gte: oneDayAgo },
        },
      })
    : 0;

  // Capacity: aggregate from availability rules
  const availabilityRules = await prisma.availabilityRule.findMany({
    where: { airportServiceId, status: 'active' },
    select: { capacityPerSlot: true },
  });

  const maxCapacity =
    availabilityRules.reduce(
      (sum, r) => sum + (r.capacityPerSlot ?? 10),
      0,
    ) || 10;

  // Available capacity = max - bookings already made for that date
  const startOfDay = new Date(serviceDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(serviceDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const bookingsOnDay = await prisma.booking.count({
    where: {
      airportServiceId,
      serviceDateTime: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ['cancelled', 'failed', 'draft'] },
    },
  });

  const availableCapacity = Math.max(0, maxCapacity - bookingsOnDay);

  // Days until service
  const msUntilService = serviceDate.getTime() - now.getTime();
  const daysUntilService = Math.max(0, Math.floor(msUntilService / (24 * 60 * 60 * 1000)));

  // High season: July (6), August (7), December (11) — JS month is 0-indexed
  const month = serviceDate.getMonth();
  const isHighSeason = month === 6 || month === 7 || month === 11;

  return {
    bookingsLast7Days,
    searchesLast24h,
    availableCapacity,
    maxCapacity,
    daysUntilService,
    isHighSeason,
  };
}

// ── Check if dynamic pricing is enabled ──────────────────────────────────────

async function isDynamicPricingEnabled(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'dynamic_pricing_enabled' },
  });
  if (!setting) return false;
  const val = setting.value;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    return obj['enabled'] === true;
  }
  return false;
}

// ── Build multiplier reason string ────────────────────────────────────────────

export function buildMultiplierReason(signals: DemandSignals): string[] {
  const reasons: string[] = [];

  const usedFraction =
    signals.maxCapacity > 0
      ? (signals.maxCapacity - signals.availableCapacity) / signals.maxCapacity
      : 0;

  if (usedFraction > 0.95) {
    reasons.push('Capacity >95% full (+40%)');
  } else if (usedFraction > 0.8) {
    reasons.push('Capacity >80% full (+20%)');
  }

  if (signals.daysUntilService <= 3) {
    reasons.push('Service within 3 days (+15%)');
  }

  if (signals.isHighSeason) {
    reasons.push('High season (+10%)');
  }

  if (signals.bookingsLast7Days < 3) {
    reasons.push('Low demand — promotional (-10%)');
  }

  if (reasons.length === 0) {
    reasons.push('Standard pricing');
  }

  return reasons;
}

// ── Main exported function ────────────────────────────────────────────────────

export async function getDynamicPrice(
  airportServiceId: string,
  serviceDate: Date,
  passengerCount: number,
): Promise<{
  baseMinorUnits: number;
  multiplier: number;
  multiplierReasons: string[];
  finalMinorUnits: number;
  currency: string;
  signals: DemandSignals;
}> {
  // 1. Get base price from existing pricing engine
  const baseQuote = await quote({
    airportServiceId,
    passengers: passengerCount,
    currency: 'EUR',
  });

  const baseMinorUnits = baseQuote?.customerPriceMinor ?? 0;
  const currency = baseQuote?.displayCurrency ?? 'EUR';

  // 2. Check if dynamic pricing is enabled
  const enabled = await isDynamicPricingEnabled();

  if (!enabled) {
    return {
      baseMinorUnits,
      multiplier: 1.0,
      multiplierReasons: ['Dynamic pricing disabled'],
      finalMinorUnits: baseMinorUnits,
      currency,
      signals: {
        bookingsLast7Days: 0,
        searchesLast24h: 0,
        availableCapacity: 0,
        maxCapacity: 0,
        daysUntilService: 0,
        isHighSeason: false,
      },
    };
  }

  // 3. Collect demand signals from DB
  const signals = await collectDemandSignals(airportServiceId, serviceDate);

  // 4. Calculate multiplier
  const multiplier = calculateDemandMultiplier(signals);
  const multiplierReasons = buildMultiplierReason(signals);

  // 5. Apply multiplier
  const finalMinorUnits = Math.round(baseMinorUnits * multiplier);

  return {
    baseMinorUnits,
    multiplier,
    multiplierReasons,
    finalMinorUnits,
    currency,
    signals,
  };
}
