import type { FastifyInstance } from 'fastify';
import { requirePermission } from '../../lib/rbac.js';
import { prisma } from '@airportfaster/db';

export async function dashboardAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/admin/dashboard/stats
  fastify.get(
    '/stats',
    { preHandler: requirePermission('bookings.read') },
    async (_request, reply) => {
      const now = new Date();

      // Today boundaries (UTC)
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setUTCHours(23, 59, 59, 999);

      // This week boundaries (Monday → Sunday)
      const weekStart = new Date(now);
      weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay() + (now.getUTCDay() === 0 ? -6 : 1));
      weekStart.setUTCHours(0, 0, 0, 0);

      const [
        totalBookingsToday,
        totalBookingsThisWeek,
        revenueTodayAggregate,
        revenueThisWeekAggregate,
        pendingAssignment,
        openIncidents,
      ] = await Promise.all([
        prisma.booking.count({
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.booking.count({
          where: { createdAt: { gte: weekStart } },
        }),
        prisma.booking.aggregate({
          where: {
            status: { in: ['paid', 'confirmed', 'completed', 'supplier_assigned', 'pending_supplier_confirmation', 'in_progress'] },
            updatedAt: { gte: todayStart, lte: todayEnd },
          },
          _sum: { totalMinor: true },
        }),
        prisma.booking.aggregate({
          where: {
            status: { in: ['paid', 'confirmed', 'completed', 'supplier_assigned', 'pending_supplier_confirmation', 'in_progress'] },
            updatedAt: { gte: weekStart },
          },
          _sum: { totalMinor: true },
        }),
        prisma.booking.count({
          where: { status: 'pending_supplier_assignment' },
        }),
        prisma.incident.count({
          where: { status: { in: ['created', 'assigned', 'in_progress', 'waiting_external'] } },
        }),
      ]);

      const revenueToday = revenueTodayAggregate._sum.totalMinor ?? 0;
      const revenueThisWeek = revenueThisWeekAggregate._sum.totalMinor ?? 0;

      return reply.status(200).send({
        success: true,
        data: {
          totalBookingsToday,
          totalBookingsThisWeek,
          revenueToday,
          revenueThisWeek,
          pendingAssignment,
          openIncidents,
          currency: 'EUR',
        },
      });
    },
  );

  // GET /api/admin/dashboard/recent-bookings — last 10 bookings
  fastify.get(
    '/recent-bookings',
    { preHandler: requirePermission('bookings.read') },
    async (_request, reply) => {
      const bookings = await prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          airportService: {
            include: {
              airport: { include: { translations: true } },
              service: { include: { translations: true } },
            },
          },
        },
      });
      return reply.status(200).send({ success: true, data: { items: bookings } });
    },
  );

  // GET /api/admin/dashboard/pending-assignment — bookings needing supplier
  fastify.get(
    '/pending-assignment',
    { preHandler: requirePermission('bookings.read') },
    async (_request, reply) => {
      const bookings = await prisma.booking.findMany({
        where: { status: 'pending_supplier_assignment' },
        take: 20,
        orderBy: { createdAt: 'asc' },
        include: {
          customer: true,
          airportService: {
            include: {
              airport: { include: { translations: true } },
              service: { include: { translations: true } },
            },
          },
        },
      });
      return reply.status(200).send({ success: true, data: { items: bookings } });
    },
  );
}
