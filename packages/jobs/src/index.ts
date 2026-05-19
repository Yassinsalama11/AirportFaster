// STUB: Background job workers — implemented in Sprint 2+
// BullMQ workers for: notifications, flight monitoring, sitemap generation, AI tasks

export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  FLIGHT_MONITOR: 'flight_monitor',
  SITEMAP: 'sitemap',
  AI_SEO: 'ai_seo',
  AI_TRANSLATION: 'ai_translation',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
