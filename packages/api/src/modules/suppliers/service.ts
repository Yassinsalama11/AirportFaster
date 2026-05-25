import { Prisma, prisma, type DayOfWeek } from '@airportfaster/db';
import {
  findSupplierById,
  createSupplier,
  updateSupplier,
  suspendSupplier,
  listSuppliers,
  addContact,
  removeContact,
  linkAirport,
  unlinkAirport,
  linkService,
  unlinkService,
  addCoverage,
  removeCoverage,
} from './repository.js';
import type {
  CreateSupplierBody,
  UpdateSupplierBody,
  ListSuppliersQuery,
  CreateContactBody,
  AddCoverageBody,
  PutSupplierAvailabilityBody,
  SupplierAvailabilityDay,
} from './validators.js';
import type { SupplierRecord } from './repository.js';

const ALL_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DEFAULT_AVAILABILITY: SupplierAvailabilityDay[] = ALL_DAYS.map((d) => ({
  dayOfWeek: d,
  openTime: '08:00',
  closeTime: '22:00',
  isAvailable: true,
}));

export async function getSupplierAvailabilityService(
  supplierId: string,
): Promise<SupplierAvailabilityDay[]> {
  await getSupplierService(supplierId);
  const rows = await prisma.supplierAvailability.findMany({
    where: { supplierId },
  });
  // Merge defaults: any missing day returns the default 08:00-22:00 open row.
  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));
  return ALL_DAYS.map((day) => {
    const row = byDay.get(day);
    if (row) {
      return {
        dayOfWeek: day,
        openTime: row.openTime,
        closeTime: row.closeTime,
        isAvailable: row.isAvailable,
      };
    }
    return DEFAULT_AVAILABILITY.find((d) => d.dayOfWeek === day)!;
  });
}

export async function updateSupplierAvailabilityService(
  supplierId: string,
  data: PutSupplierAvailabilityBody,
): Promise<SupplierAvailabilityDay[]> {
  await getSupplierService(supplierId);
  for (const day of data.schedule) {
    if (day.closeTime <= day.openTime) {
      throw new SupplierError(
        `closeTime must be after openTime for ${day.dayOfWeek}`,
        'INVALID_TIME_RANGE',
        400,
      );
    }
  }
  await prisma.$transaction(
    data.schedule.map((day) =>
      prisma.supplierAvailability.upsert({
        where: {
          supplierId_dayOfWeek: { supplierId, dayOfWeek: day.dayOfWeek },
        },
        create: {
          supplierId,
          dayOfWeek: day.dayOfWeek,
          openTime: day.openTime,
          closeTime: day.closeTime,
          isAvailable: day.isAvailable,
        },
        update: {
          openTime: day.openTime,
          closeTime: day.closeTime,
          isAvailable: day.isAvailable,
        },
      }),
    ),
  );
  return getSupplierAvailabilityService(supplierId);
}

export class SupplierError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'SupplierError';
  }
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new SupplierError(
        'A record with one of these unique fields already exists',
        'SUPPLIER_CONFLICT',
        409,
      );
    }
    if (error.code === 'P2025') {
      throw new SupplierError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }
    if (error.code === 'P2003') {
      throw new SupplierError(
        'One or more referenced records do not exist',
        'SUPPLIER_REFERENCE_NOT_FOUND',
        400,
      );
    }
  }
  throw error;
}

export async function listSuppliersService(query: ListSuppliersQuery) {
  return listSuppliers(query);
}

export async function getSupplierService(id: string): Promise<SupplierRecord> {
  const supplier = await findSupplierById(id);
  if (!supplier) {
    throw new SupplierError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
  }
  return supplier;
}

export async function createSupplierService(data: CreateSupplierBody): Promise<SupplierRecord> {
  try {
    return await createSupplier(data);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function updateSupplierService(
  id: string,
  data: UpdateSupplierBody,
): Promise<SupplierRecord> {
  await getSupplierService(id);
  try {
    return await updateSupplier(id, data);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function deleteSupplierService(id: string): Promise<SupplierRecord> {
  await getSupplierService(id);
  try {
    return await suspendSupplier(id);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function addContactService(supplierId: string, data: CreateContactBody) {
  await getSupplierService(supplierId);
  try {
    return await addContact(supplierId, data);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function removeContactService(supplierId: string, contactId: string) {
  await getSupplierService(supplierId);
  try {
    return await removeContact(contactId);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function linkAirportService(supplierId: string, airportId: string) {
  await getSupplierService(supplierId);
  try {
    return await linkAirport(supplierId, airportId);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function unlinkAirportService(supplierId: string, airportId: string) {
  await getSupplierService(supplierId);
  try {
    return await unlinkAirport(supplierId, airportId);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function linkServiceService(supplierId: string, serviceId: string) {
  await getSupplierService(supplierId);
  try {
    return await linkService(supplierId, serviceId);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function unlinkServiceService(supplierId: string, serviceId: string) {
  await getSupplierService(supplierId);
  try {
    return await unlinkService(supplierId, serviceId);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function addCoverageService(supplierId: string, data: AddCoverageBody) {
  await getSupplierService(supplierId);
  try {
    return await addCoverage(supplierId, data);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function removeCoverageService(supplierId: string, coverageId: string) {
  await getSupplierService(supplierId);
  try {
    return await removeCoverage(coverageId);
  } catch (error) {
    mapPrismaError(error);
  }
}
