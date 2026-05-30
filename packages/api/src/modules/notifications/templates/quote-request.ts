export interface QuoteRequestData {
  fullName: string;
  email: string;
  phone?: string;
  airportName: string;
  airportIataCode: string;
  serviceName?: string;
  direction?: string;
  serviceDate: string;
  passengerCount: number;
  flightNumber?: string;
  terminal?: string;
  specialRequests?: string;
  sourcePath?: string;
  userAgent?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function row(label: string, value: string | undefined | null): string {
  if (!value) return '';
  return `<tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;width:34%;">${escapeHtml(label)}</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${escapeHtml(value)}</td></tr>`;
}

export function quoteRequestTemplate(
  data: QuoteRequestData,
): { subject: string; html: string; text: string } {
  const subject = `[Quote Request] ${data.airportName} (${data.airportIataCode})${data.serviceName ? ` — ${data.serviceName}` : ''}`;
  const submittedAt = new Date().toISOString();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e5de;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0f0f0f;padding:20px 28px;">
          <p style="margin:0;color:#a8872e;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">New Quote Request</p>
          <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:600;">${escapeHtml(data.airportName)} (${escapeHtml(data.airportIataCode)})</h1>
          ${data.serviceName ? `<p style="margin:4px 0 0;color:#d8d4c4;font-size:14px;">${escapeHtml(data.serviceName)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e5de;border-radius:10px;overflow:hidden;">
            <tr><td colspan="2" style="padding:12px 16px;background:#f6f5f1;color:#3f3f3f;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Customer</td></tr>
            ${row('Name', data.fullName)}
            ${row('Email', data.email)}
            ${row('Phone', data.phone)}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border:1px solid #e8e5de;border-radius:10px;overflow:hidden;">
            <tr><td colspan="2" style="padding:12px 16px;background:#f6f5f1;color:#3f3f3f;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Service request</td></tr>
            ${row('Airport', `${data.airportName} (${data.airportIataCode})`)}
            ${row('Service', data.serviceName)}
            ${row('Direction', data.direction)}
            ${row('Service date', data.serviceDate)}
            ${row('Passengers', String(data.passengerCount))}
            ${row('Flight number', data.flightNumber)}
            ${row('Terminal', data.terminal)}
          </table>

          ${data.specialRequests
            ? `<div style="margin-top:18px;padding:16px;border:1px solid #e8e5de;border-radius:10px;background:#fdfcf8;">
                <p style="margin:0 0 8px;color:#6b6b6b;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Special requests / message</p>
                <p style="margin:0;color:#0f0f0f;font-size:14px;line-height:1.6;">${escapeHtml(data.specialRequests).replace(/\n/g, '<br />')}</p>
              </div>`
            : ''}

          <div style="margin-top:24px;padding:14px 16px;border-radius:10px;background:#fff8e8;border:1px solid #f0d995;">
            <p style="margin:0;color:#5b4500;font-size:13px;line-height:1.5;">
              <strong>Action needed:</strong> This airport doesn't have configured pricing yet. Reply to the customer at
              <a href="mailto:${escapeHtml(data.email)}" style="color:#a8872e;">${escapeHtml(data.email)}</a>
              with a quote within 24 hours.
            </p>
          </div>

          <p style="margin:18px 0 0;color:#8a8a8a;font-size:12px;">Submitted at ${submittedAt}</p>
          ${data.sourcePath ? `<p style="margin:6px 0 0;color:#8a8a8a;font-size:11px;">Source: ${escapeHtml(data.sourcePath)}</p>` : ''}
          ${data.userAgent ? `<p style="margin:4px 0 0;color:#8a8a8a;font-size:11px;">User agent: ${escapeHtml(data.userAgent)}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const lines = [
    'NEW QUOTE REQUEST',
    '',
    `Airport:    ${data.airportName} (${data.airportIataCode})`,
    data.serviceName ? `Service:    ${data.serviceName}` : '',
    data.direction ? `Direction:  ${data.direction}` : '',
    `Date:       ${data.serviceDate}`,
    `Passengers: ${data.passengerCount}`,
    data.flightNumber ? `Flight:     ${data.flightNumber}` : '',
    data.terminal ? `Terminal:   ${data.terminal}` : '',
    '',
    `Name:       ${data.fullName}`,
    `Email:      ${data.email}`,
    data.phone ? `Phone:      ${data.phone}` : '',
    '',
    data.specialRequests ? `Special requests / message:\n${data.specialRequests}` : '',
    '',
    `Submitted at ${submittedAt}`,
    data.sourcePath ? `Source: ${data.sourcePath}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text: lines };
}
