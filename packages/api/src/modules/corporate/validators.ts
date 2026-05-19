import { z } from 'zod';

export const CreateCorporateBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  legalName: z.string().trim().min(1).max(300).optional(),
  vatNumber: z.string().trim().max(50).optional(),
  billingEmail: z.string().email(),
  creditLimit: z.number().int().min(0).optional(),
  paymentTerms: z.number().int().min(0).max(365).default(30),
  status: z.enum(['active', 'suspended']).default('active'),
});

export const UpdateCorporateBodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  legalName: z.string().trim().min(1).max(300).optional(),
  vatNumber: z.string().trim().max(50).optional(),
  billingEmail: z.string().email().optional(),
  creditLimit: z.number().int().min(0).optional().nullable(),
  paymentTerms: z.number().int().min(0).max(365).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

export const AddMemberBodySchema = z.object({
  customerEmail: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export const CorporateIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const MemberIdParamsSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
});

export type CreateCorporateBody = z.infer<typeof CreateCorporateBodySchema>;
export type UpdateCorporateBody = z.infer<typeof UpdateCorporateBodySchema>;
export type AddMemberBody = z.infer<typeof AddMemberBodySchema>;
