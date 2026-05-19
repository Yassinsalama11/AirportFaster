import type { BookingNotificationData } from '../types.js';

export function complaintAdminTemplate(
  data: BookingNotificationData & { complaintMessage: string; complaintCategory: string },
): { subject: string; html: string; text: string } {
  const subject = `New complaint — ${data.bookingReference} (${data.complaintCategory})`;
  const formattedDate = data.serviceDateTime.toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e5de;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#a87f2e;padding:18px 28px;">
        <p style="margin:0;color:#fdf8ec;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">New Complaint</p>
        <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:600;">${data.bookingReference}</h1>
      </td></tr>
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 14px;color:#3f3f3f;font-size:14px;">
          <strong>${data.customerFirstName} ${data.customerLastName}</strong> (${data.customerEmail}) has filed a complaint
          regarding their booking for <strong>${data.serviceName}</strong> at <strong>${data.airportName} (${data.airportIataCode})</strong>
          on ${formattedDate}.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e5de;border-radius:8px;overflow:hidden;margin:8px 0 0;">
          <tr><td style="padding:10px 14px;background:#f6f5f1;color:#3f3f3f;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Category</td>
              <td style="padding:10px 14px;background:#f6f5f1;color:#0f0f0f;font-size:13px;font-weight:600;">${data.complaintCategory}</td></tr>
          <tr><td colspan="2" style="padding:14px;color:#3f3f3f;font-size:13px;border-top:1px solid #e8e5de;white-space:pre-wrap;">${data.complaintMessage}</td></tr>
        </table>
        <p style="margin:18px 0 0;color:#6b6b6b;font-size:12px;">An incident has been created. Open the admin dashboard to assign and resolve.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();

  const text = `
NEW COMPLAINT — ${data.bookingReference}

From:     ${data.customerFirstName} ${data.customerLastName} <${data.customerEmail}>
Airport:  ${data.airportName} (${data.airportIataCode})
Service:  ${data.serviceName}
When:     ${formattedDate}
Category: ${data.complaintCategory}

${data.complaintMessage}

An incident has been created — open the admin dashboard to manage.
`.trim();

  return { subject, html, text };
}
