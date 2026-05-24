// ── Notification channel enums ────────────────────────────────────────────────

export enum NotificationChannel {
  Email = 'email',
  WhatsApp = 'whatsapp',
}

export enum NotificationType {
  BookingConfirmed = 'booking_confirmed',
  BookingCancelled = 'booking_cancelled',
  BookingAssigned = 'booking_assigned',
  BookingDraftReminder = 'booking_draft_reminder',
  SalesLead = 'sales_lead',
}

// ── Data types ────────────────────────────────────────────────────────────────

export interface BookingNotificationData {
  bookingId: string;
  bookingReference: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  airportName: string;
  airportIataCode: string;
  serviceName: string;
  serviceDateTime: Date;
  totalMinorUnits: number;
  currency: string;
  supplierName?: string;
  supplierContactEmail?: string;
}

export interface SalesLeadNotificationData {
  name: string;
  company: string;
  email: string;
  message: string;
  sourcePath?: string;
  userAgent?: string;
}

export interface NotificationResult {
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  success: boolean;
  error?: string;
}
