import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// Lazy singletons — constructed only on first use so the server boots
// cleanly in dev/test even when Redis is unavailable (ENABLE_WORKERS=false).
let _redisConnection: Redis | null = null;
let _emailQueue: Queue | null = null;
let _notificationQueue: Queue | null = null;
let _sitemapQueue: Queue | null = null;

export function getRedisConnection(): Redis {
  if (!_redisConnection) {
    _redisConnection = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }
  return _redisConnection;
}

export function getEmailQueue(): Queue {
  if (!_emailQueue) {
    _emailQueue = new Queue('email', { connection: getRedisConnection() });
  }
  return _emailQueue;
}

export function getNotificationQueue(): Queue {
  if (!_notificationQueue) {
    _notificationQueue = new Queue('notifications', { connection: getRedisConnection() });
  }
  return _notificationQueue;
}

export function getSitemapQueue(): Queue {
  if (!_sitemapQueue) {
    _sitemapQueue = new Queue('sitemap', { connection: getRedisConnection() });
  }
  return _sitemapQueue;
}

export { Queue };
