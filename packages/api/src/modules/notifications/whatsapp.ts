import { logger } from '../../lib/logger.js';

// STUB: integrate Twilio/360dialog in post-MVP

export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  logger.info({ to, message }, '[WhatsApp STUB] Would send WhatsApp message');
}
