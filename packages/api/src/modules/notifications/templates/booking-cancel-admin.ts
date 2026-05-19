import type { BookingNotificationData } from '../types.js';

export function bookingCancelAdminTemplate(
  data: BookingNotificationData & { reason?: string | undefined },
): { subject: string; html: string; text: string } {
  const formattedDate = data.serviceDateTime.toLocaleString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const subject = `Cancellation request — ${data.bookingReference} (${data.airportIataCode})`;
  const reasonBlock = data.reason
    ? `<p style="margin:14px 0 0;padding:12px 14px;background:#fdf8ec;border-start:3px solid #c9a84c;color:#3f3f3f;font-size:13px;">${data.reason}</p>`
    : '';

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e5de;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#b91c1c;padding:18px 28px;">
        <p style="margin:0;color:#ffe8e8;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Cancellation Request</p>
        <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:600;">${data.bookingReference}</h1>
      </td></tr>
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 14px;color:#3f3f3f;font-size:14px;">${data.customerFirstName} ${data.customerLastName} (${data.customerEmail}) has requested to cancel their booking for <strong>${data.serviceName}</strong> at <strong>${data.airportName} (${data.airportIataCode})</strong> on <strong>${formattedDate}</strong>.</p>
        <p style="margin:6px 0 0;color:#6b6b6b;font-size:13px;">An automatic refund of <strong style="color:#a87f2e;">€${(data.totalMinorUnits / 100).toFixed(2)}</strong> has been initiated against the original payment.</p>
        ${reasonBlock}
        <p style="margin:18px 0 0;color:#6b6b6b;font-size:12px;">Open the admin dashboard to review the refund and supplier notifications.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();

  const text = `
CANCELLATION REQUEST — ${data.bookingReference}

Customer: ${data.customerFirstName} ${data.customerLastName} <${data.customerEmail}>
Airport:  ${data.airportName} (${data.airportIataCode})
Service:  ${data.serviceName}
When:     ${formattedDate}
Refund:   €${(data.totalMinorUnits / 100).toFixed(2)} (initiated)
${data.reason ? `Reason:   ${data.reason}` : ''}

Open the admin dashboard to review.
`.trim();

  return { subject, html, text };
}
