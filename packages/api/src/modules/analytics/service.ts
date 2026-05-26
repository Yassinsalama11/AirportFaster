import { prisma, Prisma } from '@airportfaster/db';

// ── Track Event ───────────────────────────────────────────────────────────────

export async function trackEvent(data: {
  eventType: string;
  properties: Record<string, unknown>;
  sessionId?: string;
  ipAddress?: string;
}): Promise<void> {
  const { eventType, properties, sessionId } = data;

  // Route search events to SearchEvent table
  if (eventType === 'search_performed') {
    await prisma.searchEvent.create({
      data: {
        sessionId: sessionId ?? null,
        airportId: typeof properties['airportId'] === 'string' ? properties['airportId'] : null,
        serviceId: typeof properties['serviceId'] === 'string' ? properties['serviceId'] : null,
        query: typeof properties['query'] === 'string' ? properties['query'] : null,
        filters: properties['filters']
          ? (properties['filters'] as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        resultCount: typeof properties['resultCount'] === 'number' ? properties['resultCount'] : null,
        locale: typeof properties['locale'] === 'string' ? properties['locale'] : null,
      },
    });
    return;
  }

  // All funnel events go to AnalyticsFunnelEvent
  const funnelTypes = ['booking_started', 'checkout_started', 'booking_completed', 'payment_failed'];
  if (funnelTypes.includes(eventType) || eventType.includes('booking') || eventType.includes('checkout') || eventType.includes('payment')) {
    await prisma.analyticsFunnelEvent.create({
      data: {
        sessionId: sessionId ?? null,
        bookingId: typeof properties['bookingId'] === 'string' ? properties['bookingId'] : null,
        type: eventType,
      },
    });
    return;
  }

  // Default: log as funnel event
  await prisma.analyticsFunnelEvent.create({
    data: {
      sessionId: sessionId ?? null,
      bookingId: typeof properties['bookingId'] === 'string' ? properties['bookingId'] : null,
      type: eventType,
    },
  });
}

// ── Analytics Queries ─────────────────────────────────────────────────────────

export async function getFunnelData(dateFrom: Date, dateTo: Date) {
  const [searches, bookingStarted, checkoutStarted, bookingCompleted] = await Promise.all([
    prisma.searchEvent.count({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
    }),
    prisma.analyticsFunnelEvent.count({
      where: { type: 'booking_started', createdAt: { gte: dateFrom, lte: dateTo } },
    }),
    prisma.analyticsFunnelEvent.count({
      where: { type: 'checkout_started', createdAt: { gte: dateFrom, lte: dateTo } },
    }),
    prisma.analyticsFunnelEvent.count({
      where: { type: 'booking_completed', createdAt: { gte: dateFrom, lte: dateTo } },
    }),
  ]);

  return {
    searches,
    bookingStarted,
    checkoutStarted,
    bookingCompleted,
    conversionRates: {
      searchToBookingStarted: searches > 0 ? ((bookingStarted / searches) * 100).toFixed(1) : '0.0',
      bookingStartedToCheckout: bookingStarted > 0 ? ((checkoutStarted / bookingStarted) * 100).toFixed(1) : '0.0',
      checkoutToCompleted: checkoutStarted > 0 ? ((bookingCompleted / checkoutStarted) * 100).toFixed(1) : '0.0',
      overallConversion: searches > 0 ? ((bookingCompleted / searches) * 100).toFixed(1) : '0.0',
    },
  };
}

export async function getTopAirports(dateFrom: Date, dateTo: Date) {
  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      status: { in: ['paid', 'confirmed', 'completed', 'supplier_assigned', 'pending_supplier_confirmation', 'in_progress'] },
    },
    select: {
      totalMinor: true,
      airportService: {
        select: {
          airport: {
            select: {
              id: true,
              iataCode: true,
              city: true,
              translations: { where: { locale: 'en' }, select: { name: true } },
            },
          },
        },
      },
    },
  });

  const airportMap = new Map<string, { iataCode: string; name: string; count: number; revenue: number }>();

  for (const booking of bookings) {
    const airport = booking.airportService.airport;
    const existing = airportMap.get(airport.id);
    const name = airport.translations[0]?.name ?? airport.city;
    if (existing) {
      existing.count += 1;
      existing.revenue += booking.totalMinor;
    } else {
      airportMap.set(airport.id, {
        iataCode: airport.iataCode,
        name,
        count: 1,
        revenue: booking.totalMinor,
      });
    }
  }

  return Array.from(airportMap.entries())
    .map(([id, data]) => ({
      id,
      iataCode: data.iataCode,
      name: data.name,
      bookingCount: data.count,
      revenueMinorUnits: data.revenue,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 10);
}

export async function getStatusBreakdown(dateFrom: Date, dateTo: Date) {
  const groups = await prisma.booking.groupBy({
    by: ['status'],
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    _count: { id: true },
  });

  return groups.map((g) => ({ status: g.status, count: g._count.id }));
}

// ── T-078: Advanced BI Analytics ──────────────────────────────────────────────

type RevenuePeriod = '7d' | '30d' | '90d' | '1y';
type RevenueGroupBy = 'day' | 'week' | 'month';

export async function getRevenueOverTime(
  period: RevenuePeriod,
  groupBy: RevenueGroupBy,
): Promise<Array<{ date: string; revenueMinorUnits: number; bookingCount: number; currency: string }>> {
  const periodDays: Record<RevenuePeriod, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };

  const days = periodDays[period];
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      status: { in: ['paid', 'confirmed', 'completed', 'supplier_assigned', 'pending_supplier_confirmation', 'in_progress'] },
    },
    select: {
      totalMinor: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by period
  const buckets = new Map<string, { revenueMinorUnits: number; bookingCount: number }>();

  for (const booking of bookings) {
    let key: string;
    const d = booking.createdAt;

    if (groupBy === 'day') {
      key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    } else if (groupBy === 'week') {
      // ISO week: find Monday of this week
      const monday = new Date(d);
      const dayOfWeek = monday.getDay(); // 0=Sun
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday.setDate(monday.getDate() + diff);
      key = monday.toISOString().slice(0, 10);
    } else {
      // month
      key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    const existing = buckets.get(key);
    if (existing) {
      existing.revenueMinorUnits += booking.totalMinor;
      existing.bookingCount += 1;
    } else {
      buckets.set(key, { revenueMinorUnits: booking.totalMinor, bookingCount: 1 });
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data, currency: 'EUR' }));
}

export async function getAirportPerformance(): Promise<
  Array<{
    airportName: string;
    iataCode: string;
    bookingCount: number;
    revenueMinorUnits: number;
    avgRating?: number;
  }>
> {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      status: { in: ['paid', 'confirmed', 'completed', 'supplier_assigned', 'pending_supplier_confirmation', 'in_progress'] },
    },
    select: {
      totalMinor: true,
      airportService: {
        select: {
          airport: {
            select: {
              id: true,
              iataCode: true,
              city: true,
              translations: { where: { locale: 'en' }, select: { name: true } },
            },
          },
        },
      },
    },
  });

  const airportMap = new Map<
    string,
    { iataCode: string; airportName: string; bookingCount: number; revenueMinorUnits: number }
  >();

  for (const booking of bookings) {
    const airport = booking.airportService.airport;
    const name = airport.translations[0]?.name ?? airport.city;
    const existing = airportMap.get(airport.id);
    if (existing) {
      existing.bookingCount += 1;
      existing.revenueMinorUnits += booking.totalMinor;
    } else {
      airportMap.set(airport.id, {
        iataCode: airport.iataCode,
        airportName: name,
        bookingCount: 1,
        revenueMinorUnits: booking.totalMinor,
      });
    }
  }

  return Array.from(airportMap.values()).sort((a, b) => b.revenueMinorUnits - a.revenueMinorUnits);
}

export async function getServiceBreakdown(): Promise<
  Array<{
    serviceName: string;
    slug: string;
    bookingCount: number;
    revenueMinorUnits: number;
    conversionRate: number;
  }>
> {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: dateFrom, lte: dateTo },
      status: { in: ['paid', 'confirmed', 'completed', 'supplier_assigned', 'pending_supplier_confirmation', 'in_progress'] },
    },
    select: {
      totalMinor: true,
      airportService: {
        select: {
          service: {
            select: {
              id: true,
              slug: true,
              translations: { where: { locale: 'en' }, select: { name: true } },
            },
          },
          airportId: true,
          serviceId: true,
        },
      },
    },
  });

  const serviceMap = new Map<
    string,
    { serviceName: string; slug: string; bookingCount: number; revenueMinorUnits: number; serviceId: string }
  >();

  for (const booking of bookings) {
    const svc = booking.airportService.service;
    const name = svc.translations[0]?.name ?? svc.slug;
    const existing = serviceMap.get(svc.id);
    if (existing) {
      existing.bookingCount += 1;
      existing.revenueMinorUnits += booking.totalMinor;
    } else {
      serviceMap.set(svc.id, {
        serviceName: name,
        slug: svc.slug,
        bookingCount: 1,
        revenueMinorUnits: booking.totalMinor,
        serviceId: svc.id,
      });
    }
  }

  // Get searches per service for conversion rate
  const searchCounts = await prisma.searchEvent.groupBy({
    by: ['serviceId'],
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    _count: { id: true },
  });

  const searchMap = new Map<string, number>();
  for (const sc of searchCounts) {
    if (sc.serviceId) searchMap.set(sc.serviceId, sc._count.id);
  }

  return Array.from(serviceMap.values())
    .map(({ serviceId, serviceName, slug, bookingCount, revenueMinorUnits }) => {
      const searches = searchMap.get(serviceId) ?? 0;
      const conversionRate = searches > 0 ? (bookingCount / searches) * 100 : 0;
      return { serviceName, slug, bookingCount, revenueMinorUnits, conversionRate };
    })
    .sort((a, b) => b.bookingCount - a.bookingCount);
}

export async function getSupplierPerformance(): Promise<
  Array<{
    supplierName: string;
    bookingCount: number;
    confirmationRate: number;
    completionRate: number;
    reliabilityScore: number;
  }>
> {
  const suppliers = await prisma.supplier.findMany({
    select: {
      id: true,
      name: true,
      reliabilityScore: true,
      bookings: {
        select: { status: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      assignments: {
        select: { status: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
    },
    where: { status: 'verified' },
  });

  return suppliers
    .filter((s) => s.bookings.length > 0)
    .map((supplier) => {
      const total = supplier.bookings.length;
      const confirmed = supplier.bookings.filter((b) =>
        ['confirmed', 'in_progress', 'completed'].includes(b.status),
      ).length;
      const completed = supplier.bookings.filter((b) => b.status === 'completed').length;

      const confirmationRate = total > 0 ? (confirmed / total) * 100 : 0;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      const reliabilityScore = supplier.reliabilityScore
        ? Number(supplier.reliabilityScore) * 100
        : 0;

      return {
        supplierName: supplier.name,
        bookingCount: total,
        confirmationRate,
        completionRate,
        reliabilityScore,
      };
    })
    .sort((a, b) => b.bookingCount - a.bookingCount);
}
