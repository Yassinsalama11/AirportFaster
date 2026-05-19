import { Prisma } from '@airportfaster/db';
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
} from './validators.js';
import type { SupplierRecord } from './repository.js';

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
