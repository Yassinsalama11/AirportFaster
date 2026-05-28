import { Prisma } from '@airportfaster/db';
import {
  airportSlugExists,
  createAirport,
  deleteAirport,
  findAirportById,
  listAirports,
  publishAirport,
  unpublishAirport,
  updateAirport,
} from './repository.js';
import { emitAirportPublished, emitAirportUnpublished } from './events.js';
import type {
  CreateAirportBody,
  ListAirportsQuery,
  UpdateAirportBody,
} from './validators.js';
import type { AirportRecord } from './repository.js';

export class AirportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AirportError';
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getSlugSource(data: CreateAirportBody): string {
  const english = data.translations.find((translation) => translation.locale === 'en');
  return english?.name ?? data.translations[0]?.name ?? `${data.city} ${data.iataCode}`;
}

async function generateUniqueSlug(source: string, existingAirportId?: string): Promise<string> {
  const baseSlug = slugify(source);
  const fallbackSlug = baseSlug || 'airport';
  let slug = fallbackSlug;
  let suffix = 2;

  while (await airportSlugExists(slug, existingAirportId)) {
    slug = `${fallbackSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new AirportError(
        'An airport with one of these unique fields already exists',
        'AIRPORT_CONFLICT',
        409,
      );
    }

    if (error.code === 'P2025') {
      throw new AirportError('Airport not found', 'AIRPORT_NOT_FOUND', 404);
    }

    if (error.code === 'P2003') {
      throw new AirportError(
        'One or more referenced records do not exist',
        'AIRPORT_REFERENCE_NOT_FOUND',
        400,
      );
    }
  }

  throw error;
}

export async function listAirportsService(query: ListAirportsQuery) {
  return listAirports(query);
}

export async function getAirportService(id: string): Promise<AirportRecord> {
  const airport = await findAirportById(id);

  if (!airport) {
    throw new AirportError('Airport not found', 'AIRPORT_NOT_FOUND', 404);
  }

  return airport;
}

export async function createAirportService(
  data: CreateAirportBody,
): Promise<AirportRecord> {
  const slug = await generateUniqueSlug(getSlugSource(data));

  try {
    return await createAirport(data, slug);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function updateAirportService(
  id: string,
  data: UpdateAirportBody,
): Promise<AirportRecord> {
  const currentAirport = await getAirportService(id);
  const nextSlug = data.regenerateSlug
    ? await generateUniqueSlug(getSlugSource({
        iataCode: data.iataCode ?? currentAirport.iataCode,
        country: data.country ?? currentAirport.country,
        city: data.city ?? currentAirport.city,
        timezone: data.timezone ?? currentAirport.timezone,
        translations: data.translations?.length
          ? data.translations
          : currentAirport.translations.map((translation) => ({
              locale: translation.locale,
              name: translation.name,
              description: translation.description ?? undefined,
            })),
      }), id)
    : undefined;

  try {
    return await updateAirport(id, { ...data, slug: nextSlug });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function publishAirportService(id: string): Promise<AirportRecord> {
  await getAirportService(id);

  try {
    const airport = await publishAirport(id);
    await emitAirportPublished(airport);
    return airport;
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function unpublishAirportService(id: string): Promise<AirportRecord> {
  await getAirportService(id);

  try {
    const airport = await unpublishAirport(id);
    await emitAirportUnpublished(airport);
    return airport;
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function deleteAirportService(id: string): Promise<void> {
  await getAirportService(id);

  try {
    await deleteAirport(id);
  } catch (error) {
    mapPrismaError(error);
  }
}
