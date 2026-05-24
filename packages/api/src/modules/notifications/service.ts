import nodemailer from 'nodemailer';
import { prisma } from '@airportfaster/db';
import { logger } from '../../lib/logger.js';
import { logNotification } from './repository.js';
import { NotificationChannel, NotificationType } from './types.js';
import type { BookingNotificationData, SalesLeadNotificationData } from './types.js';
import { bookingConfirmedTemplate } from './templates/booking-confirmed.js';
import { bookingCancelledTemplate } from './templates/booking-cancelled.js';
import { bookingAssignedTemplate } from './templates/booking-assigned.js';
import { bookingPaidAdminTemplate } from './templates/booking-paid-admin.js';
import { bookingCancelAdminTemplate } from './templates/booking-cancel-admin.js';
import { complaintAdminTemplate } from './templates/complaint-admin.js';
import { bookingDraftReminderTemplate } from './templates/booking-draft-reminder.js';
import { bookingSalesAlertTemplate, type SalesAlertEvent } from './templates/booking-sales-alert.js';
import { salesLeadTemplate } from './templates/sales-lead.js';

// ── SMTP Transport ────────────────────────────────────────────────────────────

function createTransport() {
  const host = process.env['SMTP_HOST'];
  const port = process.env['SMTP_PORT'];
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];

  // If no SMTP config, use a no-op JSON transport (safe for test/dev)
  if (!host) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    secure: port === '465',
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
  });
}

const FROM_ADDRESS = process.env['SMTP_FROM'] ?? 'AirportFaster <noreply@airportfaster.com>';

// ── Core send function ────────────────────────────────────────────────────────

function parseAddress(value: string): { address: string; name?: string } {
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (!match) return { address: value.trim() };

  const name = match[1]?.trim().replace(/^["']|["']$/g, '');
  const address = match[2]?.trim() ?? value.trim();
  return name ? { address, name } : { address };
}

async function sendResendEmail(
  to: string[],
  template: { subject: string; html: string; text: string },
): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY'] ?? process.env['SMTP_PASS'];
  if (!apiKey) {
    throw new Error('Resend API key is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(`Resend API error ${response.status}: ${responseText.slice(0, 500)}`);
  }

  const result = await response.json().catch(() => undefined) as { id?: string } | undefined;
  logger.info({ to, provider: 'resend', messageId: result?.id }, 'Email accepted by provider');
}

async function sendZeptoMailEmail(
  to: string[],
  template: { subject: string; html: string; text: string },
): Promise<void> {
  const apiKey = process.env['ZEPTOMAIL_API_KEY'] ?? process.env['SMTP_PASS'];
  if (!apiKey) {
    throw new Error('Zepto Mail API key is not configured');
  }

  const response = await fetch('https://api.zeptomail.com/v1.1/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Zoho-enczapikey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: parseAddress(FROM_ADDRESS),
      to: to.map((address) => ({ email_address: { address } })),
      subject: template.subject,
      htmlbody: template.html,
      textbody: template.text,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    throw new Error(`Zepto Mail API error ${response.status}: ${responseText.slice(0, 500)}`);
  }

  const result = await response.json().catch(() => undefined) as { request_id?: string } | undefined;
  logger.info({ to, provider: 'zeptomail', messageId: result?.request_id }, 'Email accepted by provider');
}

async function sendEmail(
  to: string | string[],
  template: { subject: string; html: string; text: string },
): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  if (process.env['ZEPTOMAIL_API_KEY'] || process.env['SMTP_HOST'] === 'smtp.zeptomail.com') {
    await sendZeptoMailEmail(recipients, template);
    return;
  }

  if (process.env['RESEND_API_KEY'] || process.env['SMTP_HOST'] === 'smtp.resend.com') {
    await sendResendEmail(recipients, template);
    return;
  }

  const transport = createTransport();
  await transport.sendMail({
    from: FROM_ADDRESS,
    to: recipients,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

// ── Public notification dispatchers ───────────────────────────────────────────

export async function sendBookingConfirmedEmail(data: BookingNotificationData): Promise<void> {
  try {
    const template = bookingConfirmedTemplate(data);
    await sendEmail(data.customerEmail, template);
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.BookingConfirmed,
      recipient: data.customerEmail,
      bookingId: data.bookingId,
      success: true,
    });
    logger.info({ bookingId: data.bookingId, to: data.customerEmail }, 'Booking confirmed email sent');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, bookingId: data.bookingId }, 'Failed to send booking confirmed email');
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.BookingConfirmed,
      recipient: data.customerEmail,
      bookingId: data.bookingId,
      success: false,
      error: errorMessage,
    }).catch(() => undefined); // audit log failure must never propagate
  }
}

export async function sendBookingCancelledEmail(data: BookingNotificationData): Promise<void> {
  try {
    const template = bookingCancelledTemplate(data);
    await sendEmail(data.customerEmail, template);
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.BookingCancelled,
      recipient: data.customerEmail,
      bookingId: data.bookingId,
      success: true,
    });
    logger.info({ bookingId: data.bookingId, to: data.customerEmail }, 'Booking cancelled email sent');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, bookingId: data.bookingId }, 'Failed to send booking cancelled email');
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.BookingCancelled,
      recipient: data.customerEmail,
      bookingId: data.bookingId,
      success: false,
      error: errorMessage,
    }).catch(() => undefined);
  }
}

export async function sendBookingAssignedToSupplierEmail(
  data: BookingNotificationData,
): Promise<void> {
  if (!data.supplierContactEmail) {
    logger.warn({ bookingId: data.bookingId }, 'No supplier contact email — skipping notification');
    return;
  }

  try {
    const template = bookingAssignedTemplate(data);
    await sendEmail(data.supplierContactEmail, template);
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.BookingAssigned,
      recipient: data.supplierContactEmail,
      bookingId: data.bookingId,
      success: true,
    });
    logger.info(
      { bookingId: data.bookingId, to: data.supplierContactEmail },
      'Booking assigned email sent to supplier',
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, bookingId: data.bookingId }, 'Failed to send booking assigned email');
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.BookingAssigned,
      recipient: data.supplierContactEmail,
      bookingId: data.bookingId,
      success: false,
      error: errorMessage,
    }).catch(() => undefined);
  }
}

export async function sendBookingDraftReminderEmail(data: BookingNotificationData): Promise<void> {
  try {
    const template = bookingDraftReminderTemplate(data);
    await sendEmail(data.customerEmail, template);
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.BookingDraftReminder,
      recipient: data.customerEmail,
      bookingId: data.bookingId,
      success: true,
    });
    logger.info({ bookingId: data.bookingId, to: data.customerEmail }, 'Booking draft reminder email sent');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, bookingId: data.bookingId }, 'Failed to send booking draft reminder email');
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.BookingDraftReminder,
      recipient: data.customerEmail,
      bookingId: data.bookingId,
      success: false,
      error: errorMessage,
    }).catch(() => undefined);
  }
}

// ── Sales notification (internal team alerts at each funnel stage) ────────────

const SALES_DEFAULT_EMAIL = 'sales@airportfaster.com';

function parseEmailList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function resolveSalesEmails(): string[] {
  return parseEmailList(process.env['SALES_NOTIFICATION_EMAIL'] ?? SALES_DEFAULT_EMAIL);
}

export async function sendSalesBookingAlert(
  data: BookingNotificationData,
  event: SalesAlertEvent,
): Promise<void> {
  const to = resolveSalesEmails();
  if (to.length === 0) {
    logger.warn({ bookingId: data.bookingId, event }, 'No sales email configured — skipping sales alert');
    return;
  }
  try {
    const template = bookingSalesAlertTemplate(data, event);
    await sendEmail(to, template);
    logger.info({ bookingId: data.bookingId, event, to }, 'Sales alert email sent');
  } catch (error) {
    logger.error({ error, bookingId: data.bookingId, event }, 'Failed to send sales alert email');
  }
}

export async function sendSalesBookingAlertById(
  bookingId: string,
  event: SalesAlertEvent,
): Promise<void> {
  const data = await loadBookingNotificationData(bookingId);
  if (!data) {
    logger.warn({ bookingId, event }, 'sendSalesBookingAlertById: booking not found');
    return;
  }
  await sendSalesBookingAlert(data, event);
}

export async function sendSalesLeadNotification(data: SalesLeadNotificationData): Promise<boolean> {
  const to = resolveSalesEmails();
  if (to.length === 0) {
    logger.warn({ email: data.email }, 'No sales email configured — skipping sales lead notification');
    return false;
  }

  try {
    const template = salesLeadTemplate(data);
    await sendEmail(to, template);
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.SalesLead,
      recipient: to.join(','),
      success: true,
    });
    logger.info({ email: data.email, company: data.company, to }, 'Sales lead email sent');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, email: data.email, company: data.company }, 'Failed to send sales lead email');
    await logNotification({
      channel: NotificationChannel.Email,
      type: NotificationType.SalesLead,
      recipient: to.join(','),
      success: false,
      error: errorMessage,
    }).catch(() => undefined);
    return false;
  }
}

// ── Admin notification on paid booking ────────────────────────────────────────

async function sendBookingPaidAdminEmail(data: BookingNotificationData): Promise<void> {
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? process.env['ADMIN_NOTIFICATION_EMAIL'];
  if (!adminEmail) {
    logger.warn({ bookingId: data.bookingId }, 'No admin email configured — skipping admin notification');
    return;
  }
  try {
    const template = bookingPaidAdminTemplate(data);
    await sendEmail(adminEmail, template);
    logger.info({ bookingId: data.bookingId, to: adminEmail }, 'Admin paid-booking notification sent');
  } catch (error) {
    logger.error({ error, bookingId: data.bookingId }, 'Failed to send admin paid-booking notification');
  }
}

/**
 * Fired by the Stripe webhook on payment_intent.succeeded.
 * Loads the booking with all relations needed for the email and dispatches
 * both the customer confirmation and the internal admin alert.
 */
export async function sendBookingPaidNotifications(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      airportService: {
        include: {
          airport: { include: { translations: true } },
          service: { include: { translations: true } },
        },
      },
      supplier: { include: { contacts: true } },
    },
  });

  if (!booking) {
    logger.warn({ bookingId }, 'sendBookingPaidNotifications: booking not found');
    return;
  }

  const airportEn = booking.airportService.airport.translations.find((t: { locale: string }) => t.locale === 'en');
  const serviceEn = booking.airportService.service.translations.find((t: { locale: string }) => t.locale === 'en');
  const supplier = booking.supplier;
  const supplierPrimaryContact = supplier?.contacts.find((c: { isPrimary: boolean }) => c.isPrimary) ?? supplier?.contacts[0];

  const data: BookingNotificationData = {
    bookingId: booking.id,
    bookingReference: booking.reference,
    customerFirstName: booking.customer?.firstName ?? 'Guest',
    customerLastName: booking.customer?.lastName ?? '',
    customerEmail: booking.customer?.email ?? '',
    airportName: airportEn?.name ?? booking.airportService.airport.city,
    airportIataCode: booking.airportService.airport.iataCode,
    serviceName: serviceEn?.name ?? booking.airportService.service.slug,
    serviceDateTime: booking.serviceDateTime,
    totalMinorUnits: booking.totalMinor,
    currency: booking.currency,
    ...(supplier && { supplierName: supplier.name }),
    ...(supplierPrimaryContact?.email && { supplierContactEmail: supplierPrimaryContact.email }),
  };

  // Fire-and-forget — never let a failed email block the webhook.
  if (data.customerEmail) {
    await sendBookingConfirmedEmail(data);
  } else {
    logger.warn({ bookingId }, 'Booking has no customer email — skipping customer confirmation');
  }
  await sendBookingPaidAdminEmail(data);
  await sendSalesBookingAlert(data, 'new_paid');
}

// ── Helper: load booking notification data ────────────────────────────────────

async function loadBookingNotificationData(bookingId: string): Promise<BookingNotificationData | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      airportService: {
        include: {
          airport: { include: { translations: true } },
          service: { include: { translations: true } },
        },
      },
      supplier: { include: { contacts: true } },
    },
  });
  if (!booking) return null;
  const airportEn = booking.airportService.airport.translations.find((t: { locale: string }) => t.locale === 'en');
  const serviceEn = booking.airportService.service.translations.find((t: { locale: string }) => t.locale === 'en');
  const supplier = booking.supplier;
  const supplierPrimaryContact = supplier?.contacts.find((c: { isPrimary: boolean }) => c.isPrimary) ?? supplier?.contacts[0];
  return {
    bookingId: booking.id,
    bookingReference: booking.reference,
    customerFirstName: booking.customer?.firstName ?? 'Guest',
    customerLastName: booking.customer?.lastName ?? '',
    customerEmail: booking.customer?.email ?? '',
    airportName: airportEn?.name ?? booking.airportService.airport.city,
    airportIataCode: booking.airportService.airport.iataCode,
    serviceName: serviceEn?.name ?? booking.airportService.service.slug,
    serviceDateTime: booking.serviceDateTime,
    totalMinorUnits: booking.totalMinor,
    currency: booking.currency,
    ...(supplier && { supplierName: supplier.name }),
    ...(supplierPrimaryContact?.email && { supplierContactEmail: supplierPrimaryContact.email }),
  };
}

// ── Cancellation: notify admin ────────────────────────────────────────────────

export async function sendCancellationAdminNotification(bookingId: string, reason?: string): Promise<void> {
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? process.env['ADMIN_NOTIFICATION_EMAIL'];
  if (!adminEmail) {
    logger.warn({ bookingId }, 'No admin email configured — skipping cancellation notification');
    return;
  }
  try {
    const data = await loadBookingNotificationData(bookingId);
    if (!data) {
      logger.warn({ bookingId }, 'sendCancellationAdminNotification: booking not found');
      return;
    }
    const template = bookingCancelAdminTemplate({ ...data, reason });
    await sendEmail(adminEmail, template);
    logger.info({ bookingId, to: adminEmail }, 'Admin cancellation notification sent');
  } catch (error) {
    logger.error({ error, bookingId }, 'Failed to send admin cancellation notification');
  }
}

// ── Complaint: notify admin ───────────────────────────────────────────────────

export async function sendComplaintAdminNotification(
  bookingId: string,
  complaintCategory: string,
  complaintMessage: string,
): Promise<void> {
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? process.env['ADMIN_NOTIFICATION_EMAIL'];
  if (!adminEmail) {
    logger.warn({ bookingId }, 'No admin email configured — skipping complaint notification');
    return;
  }
  try {
    const data = await loadBookingNotificationData(bookingId);
    if (!data) {
      logger.warn({ bookingId }, 'sendComplaintAdminNotification: booking not found');
      return;
    }
    const template = complaintAdminTemplate({ ...data, complaintCategory, complaintMessage });
    await sendEmail(adminEmail, template);
    logger.info({ bookingId, to: adminEmail }, 'Admin complaint notification sent');
  } catch (error) {
    logger.error({ error, bookingId }, 'Failed to send admin complaint notification');
  }
}
