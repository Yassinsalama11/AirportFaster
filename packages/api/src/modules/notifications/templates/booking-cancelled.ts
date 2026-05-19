import type { BookingNotificationData } from '../types.js';

export function bookingCancelledTemplate(data: BookingNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const formattedDate = data.serviceDateTime.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `Booking Cancelled — ${data.bookingReference} | AirportFaster`;

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
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color:#c9a84c;padding:24px 32px;">
              <h1 style="margin:0;color:#0a0e1a;font-size:24px;font-weight:bold;">AirportFaster</h1>
              <p style="margin:4px 0 0;color:#0a0e1a;font-size:14px;opacity:0.8;">Premium Airport Services</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#ef4444;margin:0 0 8px;">Booking Cancelled</h2>
              <p style="color:#d1d5db;margin:0 0 24px;">Hi ${data.customerFirstName}, your booking has been cancelled.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.05);border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr style="background-color:rgba(239,68,68,0.1);">
                  <td colspan="2" style="padding:12px 16px;color:#ef4444;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Cancelled Booking</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">Reference</td>
                  <td style="padding:12px 16px;color:#f9fafb;font-size:14px;font-weight:bold;border-top:1px solid rgba(255,255,255,0.05);">${data.bookingReference}</td>
                </tr>
                <tr style="background-color:rgba(255,255,255,0.02);">
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">Airport</td>
                  <td style="padding:12px 16px;color:#f9fafb;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">${data.airportName} (${data.airportIataCode})</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">Service</td>
                  <td style="padding:12px 16px;color:#f9fafb;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">${data.serviceName}</td>
                </tr>
                <tr style="background-color:rgba(255,255,255,0.02);">
                  <td style="padding:12px 16px;color:#9ca3af;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">Date</td>
                  <td style="padding:12px 16px;color:#f9fafb;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">${formattedDate}</td>
                </tr>
              </table>

              <p style="color:#d1d5db;margin:0 0 16px;font-size:14px;">If you believe this is an error or would like to rebook, please contact us.</p>
              <p style="color:#9ca3af;font-size:13px;margin:0;">Contact us at <a href="mailto:support@airportfaster.com" style="color:#c9a84c;">support@airportfaster.com</a></p>
            </td>
          </tr>
          <!-- Footer -->
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
Booking Cancelled — AirportFaster

Hi ${data.customerFirstName},

Your booking has been cancelled.

Reference: ${data.bookingReference}
Airport: ${data.airportName} (${data.airportIataCode})
Service: ${data.serviceName}
Date: ${formattedDate}

If you believe this is an error or would like to rebook, please contact support@airportfaster.com

© ${new Date().getFullYear()} AirportFaster
  `.trim();

  return { subject, html, text };
}
