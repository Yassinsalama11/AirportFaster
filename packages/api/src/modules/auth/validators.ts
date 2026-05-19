import { z } from 'zod';

export const LoginBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

export const PasswordResetRequestBodySchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type PasswordResetRequestBody = z.infer<typeof PasswordResetRequestBodySchema>;

export const PasswordResetConfirmBodySchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export type PasswordResetConfirmBody = z.infer<typeof PasswordResetConfirmBodySchema>;
