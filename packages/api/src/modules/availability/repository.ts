import { prisma, Prisma } from '@airportfaster/db';
import type { CreateAvailabilityRule } from './validators.js';

export async function listAvailabilityRules(airportServiceId: string) {
  return prisma.availabilityRule.findMany({
    where: { airportServiceId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findAvailabilityRuleById(id: string) {
  return prisma.availabilityRule.findUnique({ where: { id } });
}

export async function createAvailabilityRule(data: CreateAvailabilityRule) {
  return prisma.availabilityRule.create({
    data: {
      airportServiceId: data.airportServiceId,
      daysOfWeek: data.daysOfWeek,
      timeWindows: data.timeWindows as Prisma.InputJsonValue,
      cutOffMinutes: data.cutOffMinutes,
      minNoticeMinutes: data.minNoticeMinutes,
      capacityPerSlot: data.capacityPerSlot ?? null,
      status: data.status,
    },
  });
}

export async function updateAvailabilityRule(id: string, data: Partial<CreateAvailabilityRule>) {
  return prisma.availabilityRule.update({
    where: { id },
    data: {
      daysOfWeek: data.daysOfWeek,
      timeWindows: data.timeWindows ? (data.timeWindows as Prisma.InputJsonValue) : undefined,
      cutOffMinutes: data.cutOffMinutes,
      minNoticeMinutes: data.minNoticeMinutes,
      capacityPerSlot: data.capacityPerSlot,
      status: data.status,
    },
  });
}

export async function deleteAvailabilityRule(id: string) {
  return prisma.availabilityRule.delete({ where: { id } });
}

export async function findActiveRules(airportServiceId: string) {
  return prisma.availabilityRule.findMany({
    where: { airportServiceId, status: 'active' },
  });
}

export async function findBlackoutDates(scopeType: 'airport' | 'airport_service', scopeId: string) {
  return prisma.blackoutDate.findMany({
    where: { scopeType, scopeId },
    orderBy: { dateFrom: 'asc' },
  });
}

export async function createBlackoutDate(data: {
  scopeType: 'airport' | 'airport_service';
  scopeId: string;
  dateFrom: string;
  dateTo: string;
  reason?: string;
}) {
  return prisma.blackoutDate.create({
    data: {
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      dateFrom: new Date(data.dateFrom),
      dateTo: new Date(data.dateTo),
      reason: data.reason ?? null,
    },
  });
}

export async function deleteBlackoutDate(id: string) {
  return prisma.blackoutDate.delete({ where: { id } });
}

export async function findBlackoutsForDate(
  date: Date,
  airportId: string,
  airportServiceId: string,
) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  return prisma.blackoutDate.findMany({
    where: {
      AND: [
        { dateFrom: { lte: date } },
        { dateTo: { gte: date } },
        {
          OR: [
            { scopeType: 'airport', scopeId: airportId },
            { scopeType: 'airport_service', scopeId: airportServiceId },
          ],
        },
      ],
    },
  });
}

export async function findAirportServiceWithAirport(airportServiceId: string) {
  return prisma.airportService.findUnique({
    where: { id: airportServiceId },
    include: { airport: true },
  });
}
