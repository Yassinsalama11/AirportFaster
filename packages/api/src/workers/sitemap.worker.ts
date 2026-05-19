// Sitemap regeneration worker — processes sitemap revalidation jobs from the 'sitemap' queue.
// Job data shape: { action: 'revalidate', airportSlug?: string }
// STUB: logs the job and marks complete. Real implementation will call
// Next.js revalidation endpoint (POST http://localhost:3000/api/revalidate with secret).

import { Worker } from 'bullmq';
import { getRedisConnection } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

export interface SitemapJobData {
  action: 'revalidate';
  airportSlug?: string;
}

export function startSitemapWorker(): Worker {
  const worker = new Worker<SitemapJobData>(
    'sitemap',
    async (job) => {
      const { action, airportSlug } = job.data;
      logger.info({ jobId: job.id, action, airportSlug }, 'Processing sitemap job');

      // STUB: integrate Next.js revalidation in post-MVP.
      // Real implementation:
      //   const revalidateSecret = process.env['REVALIDATE_SECRET'];
      //   const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
      //   await fetch(`${baseUrl}/api/revalidate`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': revalidateSecret ?? '' },
      //     body: JSON.stringify({ action, airportSlug }),
      //   });
      logger.info({ jobId: job.id, action, airportSlug }, 'Sitemap job stub completed');
    },
    {
      connection: getRedisConnection(),
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Sitemap job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Sitemap worker encountered an error');
  });

  logger.info('Sitemap worker started');
  return worker;
}
