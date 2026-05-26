import { prisma, Prisma } from '@airportfaster/db';
import type {
  CreateSupplierBody,
  UpdateSupplierBody,
  ListSuppliersQuery,
  CreateContactBody,
  AddCoverageBody,
} from './validators.js';

const supplierInclude = {
  contacts: {
    orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
  },
  supplierAirports: {
    include: {
      airport: {
        include: { translations: true },
      },
    },
  },
  supplierServices: {
    include: {
      service: {
        include: { translations: true },
      },
    },
  },
  coverages: {
    include: {
      airportService: {
        include: {
          airport: { include: { translations: true } },
          service: { include: { translations: true } },
        },
      },
    },
  },
  documents: true,
  slaMetrics: {
    orderBy: { periodStart: 'desc' as const },
    take: 12,
  },
} satisfies Prisma.SupplierInclude;

export type SupplierRecord = Prisma.SupplierGetPayload<{
  include: typeof supplierInclude;
}>;

const supplierListInclude = {
  contacts: {
    where: { isPrimary: true },
    take: 1,
  },
} satisfies Prisma.SupplierInclude;

export async function listSuppliers(query: ListSuppliersQuery) {
  const where: Prisma.SupplierWhereInput = {
    status: query.status,
    countryCode: query.country,
    name: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
  };

  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.supplier.findMany({
      where,
      include: supplierListInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function findSupplierById(id: string): Promise<SupplierRecord | null> {
  return prisma.supplier.findUnique({
    where: { id },
    include: supplierInclude,
  });
}

export async function createSupplier(data: CreateSupplierBody): Promise<SupplierRecord> {
  return prisma.supplier.create({
    data: {
      name: data.name,
      legalName: data.legalName ?? null,
      countryCode: data.countryCode ?? null,
      payoutCurrency: data.payoutCurrency ?? null,
      commissionPercent: data.commissionPercent ?? null,
      notes: data.notes ?? null,
    },
    include: supplierInclude,
  });
}

export async function updateSupplier(
  id: string,
  data: UpdateSupplierBody,
): Promise<SupplierRecord> {
  return prisma.supplier.update({
    where: { id },
    data: {
      name: data.name,
      legalName: data.legalName,
      countryCode: data.countryCode,
      payoutCurrency: data.payoutCurrency,
      commissionPercent: data.commissionPercent ?? undefined,
      notes: data.notes,
      status: data.status,
    },
    include: supplierInclude,
  });
}

export async function suspendSupplier(id: string): Promise<SupplierRecord> {
  return prisma.supplier.update({
    where: { id },
    data: { status: 'suspended' },
    include: supplierInclude,
  });
}

// Contacts
export async function addContact(supplierId: string, data: CreateContactBody) {
  return prisma.supplierContact.create({
    data: {
      supplierId,
      name: data.name,
      role: data.role ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      isPrimary: data.isPrimary ?? false,
    },
  });
}

export async function removeContact(contactId: string) {
  return prisma.supplierContact.delete({ where: { id: contactId } });
}

// Airport links
export async function linkAirport(supplierId: string, airportId: string) {
  return prisma.supplierAirport.create({
    data: { supplierId, airportId },
    include: { airport: { include: { translations: true } } },
  });
}

export async function unlinkAirport(supplierId: string, airportId: string) {
  return prisma.supplierAirport.deleteMany({
    where: { supplierId, airportId },
  });
}

// Service links
export async function linkService(supplierId: string, serviceId: string) {
  return prisma.supplierService.create({
    data: { supplierId, serviceId },
    include: { service: { include: { translations: true } } },
  });
}

export async function unlinkService(supplierId: string, serviceId: string) {
  return prisma.supplierService.deleteMany({
    where: { supplierId, serviceId },
  });
}

// Coverage
export async function addCoverage(supplierId: string, data: AddCoverageBody) {
  return prisma.supplierCoverage.create({
    data: {
      supplierId,
      airportServiceId: data.airportServiceId,
      priority: data.priority,
    },
    include: {
      airportService: {
        include: {
          airport: { include: { translations: true } },
          service: { include: { translations: true } },
        },
      },
    },
  });
}

export async function removeCoverage(coverageId: string) {
  return prisma.supplierCoverage.delete({ where: { id: coverageId } });
}
