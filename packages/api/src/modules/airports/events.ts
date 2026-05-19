import { logger } from '../../lib/logger.js';
import type { AirportRecord } from './repository.js';

// T-055: Trigger Next.js ISR revalidation after publish/unpublish.
async function triggerRevalidation(slug: string): Promise<void> {
  const webUrl = process.env['NEXT_PUBLIC_WEB_URL'] ?? 'http://localhost:3000';
  const secret = process.env['REVALIDATE_SECRET'];
  if (!secret) return;
  await fetch(`${webUrl}/api/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      paths: [`/airports/${slug}`, '/airports'],
      tags: ['airports', `airport-${slug}`],
    }),
  }).catch(() => {}); // fire-and-forget, never block the publish response
}

export async function emitAirportPublished(airport: AirportRecord): Promise<void> {
  logger.info({ airportId: airport.id, slug: airport.slug }, 'Airport published — triggering ISR revalidation');
  await triggerRevalidation(airport.slug);
}

export async function emitAirportUnpublished(airport: AirportRecord): Promise<void> {
  logger.info({ airportId: airport.id, slug: airport.slug }, 'Airport unpublished — triggering ISR revalidation');
  await triggerRevalidation(airport.slug);
}
