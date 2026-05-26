import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { prisma } from '@airportfaster/db';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { requirePermission } from '../../lib/rbac.js';
import { createPasswordResetToken } from '../auth/service.js';
import { sendTeamInviteEmail } from '../notifications/service.js';
import { writeAuditLog } from '../../lib/audit.js';

const RoleBodySchema = z.object({
  name: z.string().trim().min(2).max(60).regex(/^[a-z0-9_]+$/).optional(),
  displayName: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  permissionKeys: z.array(z.string().trim().min(1).max(100)).default([]),
});

const CreateRoleBodySchema = RoleBodySchema.extend({
  name: z.string().trim().min(2).max(60).regex(/^[a-z0-9_]+$/),
  displayName: z.string().trim().min(2).max(100),
});

const InviteUserBodySchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(120).optional(),
  roleIds: z.array(z.string().uuid()).default([]),
  locale: z.enum(['en', 'ar']).default('en'),
});

const UpdateUserRolesBodySchema = z.object({
  roleIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean().optional(),
});

function formatRole(role: {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  rolePermissions: Array<{ permission: { key: string; displayName: string; domain: string } }>;
}) {
  return {
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.rolePermissions
      .map((rp) => ({
        key: rp.permission.key,
        displayName: rp.permission.displayName,
        domain: rp.permission.domain,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  };
}

function appBaseUrl(): string {
  return (
    process.env['APP_URL'] ??
    process.env['PUBLIC_APP_URL'] ??
    process.env['NEXT_PUBLIC_APP_URL'] ??
    'https://airportfaster.com'
  ).replace(/\/+$/, '');
}

export async function rolesAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/roles — list all roles with their permissions
  fastify.get(
    '/',
    { preHandler: requirePermission('roles.read') },
    async (_request, reply) => {
      const roles = await prisma.role.findMany({
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
        orderBy: { displayName: 'asc' },
      });

      const formatted = roles.map(formatRole);

      return reply.status(200).send({ success: true, data: { roles: formatted } });
    },
  );

  // POST /api/admin/roles — create a role and attach permissions
  fastify.post(
    '/',
    { preHandler: requirePermission('roles.write') },
    async (request, reply) => {
      const parseResult = CreateRoleBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() },
        });
      }

      const { name, displayName, description, permissionKeys } = parseResult.data;
      const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
      if (permissions.length !== permissionKeys.length) {
        return reply.status(400).send({
          success: false,
          error: { code: 'UNKNOWN_PERMISSION', message: 'One or more permissions do not exist' },
        });
      }

      const role = await prisma.role.create({
        data: {
          name,
          displayName,
          description: description ?? null,
          rolePermissions: {
            create: permissions.map((permission) => ({ permissionId: permission.id })),
          },
        },
        include: { rolePermissions: { include: { permission: true } } },
      });

      await writeAuditLog({
        userId: request.session?.userId,
        action: 'roles.created',
        entityType: 'role',
        entityId: role.id,
        metadata: { name, permissionKeys },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({ success: true, data: { role: formatRole(role) } });
    },
  );

  // GET /api/admin/roles/permissions — list every permission
  fastify.get(
    '/permissions',
    { preHandler: requirePermission('roles.read') },
    async (_request, reply) => {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ domain: 'asc' }, { key: 'asc' }],
      });
      return reply.status(200).send({
        success: true,
        data: {
          permissions: permissions.map((p) => ({
            key: p.key,
            displayName: p.displayName,
            domain: p.domain,
          })),
        },
      });
    },
  );

  // GET /api/admin/roles/users — list admin users and their roles
  fastify.get(
    '/users',
    { preHandler: requirePermission('roles.read') },
    async (_request, reply) => {
      const users = await prisma.user.findMany({
        orderBy: [{ createdAt: 'desc' }],
        include: { userRoles: { include: { role: true } } },
      });

      return reply.status(200).send({
        success: true,
        data: {
          users: users.map((user) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            roles: user.userRoles.map((ur) => ({
              id: ur.role.id,
              name: ur.role.name,
              displayName: ur.role.displayName,
            })),
          })),
        },
      });
    },
  );

  // POST /api/admin/roles/users/invite — create/update an admin user and send set-password email
  fastify.post(
    '/users/invite',
    { preHandler: requirePermission('roles.write') },
    async (request, reply) => {
      const parseResult = InviteUserBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() },
        });
      }

      const { email, name, roleIds, locale } = parseResult.data;
      const normalizedEmail = email.toLowerCase();
      const roles = await prisma.role.findMany({ where: { id: { in: roleIds } } });
      if (roles.length !== roleIds.length) {
        return reply.status(400).send({
          success: false,
          error: { code: 'UNKNOWN_ROLE', message: 'One or more roles do not exist' },
        });
      }

      const randomPasswordHash = await hash(crypto.randomUUID(), {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      const user = await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { email: normalizedEmail } });
        const saved = existing
          ? await tx.user.update({
              where: { id: existing.id },
              data: { name: name ?? existing.name, isActive: true },
            })
          : await tx.user.create({
              data: {
                email: normalizedEmail,
                passwordHash: randomPasswordHash,
                name: name ?? null,
                isActive: true,
              },
            });

        await tx.userRole.deleteMany({ where: { userId: saved.id } });
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: saved.id, roleId })),
            skipDuplicates: true,
          });
        }
        return saved;
      });

      const resetToken = createPasswordResetToken({ userId: user.id, email: user.email });
      const resetUrl = `${appBaseUrl()}/${locale}/admin/password-reset?token=${encodeURIComponent(resetToken)}`;
      await sendTeamInviteEmail({ email: user.email, name: user.name, resetUrl });

      await writeAuditLog({
        userId: request.session?.userId,
        action: 'users.invited',
        entityType: 'user',
        entityId: user.id,
        metadata: { email: user.email, roleIds },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(201).send({
        success: true,
        data: { userId: user.id, email: user.email, invited: true },
      });
    },
  );

  // PATCH /api/admin/roles/users/:userId/roles — attach roles to a user and activate/deactivate
  fastify.patch<{ Params: { userId: string } }>(
    '/users/:userId/roles',
    { preHandler: requirePermission('roles.write') },
    async (request, reply) => {
      const parseResult = UpdateUserRolesBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() },
        });
      }

      const userId = request.params.userId;
      const { roleIds, isActive } = parseResult.data;
      const [user, roles] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.role.findMany({ where: { id: { in: roleIds } } }),
      ]);

      if (!user) {
        return reply.status(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      }
      if (roles.length !== roleIds.length) {
        return reply.status(400).send({
          success: false,
          error: { code: 'UNKNOWN_ROLE', message: 'One or more roles do not exist' },
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: isActive === undefined ? {} : { isActive },
        });
        await tx.userRole.deleteMany({ where: { userId } });
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId, roleId })),
            skipDuplicates: true,
          });
        }
      });

      await writeAuditLog({
        userId: request.session?.userId,
        action: 'users.roles_updated',
        entityType: 'user',
        entityId: userId,
        metadata: { roleIds, isActive },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(200).send({ success: true, data: { userId, roleIds, isActive } });
    },
  );

  // PATCH /api/admin/roles/:roleId — update role details and permission set
  fastify.patch<{ Params: { roleId: string } }>(
    '/:roleId',
    { preHandler: requirePermission('roles.write') },
    async (request, reply) => {
      const parseResult = RoleBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parseResult.error.flatten() },
        });
      }

      const roleId = request.params.roleId;
      const existing = await prisma.role.findUnique({ where: { id: roleId } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' } });
      }

      const { displayName, description, permissionKeys } = parseResult.data;
      const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
      if (permissions.length !== permissionKeys.length) {
        return reply.status(400).send({
          success: false,
          error: { code: 'UNKNOWN_PERMISSION', message: 'One or more permissions do not exist' },
        });
      }

      const role = await prisma.$transaction(async (tx) => {
        await tx.role.update({
          where: { id: roleId },
          data: {
            ...(displayName !== undefined && { displayName }),
            ...(description !== undefined && { description }),
          },
        });
        await tx.rolePermission.deleteMany({ where: { roleId } });
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
            skipDuplicates: true,
          });
        }
        return tx.role.findUniqueOrThrow({
          where: { id: roleId },
          include: { rolePermissions: { include: { permission: true } } },
        });
      });

      await writeAuditLog({
        userId: request.session?.userId,
        action: 'roles.updated',
        entityType: 'role',
        entityId: roleId,
        metadata: { permissionKeys },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(200).send({ success: true, data: { role: formatRole(role) } });
    },
  );
}
