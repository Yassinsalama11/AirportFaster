import type { BookingNotificationData } from '../types.js';

function formatAmount(minorUnits: number, currency: string): string {
  return `${currency} ${(minorUnits / 100).toFixed(2)}`;
}

export function bookingDraftReminderTemplate(data: BookingNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] ?? process.env['NEXT_PUBLIC_WEB_URL'] ?? 'https://airportfaster.com';
  const paymentUrl = `${baseUrl.replace(/\/$/, '')}/en/book/${data.bookingId}/payment?currency=${encodeURIComponent(data.currency)}&ref=${encodeURIComponent(data.bookingReference)}`;
  const formattedDate = data.serviceDateTime.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const total = formatAmount(data.totalMinorUnits, data.currency);
  const subject = `Complete your AirportFaster booking — ${data.bookingReference}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="background-color:#c9a84c;padding:24px 32px;">
              <h1 style="margin:0;color:#0a0e1a;font-size:24px;font-weight:bold;">AirportFaster</h1>
              <p style="margin:4px 0 0;color:#0a0e1a;font-size:14px;opacity:0.82;">Premium airport services</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#c9a84c;margin:0 0 8px;">Your booking is almost ready</h2>
              <p style="color:#d1d5db;margin:0 0 18px;">Hi ${data.customerFirstName}, we saved your booking as a draft. Complete payment now so we can secure your airport service before availability changes.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;">Reference</td>
                  <td style="padding:12px 16px;color:#f9fafb;font-size:14px;font-weight:bold;">${data.bookingReference}</td>
                </tr>
                <tr style="background-color:rgba(255,255,255,0.02);">
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;">Airport</td>
                  <td style="padding:12px 16px;color:#f9fafb;font-size:14px;">${data.airportName} (${data.airportIataCode})</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;">Service</td>
                  <td style="padding:12px 16px;color:#f9fafb;font-size:14px;">${data.serviceName}</td>
                </tr>
                <tr style="background-color:rgba(255,255,255,0.02);">
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;">Date</td>
                  <td style="padding:12px 16px;color:#f9fafb;font-size:14px;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;">Total</td>
                  <td style="padding:12px 16px;color:#c9a84c;font-size:14px;font-weight:bold;">${total}</td>
                </tr>
              </table>
              <a href="${paymentUrl}" style="display:inline-block;background-color:#c9a84c;color:#0a0e1a;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:8px;">Complete payment</a>
              <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;">Questions? Contact <a href="mailto:support@airportfaster.com" style="color:#c9a84c;">support@airportfaster.com</a>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="color:#6b7280;font-size:12px;margin:0;text-align:center;">&copy; ${new Date().getFullYear()} AirportFaster. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Complete your AirportFaster booking

Hi ${data.customerFirstName},

We saved your booking as a draft. Complete payment now so we can secure your airport service before availability changes.

Reference: ${data.bookingReference}
Airport: ${data.airportName} (${data.airportIataCode})
Service: ${data.serviceName}
Date: ${formattedDate}
Total: ${total}

Complete payment: ${paymentUrl}

Need help? Contact support@airportfaster.com
  `.trim();

  return { subject, html, text };
}
