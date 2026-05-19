import { prisma } from '@airportfaster/db';
import { Prisma } from '@airportfaster/db';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssignmentContext {
  airportServiceId: string;
  airportId: string;
  serviceDate: Date;
  passengerCount: number;
}

interface AssignmentConfig {
  minReliabilityScore: number;
  autoAssignEnabled: boolean;
}

// ── Config helpers ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AssignmentConfig = {
  minReliabilityScore: 0.7,
  autoAssignEnabled: true,
};

async function getAssignmentConfig(): Promise<AssignmentConfig> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'supplier_assignment' },
  });

  if (!setting) return DEFAULT_CONFIG;

  const value = setting.value as Record<string, unknown>;
  return {
    minReliabilityScore:
      typeof value['minReliabilityScore'] === 'number'
        ? value['minReliabilityScore']
        : DEFAULT_CONFIG.minReliabilityScore,
    autoAssignEnabled:
      typeof value['autoAssignEnabled'] === 'boolean'
        ? value['autoAssignEnabled']
        : DEFAULT_CONFIG.autoAssignEnabled,
  };
}

// ── Core assignment logic ─────────────────────────────────────────────────────

/**
 * Find the best eligible supplier for a booking using rule-based logic:
 * 1. SLA filtering: skip suppliers with reliabilityScore < minReliabilityScore
 * 2. Capacity check: verify serviceDate falls on a covered dayOfWeek and supplier is not at capacity
 * 3. Round-robin tiebreaker: among suppliers with the same priority, pick the one with fewest 7-day assignments
 *
 * Returns supplierId or null if no eligible supplier found.
 */
export async function findBestSupplier(ctx: AssignmentContext): Promise<string | null> {
  const config = await getAssignmentConfig();

  if (!config.autoAssignEnabled) {
    return null;
  }

  // Get the day of week for serviceDate (0=Sunday, 1=Monday, ..., 6=Saturday)
  const dayOfWeek = ctx.serviceDate.getUTCDay();

  // Start of serviceDate and end of serviceDate (UTC)
  const dayStart = new Date(ctx.serviceDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(ctx.serviceDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  // 7-day window for round-robin
  const sevenDaysAgo = new Date(ctx.serviceDate);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  // Load all active coverages for this airportService, ordered by priority ASC
  const coverages = await prisma.supplierCoverage.findMany({
    where: {
      airportServiceId: ctx.airportServiceId,
      status: 'active',
    },
    include: {
      supplier: {
        include: {
          schedules: {
            where: {
              airportId: ctx.airportId,
              status: 'active',
            },
          },
        },
      },
    },
    orderBy: { priority: 'asc' },
  });

  if (coverages.length === 0) return null;

  // Filter eligible suppliers
  interface EligibleCandidate {
    supplierId: string;
    priority: number;
    capacity: number;
    currentCount: number;
  }

  const eligible: EligibleCandidate[] = [];

  for (const coverage of coverages) {
    const supplier = coverage.supplier;

    // 1. SLA check: skip if reliabilityScore is set and below threshold
    if (supplier.reliabilityScore !== null) {
      const score = new Prisma.Decimal(config.minReliabilityScore);
      if (supplier.reliabilityScore.lessThan(score)) {
        continue;
      }
    }

    // 2. Capacity check via SupplierScheduleLink
    const schedule = supplier.schedules[0];
    if (!schedule) {
      // No schedule configured — skip
      continue;
    }

    // Check if serviceDate's day of week is covered
    const coveredDays: number[] = schedule.daysOfWeek;
    if (!coveredDays.includes(dayOfWeek)) {
      continue;
    }

    // Count existing confirmed assignments for this supplier on serviceDate
    const assignmentCount = await prisma.bookingSupplierAssignment.count({
      where: {
        supplierId: supplier.id,
        status: { in: ['offered', 'accepted'] },
        booking: {
          serviceDateTime: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      },
    });

    if (assignmentCount >= schedule.capacity) {
      // At capacity for this date — skip
      continue;
    }

    eligible.push({
      supplierId: supplier.id,
      priority: coverage.priority,
      capacity: schedule.capacity,
      currentCount: assignmentCount,
    });
  }

  if (eligible.length === 0) return null;

  // 3. Round-robin tiebreaker among suppliers with same priority as the top candidate
  const topPriority = eligible[0]!.priority;
  const topGroup = eligible.filter((e) => e.priority === topPriority);

  if (topGroup.length === 1) {
    return topGroup[0]!.supplierId;
  }

  // Count assignments in last 7 days for each top-priority supplier
  const withRecentCounts = await Promise.all(
    topGroup.map(async (candidate) => {
      const recentCount = await prisma.bookingSupplierAssignment.count({
        where: {
          supplierId: candidate.supplierId,
          createdAt: { gte: sevenDaysAgo },
        },
      });
      return { ...candidate, recentCount };
    }),
  );

  // Pick the one with fewest recent assignments (round-robin)
  withRecentCounts.sort((a, b) => a.recentCount - b.recentCount);
  return withRecentCounts[0]!.supplierId;
}
