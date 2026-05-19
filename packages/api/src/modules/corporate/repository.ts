import { prisma } from '@airportfaster/db';
import type { CreateCorporateBody, UpdateCorporateBody } from './validators.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CorporateRecord = Awaited<ReturnType<typeof findCorporateById>>;

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listCorporateAccounts() {
  return prisma.corporateAccount.findMany({
    include: {
      _count: {
        select: { members: true, bookings: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findCorporateById(id: string) {
  return prisma.corporateAccount.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      bookings: {
        select: {
          id: true,
          reference: true,
          status: true,
          serviceDateTime: true,
          totalMinor: true,
          currency: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: {
        select: { members: true, bookings: true },
      },
    },
  });
}

export async function createCorporateAccount(data: CreateCorporateBody) {
  return prisma.corporateAccount.create({
    data: {
      name: data.name,
      legalName: data.legalName ?? null,
      vatNumber: data.vatNumber ?? null,
      billingEmail: data.billingEmail,
      creditLimit: data.creditLimit ?? null,
      paymentTerms: data.paymentTerms,
      status: data.status,
    },
  });
}

export async function updateCorporateAccount(id: string, data: UpdateCorporateBody) {
  return prisma.corporateAccount.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.legalName !== undefined && { legalName: data.legalName }),
      ...(data.vatNumber !== undefined && { vatNumber: data.vatNumber }),
      ...(data.billingEmail !== undefined && { billingEmail: data.billingEmail }),
      ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
      ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

export async function addMemberToCorporate(
  corporateId: string,
  customerId: string,
  role: string,
) {
  return prisma.corporateMember.create({
    data: { corporateId, customerId, role },
    include: {
      customer: { select: { id: true, email: true, fullName: true } },
    },
  });
}

export async function removeMemberFromCorporate(memberId: string) {
  return prisma.corporateMember.delete({ where: { id: memberId } });
}

export async function findMemberById(memberId: string) {
  return prisma.corporateMember.findUnique({ where: { id: memberId } });
}

export async function findCorporateByCustomerEmail(email: string) {
  const member = await prisma.corporateMember.findFirst({
    where: { customer: { email } },
    include: {
      corporate: {
        include: {
          _count: { select: { members: true, bookings: true } },
        },
      },
    },
  });
  return member?.corporate ?? null;
}

export async function findCorporateBookingsByCustomerEmail(email: string) {
  const member = await prisma.corporateMember.findFirst({
    where: { customer: { email } },
  });
  if (!member) return null;

  return prisma.booking.findMany({
    where: { corporateAccountId: member.corporateId },
    select: {
      id: true,
      reference: true,
      status: true,
      serviceDateTime: true,
      totalMinor: true,
      currency: true,
      createdAt: true,
      customer: { select: { email: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
