import type { SalesLeadNotificationData } from '../types.js';

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

export function salesLeadTemplate(
  data: SalesLeadNotificationData,
): { subject: string; html: string; text: string } {
  const name = escapeHtml(data.name);
  const company = escapeHtml(data.company);
  const email = escapeHtml(data.email);
  const message = escapeHtml(data.message).replace(/\n/g, '<br />');
  const sourcePath = escapeHtml(data.sourcePath ?? 'Unknown');
  const userAgent = escapeHtml(data.userAgent ?? 'Unknown');
  const submittedAt = new Date().toISOString();

  const subject = `[Sales Lead] ${data.company} — ${data.name}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e5de;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0f0f0f;padding:20px 28px;">
          <p style="margin:0;color:#a8872e;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">For Business Enquiry</p>
          <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:600;">${company}</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e5de;border-radius:10px;overflow:hidden;">
            <tr><td colspan="2" style="padding:12px 16px;background:#f6f5f1;color:#3f3f3f;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Lead details</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;width:34%;">Name</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${name}</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;">Company</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${company}</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;">Email</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${email}</td></tr>
            <tr><td style="padding:10px 16px;color:#6b6b6b;font-size:13px;border-top:1px solid #e8e5de;">Source</td><td style="padding:10px 16px;color:#0f0f0f;font-size:13px;border-top:1px solid #e8e5de;">${sourcePath}</td></tr>
          </table>
          <div style="margin-top:18px;padding:16px;border:1px solid #e8e5de;border-radius:10px;background:#fdfcf8;">
            <p style="margin:0 0 8px;color:#6b6b6b;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Message</p>
            <p style="margin:0;color:#0f0f0f;font-size:14px;line-height:1.6;">${message}</p>
          </div>
          <p style="margin:18px 0 0;color:#8a8a8a;font-size:12px;">Submitted at ${submittedAt}</p>
          <p style="margin:6px 0 0;color:#8a8a8a;font-size:11px;">User agent: ${userAgent}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `
FOR BUSINESS ENQUIRY

Name:    ${data.name}
Company: ${data.company}
Email:   ${data.email}
Source:  ${data.sourcePath ?? 'Unknown'}

Message:
${data.message}

Submitted at: ${submittedAt}
User agent: ${data.userAgent ?? 'Unknown'}
`.trim();

  return { subject, html, text };
}
