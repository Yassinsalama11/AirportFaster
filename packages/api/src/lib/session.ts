import { randomBytes, createHash } from 'crypto';
import { prisma } from '@airportfaster/db';

const SESSION_TTL_SECONDS = parseInt(process.env['SESSION_TTL_SECONDS'] ?? '28800', 10);

/**
 * Generate a cryptographically random session token (opaque to client).
 * Returns both the raw token (to send to client) and its hash (to store in DB).
 */
export function generateSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

/**
 * Hash a token for storage using SHA-256.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session in the database.
 */
export async function createSession(params: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Validate a session token and return the user with roles/permissions.
 * Returns null if the session is invalid or expired.
 */
export async function validateSession(token: string): Promise<SessionData | null> {
  const tokenHash = hashToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }
  if (!session.user.isActive) return null;

  // Update last used
  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => null);

  const roles: string[] = session.user.userRoles.map((ur) => ur.role.name);
  const allPermissions: string[] = session.user.userRoles.flatMap((ur) =>
    ur.role.rolePermissions.map((rp) => rp.permission.key),
  );
  const permissions: string[] = [...new Set(allPermissions)];

  return {
    sessionId: session.id,
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    roles,
    permissions,
  };
}

/**
 * Delete a session (logout).
 */
export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  name: string | null;
  roles: string[];
  permissions: string[];
}
