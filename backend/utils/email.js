import nodemailer from 'nodemailer';

/**
 * Transport për dërgim emailesh (konfigurohet me .env)
 * Nëse SMTP_HOST është shembull (example.com) ose mungon, nuk krijohet transport.
 */
const createTransporter = () => {
  const host = (process.env.SMTP_HOST || '').trim().toLowerCase();
  if (!host || host.includes('example')) return null;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

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
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('SMTP nuk është konfiguruar - verifikimi me email nuk dërgohet.');
    return;
  }
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

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'AlbNet <noreply@albnet.com>',
      to: email,
      subject: 'Verifiko llogarinë tënde – AlbNet',
      html: baseEmailTemplate(content),
    });
  } catch (err) {
    console.error('Gabim dërgim email verifikimi:', err.message);
  }
};

/**
 * Dërgon email për reset të fjalëkalimit – i njëjti dizajn
 */
export const sendPasswordResetEmail = async (email, token, username) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('SMTP nuk është konfiguruar.');
    return;
  }
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

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'AlbNet <noreply@albnet.com>',
      to: email,
      subject: 'Rifreskimi i fjalëkalimit – AlbNet',
      html: baseEmailTemplate(content),
    });
  } catch (err) {
    console.error('Gabim dërgim email reset fjalëkalimi:', err.message);
  }
};
