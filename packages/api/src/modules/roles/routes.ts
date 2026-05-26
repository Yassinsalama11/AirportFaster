import type { FastifyInstance } from 'fastify';
import { prisma } from '@airportfaster/db';
import { requirePermission } from '../../lib/rbac.js';

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

      const formatted = roles.map((role) => ({
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
      }));

      return reply.status(200).send({ success: true, data: { roles: formatted } });
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
}
