/**
 * Proxy email për Render – dërgon përmes Brevo/SendGrid HTTP nga Vercel (pa SMTP).
 * Render thërret këtë route kur EMAIL_PROXY_URL është vendosur.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

type SendBody = {
  to?: string;
  subject?: string;
  html?: string;
  brevoKey?: string;
  senderEmail?: string;
  senderName?: string;
};

async function sendViaBrevo(
  { to, subject, html }: Required<Pick<SendBody, 'to' | 'subject' | 'html'>>,
  { apiKey, senderEmail, senderName }: { apiKey: string; senderEmail: string; senderName: string }
) {
  if (!apiKey) return { ok: false, error: 'BREVO_API_KEY mungon.' };
  if (!senderEmail) return { ok: false, error: 'BREVO_SENDER_EMAIL mungon.' };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 && /unrecognised IP|authorized_ips/i.test(body)) {
      return {
        ok: false,
        error:
          'Brevo: IP e Vercel nuk është e autorizuar. Kontrollo email-in e Brevo dhe kliko "Authorize IP", ose çaktivizo IP blocking te brevo.com/security/authorised_ips',
      };
    }
    return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 220)}` };
  }
  return { ok: true, provider: 'brevo' };
}

async function sendViaSendGrid({ to, subject, html }: Required<SendBody>) {
  const key = process.env.SENDGRID_API_KEY?.trim();
  if (!key?.startsWith('SG.')) return null;
  const fromEmail = (process.env.SENDGRID_FROM_EMAIL || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || '').trim();
  const fromName = process.env.SENDGRID_FROM_NAME?.trim() || 'AlbNet';
  if (!fromEmail) return { ok: false, error: 'SENDGRID_FROM_EMAIL mungon në Vercel.' };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `SendGrid ${res.status}: ${body.slice(0, 220)}` };
  }
  return { ok: true, provider: 'sendgrid' };
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-email-proxy-secret')?.trim();
  const expected = process.env.EMAIL_PROXY_SECRET?.trim() || 'albnet_email_proxy_2026_x7k9';
  if (!secret || secret !== expected) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: SendBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const html = body.html?.trim();
  if (!to || !to.includes('@') || !subject || !html) {
    return Response.json({ ok: false, error: 'to, subject, html required' }, { status: 400 });
  }

  const brevoKey = (body.brevoKey || process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (body.senderEmail || process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || '').trim();
  const senderName = (body.senderName || process.env.BREVO_SENDER_NAME || 'AlbNet').trim();
  const payload = { to, subject, html };

  if (brevoKey) {
    const brevoResult = await sendViaBrevo(payload, { apiKey: brevoKey, senderEmail, senderName });
    if (brevoResult.ok) return Response.json(brevoResult);
    if (brevoResult.error) {
      const sgResult = await sendViaSendGrid(payload);
      if (sgResult?.ok) return Response.json(sgResult);
      return Response.json({ ok: false, error: brevoResult.error }, { status: 502 });
    }
  }

  const primary = (process.env.EMAIL_PRIMARY || 'brevo').toLowerCase();
  const order = primary === 'sendgrid' ? ['sendgrid', 'brevo'] : ['brevo', 'sendgrid'];
  let lastError = 'Asnjë provider nuk është konfiguruar në Vercel.';

  for (const step of order) {
    const result =
      step === 'sendgrid'
        ? await sendViaSendGrid(payload)
        : await sendViaBrevo(payload, { apiKey: brevoKey, senderEmail, senderName });
    if (!result) continue;
    if (result.ok) return Response.json(result);
    lastError = result.error || lastError;
  }

  return Response.json({ ok: false, error: lastError }, { status: 502 });
}
