import type { BookingNotificationData } from '../types.js';

export type SalesAlertEvent = 'new_draft' | 'waiting_payment' | 'new_paid';

const EVENT_LABEL: Record<SalesAlertEvent, string> = {
  new_draft: 'New Draft Booking',
  waiting_payment: 'Waiting Payment',
  new_paid: 'New Paid Booking',
};

const EVENT_TAG_COLOR: Record<SalesAlertEvent, string> = {
  new_draft: '#6b6b6b',
  waiting_payment: '#a8872e',
  new_paid: '#1f7a3d',
};

export function bookingSalesAlertTemplate(
  data: BookingNotificationData,
  event: SalesAlertEvent,
): { subject: string; html: string; text: string } {
  const label = EVENT_LABEL[event];
  const tagColor = EVENT_TAG_COLOR[event];

  const formattedDate = data.serviceDateTime.toLocaleString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedAmount = (data.totalMinorUnits / 100).toFixed(2);
  const customerName = `${data.customerFirstName} ${data.customerLastName}`.trim() || 'Guest';

  const subject = `[${label}] ${data.bookingReference} — ${data.airportIataCode} ${data.serviceName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e5de;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0f0f0f;padding:20px 28px;">
          <p style="margin:0;color:${tagColor};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">${label}</p>
          <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:600;">${data.bookingReference}</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e5de;border-radius:10px;overflow:hidden;">
            <tr><td colspan="2" style="padding:12px 16px;background:#f6f5f1;color:#3f3f3f;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Booking</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;width:40%;">Status</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;font-weight:600;border-top:1px solid #e8e5de;">${label}</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;">Reference</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;font-weight:600;border-top:1px solid #e8e5de;">${data.bookingReference}</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;">Customer</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${customerName} &lt;${data.customerEmail || 'no email'}&gt;</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;">Airport</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${data.airportName} (${data.airportIataCode})</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;">Service</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${data.serviceName}</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;">When</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${formattedDate}</td></tr>
            <tr style="background:#fdf8ec;"><td style="padding:12px 16px;color:#0f0f0f;font-size:14px;font-weight:600;border-top:1px solid #e8e5de;">Total</td><td style="padding:12px 16px;color:#a8872e;font-size:16px;font-weight:700;border-top:1px solid #e8e5de;">€${formattedAmount}</td></tr>
          </table>
          <p style="margin:18px 0 0;color:#6b6b6b;font-size:12px;">Open the admin dashboard to view full details and follow up with the customer.</p>
        </td></tr>
        <tr><td style="padding:14px 28px;background:#f6f5f1;border-top:1px solid #e8e5de;text-align:center;">
          <p style="margin:0;color:#9b9b9b;font-size:11px;">AirportFaster sales notification · ${new Date().toISOString()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `
${label.toUpperCase()} — ${data.bookingReference}

Status:    ${label}
Customer:  ${customerName} <${data.customerEmail || 'no email'}>
Airport:   ${data.airportName} (${data.airportIataCode})
Service:   ${data.serviceName}
When:      ${formattedDate}
Total:     €${formattedAmount}

Open the admin dashboard to view full details and follow up with the customer.
`.trim();

  return { subject, html, text };
}
