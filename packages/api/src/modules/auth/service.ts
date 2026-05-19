import { createHmac, timingSafeEqual } from 'crypto';
import { hash, verify } from '@node-rs/argon2';
import {
  deleteUserSessions,
  findUserByEmail,
  updateLastLogin,
  updateUserPasswordHash,
} from './repository.js';
import { createSession, deleteSession, validateSession } from '../../lib/session.js';
import { writeAuditLog } from '../../lib/audit.js';
import type { SessionData } from '../../lib/session.js';

const PASSWORD_RESET_TTL_SECONDS = parseInt(
  process.env['PASSWORD_RESET_TTL_SECONDS'] ?? '900',
  10,
);

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    roles: string[];
    permissions: string[];
  };
}

export interface PasswordResetRequestResult {
  delivered: boolean;
  resetToken?: string;
}

/**
 * Authenticate a staff user with email + password.
 * Returns session token on success.
 * Throws AuthError on failure.
 */
export async function loginService(params: {
  email: string;
  password: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}): Promise<LoginResult> {
  const { email, password, ipAddress, userAgent } = params;

  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    await writeAuditLog({
      action: 'auth.login.failed',
      metadata: { email, reason: 'invalid_credentials' },
      ipAddress,
      userAgent,
    });
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const passwordValid = await verify(user.passwordHash, password);

  if (!passwordValid) {
    await writeAuditLog({
      userId: user.id,
      action: 'auth.login.failed',
      metadata: { email, reason: 'wrong_password' },
      ipAddress,
      userAgent,
    });
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Create session
  const { token, expiresAt } = await createSession({ userId: user.id, ipAddress, userAgent });

  // Update last login
  await updateLastLogin(user.id);

  // Audit log
  await writeAuditLog({
    userId: user.id,
    action: 'auth.login.success',
    metadata: { email },
    ipAddress,
    userAgent,
  });

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions,
    },
  };
}

function passwordResetSecret(): string {
  return process.env['PASSWORD_RESET_SECRET'] ?? process.env['SESSION_SECRET'] ?? 'change-me';
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function signPayload(payload: string): string {
  return createHmac('sha256', passwordResetSecret()).update(payload).digest('base64url');
}

export function createPasswordResetToken(params: { userId: string; email: string }): string {
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: params.userId,
      email: params.email,
      exp: Math.floor(Date.now() / 1000) + PASSWORD_RESET_TTL_SECONDS,
    }),
  );
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function verifyPasswordResetToken(token: string): { userId: string; email: string } {
  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    throw new AuthError('Invalid password reset token', 'INVALID_RESET_TOKEN');
  }

  const expectedSignature = signPayload(payload);
  const received = Buffer.from(signature, 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new AuthError('Invalid password reset token', 'INVALID_RESET_TOKEN');
  }

  let decoded: { sub?: unknown; email?: unknown; exp?: unknown };
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
      email?: unknown;
      exp?: unknown;
    };
  } catch {
    throw new AuthError('Invalid password reset token', 'INVALID_RESET_TOKEN');
  }

  if (
    typeof decoded.sub !== 'string' ||
    typeof decoded.email !== 'string' ||
    typeof decoded.exp !== 'number'
  ) {
    throw new AuthError('Invalid password reset token', 'INVALID_RESET_TOKEN');
  }

  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new AuthError('Password reset token expired', 'RESET_TOKEN_EXPIRED');
  }

  return { userId: decoded.sub, email: decoded.email };
}

export async function requestPasswordResetService(params: {
  email: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}): Promise<PasswordResetRequestResult> {
  const email = params.email.toLowerCase().trim();
  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    await writeAuditLog({
      action: 'auth.password_reset.requested',
      metadata: { email, delivered: false },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    return { delivered: false };
  }

  const resetToken = createPasswordResetToken({ userId: user.id, email: user.email });

  await writeAuditLog({
    userId: user.id,
    action: 'auth.password_reset.requested',
    metadata: { email: user.email, delivered: true },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  // Sprint 0 email stub: expose the token outside production so tests/dev can complete the flow.
  if (process.env['NODE_ENV'] === 'production') {
    return { delivered: true };
  }

  return { delivered: true, resetToken };
}

export async function confirmPasswordResetService(params: {
  token: string;
  password: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}): Promise<void> {
  const tokenPayload = verifyPasswordResetToken(params.token);
  const user = await findUserByEmail(tokenPayload.email);

  if (!user || !user.isActive || user.id !== tokenPayload.userId) {
    throw new AuthError('Invalid password reset token', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hash(params.password, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await updateUserPasswordHash({ userId: user.id, passwordHash });
  await deleteUserSessions(user.id);

  await writeAuditLog({
    userId: user.id,
    action: 'auth.password_reset.completed',
    metadata: { email: user.email },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Logout — invalidate session.
 */
export async function logoutService(params: {
  token: string;
  userId: string | undefined;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}): Promise<void> {
  await deleteSession(params.token);
  await writeAuditLog({
    userId: params.userId,
    action: 'auth.logout',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });
}

/**
 * Get the current authenticated user from a session token.
 */
export async function getMeService(token: string): Promise<SessionData | null> {
  return validateSession(token);
}
