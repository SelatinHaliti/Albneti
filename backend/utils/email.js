import nodemailer from 'nodemailer';

/**
 * Transport për dërgim emailesh (konfigurohet me .env)
 * Nëse SMTP_HOST është shembull (example.com) ose mungon, nuk krijohet transport.
 */
const createTransporter = () => {
  const host = (process.env.SMTP_HOST || '').trim().toLowerCase();
  if (!host || host.includes('example')) return null;
  const user = (process.env.SMTP_USER || '').trim();
  // Gmail App Password shpesh kopjohet me hapësira (p.sh. "abcd efgh ijkl mnop")
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!user || !pass) return null;

  const isGmail = host === 'smtp.gmail.com' || user.endsWith('@gmail.com');
  if (isGmail) {
    return nodemailer.createTransport({
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4,
      auth: { user, pass },
      connectionTimeout: 120000,
      greetingTimeout: 60000,
      socketTimeout: 120000,
      tls: { minVersion: 'TLSv1.2' },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: process.env.SMTP_SECURE !== 'true',
    auth: { user, pass },
    tls: { servername: host },
  });
};

export const isSmtpConfigured = () => Boolean(getTransporter());

let resendSessionBlocked = false;

export function isResendFromVerifiedDomain() {
  const from = process.env.RESEND_FROM?.trim() || 'AlbNet <onboarding@resend.dev>';
  return Boolean(process.env.RESEND_API_KEY?.trim().startsWith('re_')) && !/@resend\.dev/i.test(from);
}

function isResendDomainRestrictionError(result) {
  const err = result?.error || '';
  return /Resend 403/i.test(err) && /verify a domain|only send testing emails/i.test(err);
}

function shouldTryResend() {
  if (!process.env.RESEND_API_KEY?.trim().startsWith('re_')) return false;
  if (resendSessionBlocked) return false;
  return isResendFromVerifiedDomain();
}

export function getEmailDeliveryInfo() {
  const hasResendKey = Boolean(process.env.RESEND_API_KEY?.trim().startsWith('re_'));
  const hasSmtp = isSmtpConfigured();
  const resendNeedsDomain = hasResendKey && !isResendFromVerifiedDomain();
  let provider = null;
  if (shouldTryResend()) provider = 'resend';
  else if (hasSmtp) provider = 'smtp';
  else if (hasResendKey) provider = 'resend';

  return {
    provider,
    resendNeedsDomain,
    resendConfigured: hasResendKey,
    smtpConfigured: hasSmtp,
    deliveryNote: resendNeedsDomain
      ? 'Resend onboarding@resend.dev dërgon vetëm te llogaria Resend. Blast përdor Gmail SMTP derisa të verifikosh domain.'
      : null,
  };
}

export function getEmailProvider() {
  return getEmailDeliveryInfo().provider;
}

export const isEmailConfigured = () => {
  const { smtpConfigured, resendConfigured } = getEmailDeliveryInfo();
  return smtpConfigured || (resendConfigured && isResendFromVerifiedDomain());
};

/** Singleton – mos krijo transport të ri për çdo email */
let cachedTransporter = null;
let verifyPromise = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = createTransporter();
  return cachedTransporter;
}

export function resetSmtpTransporter() {
  if (cachedTransporter?.close) {
    try { cachedTransporter.close(); } catch { /* ignore */ }
  }
  cachedTransporter = null;
  verifyPromise = null;
  smtpVerifyCache = null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableSmtpError(err) {
  const msg = normalizeMailerError(err);
  return /timeout|ETIMEDOUT|ECONNECTION|ECONNRESET|ENOTFOUND|socket/i.test(msg);
}

/** Verifikon SMTP një herë (për test/diagnostikë) */
let smtpVerifyCache = null;
const SMTP_VERIFY_CACHE_MS = 5 * 60 * 1000;

export async function verifySmtpConnection({ timeoutMs = 45000, useCache = true } = {}) {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: 'SMTP nuk është konfiguruar.' };

  if (useCache && smtpVerifyCache && Date.now() - smtpVerifyCache.at < SMTP_VERIFY_CACHE_MS) {
    return smtpVerifyCache.result;
  }

  try {
    const verifyTask = (async () => {
      if (!verifyPromise) {
        verifyPromise = transporter.verify().finally(() => { verifyPromise = null; });
      }
      await verifyPromise;
      return { ok: true };
    })();

    const timeoutTask = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SMTP verify timeout')), timeoutMs);
    });

    const result = await Promise.race([verifyTask, timeoutTask]);
    smtpVerifyCache = { at: Date.now(), result };
    return result;
  } catch (err) {
    const result = { ok: false, error: normalizeMailerError(err) };
    smtpVerifyCache = { at: Date.now(), result };
    return result;
  }
}

async function sendViaResend({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key?.startsWith('re_')) return null;
  const fromAddr = process.env.RESEND_FROM?.trim() || 'AlbNet <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddr, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true, provider: 'resend' };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

function normalizeMailerError(err) {
  if (!err) return 'Gabim i panjohur.';
  if (typeof err === 'string') return err;
  const e = err;
  const code = e?.code ? String(e.code) : '';
  const response = e?.response ? String(e.response) : '';
  const message = e?.message ? String(e.message) : '';
  if (code === 'EAUTH' || /BadCredentials/i.test(response + message)) {
    return 'Gmail refuzoi fjalëkalimin. Aktivizo 2FA dhe krijo App Password të ri nga myaccount.google.com/apppasswords, pastaj përditëso SMTP_PASS në .env dhe Render.';
  }
  if (/timeout/i.test(message)) {
    return 'Lidhja me Gmail vonoi. Provo përsëri ose vendos RESEND_API_KEY për dërgim më të shpejtë.';
  }
  const parts = [code, message, response].filter(Boolean);
  return parts.length ? parts.join(' | ') : 'Gabim i panjohur.';
}

async function sendMail({ to, subject, html }) {
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const from =
    process.env.SMTP_FROM ||
    (smtpUser ? `AlbNet <${smtpUser}>` : 'AlbNet <noreply@albnet.com>');

  let resendResult = null;
  if (shouldTryResend()) {
    resendResult = await sendViaResend({ to, subject, html });
    if (resendResult?.ok) return resendResult;
    if (isResendDomainRestrictionError(resendResult)) resendSessionBlocked = true;
  }

  const canUseSmtp =
    isSmtpConfigured() &&
    (!process.env.RESEND_API_KEY?.trim().startsWith('re_') ||
      process.env.EMAIL_USE_SMTP_FALLBACK === 'true' ||
      !shouldTryResend() ||
      isResendDomainRestrictionError(resendResult) ||
      resendSessionBlocked);

  if (!canUseSmtp) {
    return resendResult || { ok: false, error: 'Resend nuk u përgjigj.' };
  }

  const mailOptions = { from, to, subject, html };
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const transporter = getTransporter();
    if (!transporter) {
      return resendResult || { ok: false, error: 'SMTP nuk është konfiguruar në server.' };
    }
    try {
      const sendTask = transporter.sendMail(mailOptions);
      const timeoutTask = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('send timeout')), 60000);
      });
      await Promise.race([sendTask, timeoutTask]);
      return { ok: true, provider: 'smtp' };
    } catch (err) {
      const error = normalizeMailerError(err);
      if (attempt < maxAttempts && isRetryableSmtpError(err)) {
        resetSmtpTransporter();
        await sleep(2000 * attempt);
        continue;
      }
      return { ok: false, error };
    }
  }
  return { ok: false, error: 'Dërgimi i email-it dështoi pas disa përpjekjeve.' };
}

/* Brand colors – përputhen me app (primary #0095f6, theks i kuq) */
const BRAND = {
  primary: '#0095f6',
  primaryDark: '#0077cc',
  red: '#c41e3a',
  text: '#262626',
  textMuted: '#8e8e8e',
  border: '#dbdbdb',
  bg: '#fafafa',
  white: '#ffffff',
};

/**
 * Template bazë HTML për emailet – layout me tabela për kompatibilitet me klientët email.
 * content: HTML i brendshëm (mesazhi, butoni, etj.)
 */
function baseEmailTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AlbNet</title>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color:${BRAND.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid ${BRAND.border};">
          <!-- Header (ngjyrë e ngurtë për kompatibilitet me klientët email) -->
          <tr>
            <td style="background-color: ${BRAND.primary}; padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 28px; font-weight: 700; color: ${BRAND.white}; letter-spacing: -0.5px;">AlbNet</span>
                    <div style="height: 4px; width: 48px; background: ${BRAND.red}; border-radius: 2px; margin: 12px auto 0;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 36px; color: ${BRAND.text}; font-size: 15px; line-height: 1.6;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; border-top: 1px solid ${BRAND.border}; text-align: center; font-size: 12px; color: ${BRAND.textMuted};">
              Ky email u dërgua nga AlbNet. Nëse nuk e kërkovët ju, mund ta injoroni.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Buton CTA i stilizuar (inline styles për email)
 */
function ctaButton(href, label) {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
    <tr>
      <td align="center">
        <a href="${href}" target="_blank" rel="noopener" style="display: inline-block; background: ${BRAND.primary}; color: ${BRAND.white}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,149,246,0.35);">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * Dërgon email verifikimi – dizajn i plotë
 */
export const sendVerificationEmail = async (email, token, username) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verifiko?token=${token}`;

  const content = `
    <p style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: ${BRAND.text};">
      Mirë se vini në AlbNet! 🎉
    </p>
    <p style="margin: 0 0 16px; color: ${BRAND.textMuted}; font-size: 14px;">
      Përshëndetje <strong style="color: ${BRAND.text};">${username}</strong>,
    </p>
    <p style="margin: 0 0 8px; color: ${BRAND.text};">
      Ju keni krijuar një llogari. Klikoni butonin më poshtë për të <strong>verifikuar adresën tuaj të emailit</strong> dhe për të aktivizuar llogarinë.
    </p>
    ${ctaButton(url, 'Verifiko llogarinë')}
    <p style="margin: 20px 0 0; font-size: 13px; color: ${BRAND.textMuted};">
      ⏱ Linku është i vlefshëm <strong>24 orë</strong>. Pas kësaj kohe do të duhet të kërkonit një email të ri verifikimi.
    </p>
    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND.textMuted};">
      Nëse butoni nuk funksionon, kopjoni dhe ngjiteni këtë link në shfletues:<br>
      <a href="${url}" style="color: ${BRAND.primary}; word-break: break-all;">${url}</a>
    </p>
  `;

  const result = await sendMail({
    to: email,
    subject: 'Verifiko llogarinë tënde – AlbNet',
    html: baseEmailTemplate(content),
  });
  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.error('Gabim dërgim email verifikimi:', result.error);
  }
  return result;
};

/**
 * Dërgon email për reset të fjalëkalimit – i njëjti dizajn
 */
export const sendPasswordResetEmail = async (email, token, username) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/rifresko-fjalekalimin?token=${token}`;

  const content = `
    <p style="margin: 0 0 8px; font-size: 22px; font-weight: 600; color: ${BRAND.text};">
      Ndrysho fjalëkalimin 🔐
    </p>
    <p style="margin: 0 0 16px; color: ${BRAND.textMuted}; font-size: 14px;">
      Përshëndetje <strong style="color: ${BRAND.text};">${username}</strong>,
    </p>
    <p style="margin: 0 0 8px; color: ${BRAND.text};">
      Kemi marrë një kërkesë për të rifreskuar fjalëkalimin e llogarisë tuaj. Klikoni butonin më poshtë për të <strong>vendosur një fjalëkalim të ri</strong>.
    </p>
    ${ctaButton(url, 'Vendo fjalëkalimin e ri')}
    <p style="margin: 20px 0 0; font-size: 13px; color: ${BRAND.textMuted};">
      ⏱ Linku skadon pas <strong>1 ore</strong>. Pas kësaj do të duhet të filloni përsëri procesin "Harruat fjalëkalimin?".
    </p>
    <p style="margin: 16px 0 0; font-size: 13px; color: ${BRAND.textMuted};">
      Nëse nuk e kërkovët ju këtë ndryshim, mund ta injoroni këtë email – fjalëkalimi juaj nuk do të ndryshojë.
    </p>
    <p style="margin: 12px 0 0; font-size: 13px; color: ${BRAND.textMuted};">
      Link i drejtpërdrejtë:<br>
      <a href="${url}" style="color: ${BRAND.primary}; word-break: break-all;">${url}</a>
    </p>
  `;

  const result = await sendMail({
    to: email,
    subject: 'Rifreskimi i fjalëkalimit – AlbNet',
    html: baseEmailTemplate(content),
  });
  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.error('Gabim dërgim email reset fjalëkalimi:', result.error);
  }
  return result;
};

/**
 * AlbNet Ads – email marketing javor me dizajn profesional
 */
export async function sendAlbnetAdsEmail({
  to,
  username,
  fullName,
  theme,
  highlights,
  baseUrl,
  unsubscribeToken,
}) {
  const name = fullName || username;
  const unsubUrl = `${baseUrl}/marketing/clahu?token=${encodeURIComponent(unsubscribeToken)}`;

  const featureCards = (theme.features || [])
    .map(
      (f) => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background: ${BRAND.bg}; border-radius: 12px; border: 1px solid ${BRAND.border}; overflow: hidden;">
      <tr>
        <td style="padding: 18px 20px;">
          <p style="margin: 0 0 6px; font-size: 18px; font-weight: 700; color: ${BRAND.text};">${f.emoji} ${f.title}</p>
          <p style="margin: 0 0 12px; font-size: 14px; color: ${BRAND.textMuted}; line-height: 1.5;">${f.desc}</p>
          <a href="${baseUrl}${f.path}" style="font-size: 13px; font-weight: 600; color: ${BRAND.primary}; text-decoration: none;">${f.cta} →</a>
        </td>
      </tr>
    </table>`
    )
    .join('');

  let highlightBlock = '';
  if (highlights?.trendingPost) {
    const p = highlights.trendingPost;
    highlightBlock += `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-radius: 12px; border: 1px solid ${BRAND.border}; overflow: hidden;">
      <tr>
        <td style="padding: 16px 18px; background: ${BRAND.bg};">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: ${BRAND.primary}; text-transform: uppercase;">🔥 Trending këtë javë</p>
          <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: ${BRAND.text};">@${p.user?.username || 'krijues'}</p>
          <p style="margin: 0; font-size: 13px; color: ${BRAND.textMuted};">${(p.caption || '').slice(0, 100)}${p.caption?.length > 100 ? '…' : ''}</p>
        </td>
      </tr>
    </table>`;
  }
  if (highlights?.upcomingEvent) {
    const e = highlights.upcomingEvent;
    highlightBlock += `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 12px 0 20px; padding: 16px 18px; background: #fafafa; border-radius: 12px; border: 1px solid ${BRAND.border};">
      <tr><td>
        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; color: ${BRAND.red};">🇦🇱 Event i afërt</p>
        <p style="margin: 0 0 4px; font-size: 16px; font-weight: 700; color: ${BRAND.text};">${e.emoji || '📅'} ${e.title}</p>
        <p style="margin: 0; font-size: 13px; color: ${BRAND.textMuted};">${e.shortDate || ''} · ${e.location || e.city || ''}</p>
      </td></tr>
    </table>`;
  }

  const statsLine = highlights
    ? `<p style="margin: 16px 0 0; padding: 12px 16px; background: ${BRAND.bg}; border-radius: 10px; font-size: 13px; color: ${BRAND.textMuted}; text-align: center;">
        <strong style="color: ${BRAND.text};">${highlights.activeUsers || 0}</strong> përdorues aktiv këtë javë
        ${highlights.activeLives ? ` · <strong style="color: ${BRAND.red};">${highlights.activeLives}</strong> live tani` : ''}
      </p>`
    : '';

  const urgencyBanner = theme.urgencyLine
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px; background: linear-gradient(135deg, ${BRAND.primary}15, ${BRAND.red}15); border-radius: 12px; border: 1px solid ${BRAND.primary}40;">
      <tr><td style="padding: 14px 18px; text-align: center;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: ${BRAND.text};">${theme.urgencyLine}</p>
      </td></tr>
    </table>`
    : '';

  const heroEmoji = theme.heroEmoji || '🇦🇱';

  const content = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark}); border-radius: 16px;">
      <tr><td style="padding: 28px 24px; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 36px;">${heroEmoji}</p>
        <p style="margin: 0; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.85); letter-spacing: 1px; text-transform: uppercase;">ALBNET ADS · AI Marketing</p>
      </td></tr>
    </table>
    <p style="margin: 0 0 12px; font-size: 26px; font-weight: 700; color: ${BRAND.text}; line-height: 1.25;">${theme.headline}</p>
    <p style="margin: 0 0 8px; color: ${BRAND.textMuted}; font-size: 14px;">Përshëndetje <strong style="color: ${BRAND.text};">${name}</strong>,</p>
    <p style="margin: 0 0 20px; color: ${BRAND.text}; font-size: 15px; line-height: 1.65;">${theme.intro}</p>
    ${urgencyBanner}
    ${statsLine}
    ${highlightBlock}
    ${featureCards}
    ${ctaButton(`${baseUrl}/feed`, 'Hap AlbNet tani')}
    <p style="margin: 24px 0 0; font-size: 12px; color: ${BRAND.textMuted}; text-align: center; line-height: 1.6;">
      Marr këtë email sepse je përdorues i AlbNet.<br>
      <a href="${unsubUrl}" style="color: ${BRAND.textMuted}; text-decoration: underline;">Çabonohu nga emailet marketing</a>
      · <a href="${baseUrl}/profili/redakto" style="color: ${BRAND.textMuted}; text-decoration: underline;">Cilësimet</a>
    </p>
  `;

  return sendMail({
    to,
    subject: theme.subject,
    html: baseEmailTemplate(content),
  });
}
