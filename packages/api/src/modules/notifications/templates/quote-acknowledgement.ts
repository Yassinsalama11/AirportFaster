import type { QuoteRequestData } from './quote-request.js';

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

export function quoteAcknowledgementTemplate(
  data: QuoteRequestData,
): { subject: string; html: string; text: string } {
  const firstName = data.fullName.split(' ')[0] ?? data.fullName;
  const subject = `We've received your request — ${data.airportName} (${data.airportIataCode})`;

  const detailRow = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding:8px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;width:38%;">${escapeHtml(label)}</td><td style="padding:8px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${escapeHtml(value)}</td></tr>`
      : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e5de;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0f0f0f;padding:24px 28px;">
          <p style="margin:0;color:#c9a14a;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">AirportFaster</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:600;">We've received your request</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 14px;color:#0f0f0f;font-size:15px;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
          <p style="margin:0 0 16px;color:#3f3f3f;font-size:14px;line-height:1.7;">
            Thank you for your request for service at <strong>${escapeHtml(data.airportName)} (${escapeHtml(data.airportIataCode)})</strong>.
            Our customer service team is already reviewing your details and will contact you with a tailored quote
            <strong>within minutes</strong>. There's nothing else you need to do right now.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border:1px solid #e8e5de;border-radius:10px;overflow:hidden;">
            <tr><td colspan="2" style="padding:12px 16px;background:#f6f5f1;color:#3f3f3f;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Your request</td></tr>
            ${detailRow('Airport', `${data.airportName} (${data.airportIataCode})`)}
            ${detailRow('Service', data.serviceName)}
            ${detailRow('Direction', data.direction)}
            ${detailRow('Service date', data.serviceDate)}
            ${detailRow('Passengers', String(data.passengerCount))}
            ${detailRow('Flight number', data.flightNumber)}
            ${detailRow('Terminal', data.terminal)}
          </table>

          ${data.specialRequests
            ? `<div style="margin-top:18px;padding:14px 16px;border:1px solid #e8e5de;border-radius:10px;background:#fdfcf8;">
                <p style="margin:0 0 6px;color:#6b6b6b;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Your message</p>
                <p style="margin:0;color:#0f0f0f;font-size:14px;line-height:1.6;">${escapeHtml(data.specialRequests).replace(/\n/g, '<br />')}</p>
              </div>`
            : ''}

          <div style="margin-top:22px;padding:16px;border-radius:10px;background:#fff8e8;border:1px solid #f0d995;">
            <p style="margin:0;color:#5b4500;font-size:13px;line-height:1.6;">
              <strong>Need it urgently?</strong> Reply to this email or message us on WhatsApp at
              <a href="https://wa.me/441748220006" style="color:#a8872e;text-decoration:none;font-weight:600;">+44 1748 220006</a>.
            </p>
          </div>

          <p style="margin:22px 0 0;color:#6b6b6b;font-size:13px;line-height:1.6;">
            Warm regards,<br />
            <strong style="color:#0f0f0f;">The AirportFaster Customer Service Team</strong><br />
            <a href="mailto:support@airportfaster.com" style="color:#a8872e;text-decoration:none;">support@airportfaster.com</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f6f5f1;border-top:1px solid #e8e5de;">
          <p style="margin:0;color:#8a8a8a;font-size:11px;line-height:1.5;">
            You're receiving this because you submitted a quote request on airportfaster.com. If this wasn't you,
            please ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `
Hi ${firstName},

We've received your quote request for ${data.airportName} (${data.airportIataCode}).

Our customer service team is already reviewing your details and will contact you with a tailored quote within minutes.

Your request:
- Airport:     ${data.airportName} (${data.airportIataCode})
${data.serviceName ? `- Service:     ${data.serviceName}\n` : ''}${data.direction ? `- Direction:   ${data.direction}\n` : ''}- Service date: ${data.serviceDate}
- Passengers:  ${data.passengerCount}
${data.flightNumber ? `- Flight:      ${data.flightNumber}\n` : ''}${data.terminal ? `- Terminal:    ${data.terminal}\n` : ''}${data.specialRequests ? `\nYour message:\n${data.specialRequests}\n` : ''}

Need it urgently? Reply to this email or WhatsApp us at +44 1748 220006.

— The AirportFaster Customer Service Team
support@airportfaster.com
`.trim();

  return { subject, html, text };
}
