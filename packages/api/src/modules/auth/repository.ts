import { prisma } from '@airportfaster/db';

export interface UserWithRoles {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}

/**
 * Find a user by email with their roles and permissions eagerly loaded.
 */
export async function findUserByEmail(email: string): Promise<UserWithRoles | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const roles: string[] = user.userRoles.map((ur) => ur.role.name);
  const allPermissions: string[] = user.userRoles.flatMap((ur) =>
    ur.role.rolePermissions.map((rp) => rp.permission.key),
  );
  const permissions: string[] = [...new Set(allPermissions)];

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    isActive: user.isActive,
    roles,
    permissions,
  };
}

/**
 * Update the last login timestamp for a user.
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export async function updateUserPasswordHash(params: {
  userId: string;
  passwordHash: string;
}): Promise<void> {
  await prisma.user.update({
    where: { id: params.userId },
    data: { passwordHash: params.passwordHash },
  });
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}
