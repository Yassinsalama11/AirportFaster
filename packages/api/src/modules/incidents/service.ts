import { prisma } from '@airportfaster/db';
import type {
  ListIncidentsQuery,
  CreateIncidentBody,
  AddIncidentUpdateBody,
  AssignIncidentBody,
  ResolveIncidentBody,
} from './validators.js';
import {
  listIncidents,
  findIncidentById,
  createIncident,
  addIncidentUpdate,
  assignIncident,
  resolveIncident,
} from './repository.js';
import type { IncidentRecord, IncidentListRecord } from './repository.js';

// ── Error class ───────────────────────────────────────────────────────────────

export class IncidentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'IncidentError';
  }
}

// ── List Incidents ────────────────────────────────────────────────────────────

export async function listIncidentsService(
  query: ListIncidentsQuery,
): Promise<{ items: IncidentListRecord[]; nextCursor: string | null }> {
  return listIncidents(query);
}

// ── Get Incident by ID ────────────────────────────────────────────────────────

export async function getIncidentByIdService(id: string): Promise<IncidentRecord> {
  const incident = await findIncidentById(id);
  if (!incident) {
    throw new IncidentError('Incident not found', 'INCIDENT_NOT_FOUND', 404);
  }
  return incident;
}

// ── Create Incident ───────────────────────────────────────────────────────────

export async function createIncidentService(
  body: CreateIncidentBody,
  actorId?: string,
): Promise<IncidentRecord> {
  // 1. Validate booking exists (if provided)
  if (body.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } });
    if (!booking) {
      throw new IncidentError('Booking not found', 'BOOKING_NOT_FOUND', 404);
    }
  }

  // 2. Create Incident + first IncidentUpdate (initial report)
  return createIncident({
    bookingId: body.bookingId,
    supplierId: body.supplierId,
    type: body.type,
    severity: body.severity,
    openedBy: actorId,
    initialDescription: body.description,
  });
}

// ── Add Update ────────────────────────────────────────────────────────────────

export async function addIncidentUpdateService(
  incidentId: string,
  body: AddIncidentUpdateBody,
  actorId?: string,
): Promise<IncidentRecord> {
  await getIncidentByIdService(incidentId);

  return addIncidentUpdate({
    incidentId,
    body: body.note,
    authorUserId: actorId,
    statusChange: body.statusChange,
  });
}

// ── Assign Incident ───────────────────────────────────────────────────────────

export async function assignIncidentService(
  incidentId: string,
  body: AssignIncidentBody,
): Promise<IncidentRecord> {
  const incident = await getIncidentByIdService(incidentId);

  if (incident.status === 'resolved' || incident.status === 'closed') {
    throw new IncidentError(
      `Cannot assign an incident in status '${incident.status}'`,
      'INCIDENT_ALREADY_CLOSED',
      422,
    );
  }

  if (!body.userId && !body.team) {
    throw new IncidentError(
      'Either userId or team must be provided for assignment',
      'MISSING_ASSIGNMENT_TARGET',
      422,
    );
  }

  return assignIncident({
    incidentId,
    userId: body.userId,
    team: body.team,
  });
}

// ── Resolve Incident ──────────────────────────────────────────────────────────

export async function resolveIncidentService(
  incidentId: string,
  body: ResolveIncidentBody,
  actorId?: string,
): Promise<IncidentRecord> {
  const incident = await getIncidentByIdService(incidentId);

  if (incident.status === 'resolved' || incident.status === 'closed') {
    throw new IncidentError(
      `Incident is already '${incident.status}'`,
      'INCIDENT_ALREADY_RESOLVED',
      422,
    );
  }

  return resolveIncident({
    incidentId,
    resolution: body.resolution,
    authorUserId: actorId,
  });
}
