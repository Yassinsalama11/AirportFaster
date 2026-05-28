import { prisma, Prisma } from '@airportfaster/db';
import type {
  CreateAirportBody,
  ListAirportsQuery,
  UpdateAirportBody,
} from './validators.js';

const airportInclude = {
  translations: true,
  images: {
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
  },
  airportServices: {
    include: {
      service: {
        include: {
          translations: true,
        },
      },
    },
  },
  seo: true,
} satisfies Prisma.AirportInclude;

export type AirportRecord = Prisma.AirportGetPayload<{
  include: typeof airportInclude;
}>;

export async function findAirportById(id: string): Promise<AirportRecord | null> {
  return prisma.airport.findUnique({
    where: { id },
    include: airportInclude,
  });
}

export async function findAirportBySlug(slug: string): Promise<AirportRecord | null> {
  return prisma.airport.findUnique({
    where: { slug },
    include: airportInclude,
  });
}

export async function airportSlugExists(slug: string, excludingAirportId?: string): Promise<boolean> {
  const count = await prisma.airport.count({
    where: {
      slug,
      ...(excludingAirportId ? { id: { not: excludingAirportId } } : {}),
    },
  });
  return count > 0;
}

export async function listAirports(query: ListAirportsQuery): Promise<{
  items: AirportRecord[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const where: Prisma.AirportWhereInput = {
    status: query.status,
    country: query.country,
    airportServices: query.serviceId
      ? {
          some: {
            serviceId: query.serviceId,
          },
        }
      : undefined,
    OR: query.q
      ? [
          { iataCode: { contains: query.q, mode: 'insensitive' } },
          { icaoCode: { contains: query.q, mode: 'insensitive' } },
          { city: { contains: query.q, mode: 'insensitive' } },
          {
            translations: {
              some: {
                name: { contains: query.q, mode: 'insensitive' },
              },
            },
          },
        ]
      : undefined,
  };

  const orderBy: Prisma.AirportOrderByWithRelationInput = {
    [query.sortBy]: query.sortDirection,
  };

  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.airport.findMany({
      where,
      include: airportInclude,
      orderBy,
      skip,
      take: query.pageSize,
    }),
    prisma.airport.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function createAirport(
  data: CreateAirportBody,
  slug: string,
): Promise<AirportRecord> {
  return prisma.airport.create({
    data: {
      iataCode: data.iataCode,
      icaoCode: data.icaoCode,
      slug,
      country: data.country,
      city: data.city,
      timezone: data.timezone,
      latitude: data.latitude,
      longitude: data.longitude,
      translations: {
        create: data.translations.map((translation) => ({
          locale: translation.locale,
          name: translation.name,
          description: translation.description,
        })),
      },
      images: data.images?.length
        ? {
            create: data.images.map((image) => ({
              url: image.url,
              altText: image.altText,
              isPrimary: image.isPrimary ?? false,
              sortOrder: image.sortOrder ?? 0,
            })),
          }
        : undefined,
      airportServices: data.airportServices?.length
        ? {
            create: data.airportServices.map((airportService) => ({
              serviceId: airportService.serviceId,
              isActive: airportService.isActive ?? true,
            })),
          }
        : undefined,
    },
    include: airportInclude,
  });
}

export async function updateAirport(
  id: string,
  data: UpdateAirportBody & { slug?: string },
): Promise<AirportRecord> {
  return prisma.$transaction(async (tx) => {
    const currentAirport = await tx.airport.findUniqueOrThrow({
      where: { id },
      select: { slug: true },
    });
    const slugChanged = Boolean(data.slug && data.slug !== currentAirport.slug);

    await tx.airport.update({
      where: { id },
      data: {
        iataCode: data.iataCode,
        icaoCode: data.icaoCode,
        slug: data.slug,
        country: data.country,
        city: data.city,
        timezone: data.timezone,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status,
      },
    });

    if (data.translations) {
      for (const translation of data.translations) {
        await tx.airportTranslation.upsert({
          where: {
            airportId_locale: {
              airportId: id,
              locale: translation.locale,
            },
          },
          update: {
            name: translation.name,
            description: translation.description,
          },
          create: {
            airportId: id,
            locale: translation.locale,
            name: translation.name,
            description: translation.description,
          },
        });
      }
    }

    if (data.images) {
      await tx.airportImage.deleteMany({ where: { airportId: id } });
      if (data.images.length > 0) {
        await tx.airportImage.createMany({
          data: data.images.map((image) => ({
            airportId: id,
            url: image.url,
            altText: image.altText,
            isPrimary: image.isPrimary ?? false,
            sortOrder: image.sortOrder ?? 0,
          })),
        });
      }
    }

    if (data.airportServices) {
      await tx.airportService.deleteMany({ where: { airportId: id } });
      if (data.airportServices.length > 0) {
        await tx.airportService.createMany({
          data: data.airportServices.map((airportService) => ({
            airportId: id,
            serviceId: airportService.serviceId,
            isActive: airportService.isActive ?? true,
          })),
        });
      }
    }

    if (slugChanged && data.slug) {
      const seo = await tx.airportSeo.findUnique({ where: { airportId: id } });
      if (seo) {
        const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';
        const oldCanonicalSuffix = `/airports/${currentAirport.slug}`;
        const nextCanonicalUrl = `${baseUrl}/en/airports/${data.slug}`;
        const shouldUpdateCanonical =
          !seo.canonicalUrl ||
          seo.canonicalUrl.endsWith(oldCanonicalSuffix) ||
          seo.canonicalUrl.endsWith(`/en${oldCanonicalSuffix}`) ||
          seo.canonicalUrl.endsWith(`/ar${oldCanonicalSuffix}`);
        const schemaJson =
          seo.schemaJson && typeof seo.schemaJson === 'object' && !Array.isArray(seo.schemaJson)
            ? {
                ...seo.schemaJson,
                url: nextCanonicalUrl,
              }
            : undefined;

        await tx.airportSeo.update({
          where: { airportId: id },
          data: {
            ...(shouldUpdateCanonical ? { canonicalUrl: nextCanonicalUrl } : {}),
            ...(schemaJson ? { schemaJson } : {}),
          },
        });
      }
    }

    return tx.airport.findUniqueOrThrow({
      where: { id },
      include: airportInclude,
    });
  });
}

export async function publishAirport(id: string): Promise<AirportRecord> {
  return prisma.airport.update({
    where: { id },
    data: {
      status: 'active',
      publishedAt: new Date(),
    },
    include: airportInclude,
  });
}

export async function unpublishAirport(id: string): Promise<AirportRecord> {
  return prisma.airport.update({
    where: { id },
    data: {
      status: 'inactive',
      publishedAt: null,
    },
    include: airportInclude,
  });
}

export async function deleteAirport(id: string): Promise<void> {
  await prisma.airport.delete({ where: { id } });
}
