import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/** Plain-text emails ending with our upload link → HTML button + URL line (matches queued messages & templates). */
export function buildEmailHtmlFromPlainText(text: string): string {
  const trimmed = text.trimEnd();

  const labeled =
    /^([\s\S]*)\r?\n(?:upload photo or bms record:|upload link:)\s*(https?:\/\/\S+)\s*$/im.exec(
      trimmed,
    );
  const tailUrl =
    /^([\s\S]*)\r?\n(https?:\/\/[^\s]+\/upload\?token=[^\s]+)\s*$/im.exec(trimmed);

  let beforeRaw: string | undefined;
  let heading = 'Upload photo or BMS record';
  let urlRaw: string | undefined;

  if (labeled) {
    beforeRaw = labeled[1]?.trimEnd() ?? '';
    heading = /\bupload link:/i.test(labeled[0])
      ? 'Upload link'
      : 'Upload photo or BMS record';
    urlRaw = labeled[2]?.trim().replace(/[.)]+$/, '') ?? '';
  } else if (tailUrl) {
    beforeRaw = tailUrl[1]?.trimEnd() ?? '';
    urlRaw = tailUrl[2]?.trim().replace(/[.)]+$/, '') ?? '';
  } else {
    const onlyUpload =
      /^(?:upload photo or bms record:|upload link:)\s*(https?:\/\/\S+)\s*$/im.exec(trimmed);
    if (onlyUpload) {
      beforeRaw = '';
      heading = /\bupload link:/i.test(trimmed) ? 'Upload link' : 'Upload photo or BMS record';
      urlRaw = onlyUpload[1]?.trim().replace(/[.)]+$/, '') ?? '';
    }
  }

  const wrapBody = (escaped: string) =>
    escaped
      ? `<div style="margin:0 0 4px 0">${escaped.replace(/\r?\n/g, '<br />')}</div>`
      : '';

  if (!urlRaw || !/^https?:\/\//i.test(urlRaw)) {
    return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.55;color:#111827">${escapeHtml(
      trimmed,
    ).replace(/\r?\n/g, '<br />')}</div>`;
  }

  const href = escapeHtmlAttr(urlRaw);
  const displayUrl = escapeHtml(urlRaw);

  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.55;color:#111827;">
${wrapBody(beforeRaw ? escapeHtml(beforeRaw) : '')}
<p style="margin:20px 0 10px;font-weight:600;color:#111827">${escapeHtml(heading)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;"><tr><td style="border-radius:8px;background:#2563eb;"><a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;border-radius:8px;">Upload now</a></td></tr></table>
<p style="margin:14px 0 6px;font-size:13px;color:#6b7280">${escapeHtml('Or copy this link:')}</p>
<p style="margin:0;font-size:13px;line-height:1.45;word-break:break-all;"><a href="${href}" style="color:#2563eb;">${displayUrl}</a></p>
</div>`;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (!apiKey || !fromEmail) {
    console.warn('SendGrid not configured, email not sent');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    const msg = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      text: options.text,
      html: options.html ?? buildEmailHtmlFromPlainText(options.text),
    };

    const [response] = await sgMail.send(msg);

    return {
      success: true,
      messageId: response.headers['x-message-id'] as string,
    };
  } catch (error: any) {
    const msg = error?.response?.body?.errors?.[0]?.message ?? error?.message ?? 'Failed to send email';
    console.error('Error sending email:', msg);
    return {
      success: false,
      error: msg,
    };
  }
}

export function isEmailConfigured(): boolean {
  return !!(apiKey && fromEmail);
}
