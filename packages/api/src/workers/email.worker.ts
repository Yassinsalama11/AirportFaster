// Email job worker — processes email jobs from the 'email' BullMQ queue.
// Job data shape: { to: string, subject: string, html: string, text: string }
// Retries up to 3 times with exponential backoff on failure (configured at enqueue time).

import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { getRedisConnection } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function createTransport() {
  const host = process.env['SMTP_HOST'];
  const port = process.env['SMTP_PORT'];
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];

  if (!host) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    secure: port === '465',
    auth: user && pass ? { user, pass } : undefined,
  });
}

const FROM_ADDRESS = process.env['SMTP_FROM'] ?? 'AirportFaster <noreply@airportfaster.com>';

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job) => {
      const { to, subject, html, text } = job.data;
      logger.info({ jobId: job.id, to, subject }, 'Processing email job');

      const transport = createTransport();
      await transport.sendMail({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
        text,
      });

      logger.info({ jobId: job.id, to }, 'Email job completed successfully');
    },
    {
      connection: getRedisConnection(),
    },
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, to: job?.data?.to, err },
      'Email job failed after all retries',
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Email worker encountered an error');
  });

  logger.info('Email worker started');
  return worker;
}
