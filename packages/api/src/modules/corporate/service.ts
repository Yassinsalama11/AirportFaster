import { prisma } from '@airportfaster/db';
import {
  listCorporateAccounts,
  findCorporateById,
  createCorporateAccount,
  updateCorporateAccount,
  addMemberToCorporate,
  removeMemberFromCorporate,
  findMemberById,
  findCorporateByCustomerEmail,
  findCorporateBookingsByCustomerEmail,
} from './repository.js';
import type { CreateCorporateBody, UpdateCorporateBody, AddMemberBody } from './validators.js';

// ── Error class ───────────────────────────────────────────────────────────────

export class CorporateError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'CorporateError';
  }
}

// ── Admin services ────────────────────────────────────────────────────────────

export async function listCorporateService() {
  return listCorporateAccounts();
}

export async function getCorporateService(id: string) {
  const account = await findCorporateById(id);
  if (!account) {
    throw new CorporateError('Corporate account not found', 'NOT_FOUND', 404);
  }
  return account;
}

export async function createCorporateService(body: CreateCorporateBody) {
  return createCorporateAccount(body);
}

export async function updateCorporateService(id: string, body: UpdateCorporateBody) {
  const account = await findCorporateById(id);
  if (!account) {
    throw new CorporateError('Corporate account not found', 'NOT_FOUND', 404);
  }
  return updateCorporateAccount(id, body);
}

export async function addMemberService(corporateId: string, body: AddMemberBody) {
  const account = await findCorporateById(corporateId);
  if (!account) {
    throw new CorporateError('Corporate account not found', 'NOT_FOUND', 404);
  }

  // Find customer by email
  const customer = await prisma.customer.findUnique({
    where: { email: body.customerEmail },
  });
  if (!customer) {
    throw new CorporateError(
      `Customer with email '${body.customerEmail}' not found`,
      'CUSTOMER_NOT_FOUND',
      404,
    );
  }

  // Check for duplicate membership
  const existing = await prisma.corporateMember.findUnique({
    where: { corporateId_customerId: { corporateId, customerId: customer.id } },
  });
  if (existing) {
    throw new CorporateError('Customer is already a member of this corporate account', 'DUPLICATE_MEMBER', 409);
  }

  return addMemberToCorporate(corporateId, customer.id, body.role);
}

export async function removeMemberService(corporateId: string, memberId: string) {
  const account = await findCorporateById(corporateId);
  if (!account) {
    throw new CorporateError('Corporate account not found', 'NOT_FOUND', 404);
  }

  const member = await findMemberById(memberId);
  if (!member || member.corporateId !== corporateId) {
    throw new CorporateError('Member not found in this corporate account', 'MEMBER_NOT_FOUND', 404);
  }

  await removeMemberFromCorporate(memberId);
}

// ── Public (customer-facing) services ────────────────────────────────────────

export async function getMyCorporateService(customerEmail: string) {
  const account = await findCorporateByCustomerEmail(customerEmail);
  if (!account) {
    throw new CorporateError('You are not a member of any corporate account', 'NOT_MEMBER', 404);
  }
  return account;
}

export async function getMyCorporateBookingsService(customerEmail: string) {
  const account = await findCorporateByCustomerEmail(customerEmail);
  if (!account) {
    throw new CorporateError('You are not a member of any corporate account', 'NOT_MEMBER', 404);
  }

  const bookings = await findCorporateBookingsByCustomerEmail(customerEmail);
  return bookings ?? [];
}
