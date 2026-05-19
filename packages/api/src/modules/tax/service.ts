import { prisma } from '@airportfaster/db';

// ── Calculate Tax ─────────────────────────────────────────────────────────────

export async function calculateTax(
  countryCode: string,
  serviceType: string,
  priceMinorUnits: number,
): Promise<{
  taxRatePercent: number;
  taxMinorUnits: number;
  totalWithTaxMinorUnits: number;
  taxType: string;
}> {
  const now = new Date();

  // Find applicable tax rate: prefer service-specific, fall back to general (null serviceType)
  const taxRate = await prisma.taxRate.findFirst({
    where: {
      countryCode: countryCode.toUpperCase(),
      isActive: true,
      validFrom: { lte: now },
      AND: [
        { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        { OR: [{ serviceType: serviceType }, { serviceType: null }] },
      ],
    },
    orderBy: [
      // prefer service-specific (non-null serviceType) over general
      { serviceType: 'desc' },
      { validFrom: 'desc' },
    ],
  });

  if (!taxRate) {
    return {
      taxRatePercent: 0,
      taxMinorUnits: 0,
      totalWithTaxMinorUnits: priceMinorUnits,
      taxType: 'none',
    };
  }

  const rateDecimal = Number(taxRate.rate); // e.g. 0.2000 = 20%
  const taxRatePercent = rateDecimal * 100;
  const taxMinorUnits = Math.round(priceMinorUnits * rateDecimal);
  const totalWithTaxMinorUnits = priceMinorUnits + taxMinorUnits;

  return {
    taxRatePercent,
    taxMinorUnits,
    totalWithTaxMinorUnits,
    taxType: taxRate.taxType,
  };
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export interface CreateTaxRateInput {
  countryCode: string;
  taxType: string;
  rate: number; // decimal e.g. 0.2 for 20%
  serviceType?: string | null;
  isActive?: boolean;
  validFrom: string; // ISO date string
  validUntil?: string | null;
}

export async function listTaxRates() {
  return prisma.taxRate.findMany({
    orderBy: [{ countryCode: 'asc' }, { validFrom: 'desc' }],
  });
}

export async function findTaxRateById(id: string) {
  return prisma.taxRate.findUnique({ where: { id } });
}

export async function createTaxRate(data: CreateTaxRateInput) {
  const { Prisma } = await import('@airportfaster/db');
  return prisma.taxRate.create({
    data: {
      countryCode: data.countryCode.toUpperCase(),
      taxType: data.taxType,
      rate: new Prisma.Decimal(data.rate),
      serviceType: data.serviceType ?? null,
      isActive: data.isActive ?? true,
      validFrom: new Date(data.validFrom),
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
    },
  });
}

export async function updateTaxRate(
  id: string,
  data: Partial<CreateTaxRateInput>,
) {
  const { Prisma } = await import('@airportfaster/db');
  return prisma.taxRate.update({
    where: { id },
    data: {
      countryCode: data.countryCode ? data.countryCode.toUpperCase() : undefined,
      taxType: data.taxType,
      rate: data.rate != null ? new Prisma.Decimal(data.rate) : undefined,
      serviceType: data.serviceType,
      isActive: data.isActive,
      validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    },
  });
}

export async function deleteTaxRate(id: string) {
  return prisma.taxRate.update({
    where: { id },
    data: { isActive: false },
  });
}
