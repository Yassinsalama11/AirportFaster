import { writeAuditLog } from '../../lib/audit.js';
import type { NotificationChannel, NotificationType } from './types.js';

// No dedicated `notifications` table in schema — log to audit_logs with domain='notifications'

export interface NotificationLogEntry {
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  bookingId?: string;
  success: boolean;
  error?: string;
}

export async function logNotification(entry: NotificationLogEntry): Promise<void> {
  await writeAuditLog({
    action: `notifications.${entry.channel}.${entry.type}`,
    entityType: 'booking',
    entityId: entry.bookingId,
    metadata: {
      channel: entry.channel,
      type: entry.type,
      recipient: entry.recipient,
      success: entry.success,
      error: entry.error,
    },
  });
}
