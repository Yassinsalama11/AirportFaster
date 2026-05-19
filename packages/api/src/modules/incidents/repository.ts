import { prisma, Prisma } from '@airportfaster/db';
import type { IncidentStatus, IncidentTeam } from '@airportfaster/db';
import type { ListIncidentsQuery } from './validators.js';

// ── Include shape ────────────────────────────────────────────────────────────

const incidentInclude = {
  updates: { orderBy: { createdAt: 'asc' as const } },
  assignments: { orderBy: { assignedAt: 'desc' as const } },
} satisfies Prisma.IncidentInclude;

export type IncidentRecord = Prisma.IncidentGetPayload<{
  include: typeof incidentInclude;
}>;

// ── List Include (lighter, with booking/customer info) ────────────────────────

const incidentListInclude = {
  updates: { orderBy: { createdAt: 'asc' as const }, take: 1 },
  assignments: { orderBy: { assignedAt: 'desc' as const }, take: 1 },
} satisfies Prisma.IncidentInclude;

export type IncidentListRecord = Prisma.IncidentGetPayload<{
  include: typeof incidentListInclude;
}>;

// ── List ─────────────────────────────────────────────────────────────────────

export async function listIncidents(query: ListIncidentsQuery): Promise<{
  items: IncidentListRecord[];
  nextCursor: string | null;
}> {
  const where: Prisma.IncidentWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.severity ? { severity: query.severity } : {}),
    ...(query.bookingId ? { bookingId: query.bookingId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    createdAt: {
      gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
      lte: query.dateTo ? new Date(`${query.dateTo}T23:59:59Z`) : undefined,
    },
  };

  const items = await prisma.incident.findMany({
    where,
    include: incidentListInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    take: query.pageSize + 1,
  });

  const hasMore = items.length > query.pageSize;
  if (hasMore) items.pop();

  return {
    items,
    nextCursor: hasMore && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null,
  };
}

// ── Find by ID ───────────────────────────────────────────────────────────────

export async function findIncidentById(id: string): Promise<IncidentRecord | null> {
  return prisma.incident.findUnique({
    where: { id },
    include: incidentInclude,
  });
}

// ── Create Incident ───────────────────────────────────────────────────────────

export async function createIncident(data: {
  bookingId?: string;
  supplierId?: string;
  type: string;
  severity: string;
  openedBy?: string;
  initialDescription: string;
}): Promise<IncidentRecord> {
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incident.create({
      data: {
        bookingId: data.bookingId ?? null,
        supplierId: data.supplierId ?? null,
        type: data.type as Parameters<typeof tx.incident.create>[0]['data']['type'],
        severity: data.severity as Parameters<typeof tx.incident.create>[0]['data']['severity'],
        status: 'created',
        openedBy: data.openedBy ?? null,
      },
      include: incidentInclude,
    });

    // First update = initial report (description stored here, not on Incident)
    await tx.incidentUpdate.create({
      data: {
        incidentId: incident.id,
        authorUserId: data.openedBy ?? null,
        body: data.initialDescription,
      },
    });

    // Re-fetch with updates included
    return tx.incident.findUniqueOrThrow({
      where: { id: incident.id },
      include: incidentInclude,
    });
  });
}

// ── Add Update ────────────────────────────────────────────────────────────────

export async function addIncidentUpdate(data: {
  incidentId: string;
  body: string;
  authorUserId?: string;
  statusChange?: IncidentStatus;
}): Promise<IncidentRecord> {
  return prisma.$transaction(async (tx) => {
    await tx.incidentUpdate.create({
      data: {
        incidentId: data.incidentId,
        body: data.body,
        authorUserId: data.authorUserId ?? null,
      },
    });

    if (data.statusChange) {
      await tx.incident.update({
        where: { id: data.incidentId },
        data: { status: data.statusChange },
      });
    }

    return tx.incident.findUniqueOrThrow({
      where: { id: data.incidentId },
      include: incidentInclude,
    });
  });
}

// ── Assign Incident ───────────────────────────────────────────────────────────

export async function assignIncident(data: {
  incidentId: string;
  userId?: string;
  team?: IncidentTeam;
}): Promise<IncidentRecord> {
  return prisma.$transaction(async (tx) => {
    await tx.incidentAssignment.create({
      data: {
        incidentId: data.incidentId,
        assignedToUserId: data.userId ?? null,
        assignedTeam: data.team ?? null,
      },
    });

    // Update status to 'assigned' if currently 'created'
    const incident = await tx.incident.findUniqueOrThrow({
      where: { id: data.incidentId },
    });

    if (incident.status === 'created') {
      await tx.incident.update({
        where: { id: data.incidentId },
        data: { status: 'assigned' },
      });
    }

    return tx.incident.findUniqueOrThrow({
      where: { id: data.incidentId },
      include: incidentInclude,
    });
  });
}

// ── Resolve Incident ──────────────────────────────────────────────────────────

export async function resolveIncident(data: {
  incidentId: string;
  resolution: string;
  authorUserId?: string;
}): Promise<IncidentRecord> {
  return prisma.$transaction(async (tx) => {
    await tx.incident.update({
      where: { id: data.incidentId },
      data: {
        status: 'resolved',
        resolutionReason: data.resolution,
        resolvedAt: new Date(),
      },
    });

    await tx.incidentUpdate.create({
      data: {
        incidentId: data.incidentId,
        body: `Resolved: ${data.resolution}`,
        authorUserId: data.authorUserId ?? null,
      },
    });

    return tx.incident.findUniqueOrThrow({
      where: { id: data.incidentId },
      include: incidentInclude,
    });
  });
}
