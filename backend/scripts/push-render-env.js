/**
 * Vendos variabla në Render (albneti-api) pa fshirë MONGODB_URI / JWT_SECRET.
 *
 * Shto në backend/.env:
 *   RENDER_API_KEY=rnd_...
 *
 * Pastaj:
 *   node backend/scripts/push-render-env.js
 */
import '../env.js';

const SERVICE_ID = 'srv-d672kvvpm1nc739uuhjg';
const API = 'https://api.render.com/v1';

const KEYS = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  SMTP_FROM: process.env.SMTP_FROM || (process.env.SMTP_USER ? `AlbNet <${process.env.SMTP_USER}>` : ''),
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM || (process.env.SMTP_USER ? `AlbNet <${process.env.SMTP_USER}>` : ''),
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'AlbNet',
  EMAIL_SMTP_ALLOWED: process.env.EMAIL_SMTP_ALLOWED || 'true',
  GOOGLE_APPS_SCRIPT_URL: process.env.GOOGLE_APPS_SCRIPT_URL,
  GOOGLE_APPS_SCRIPT_SECRET: process.env.GOOGLE_APPS_SCRIPT_SECRET || 'albnet_gas_email_2026_k8m2',
  EMAIL_PRIMARY: process.env.GOOGLE_APPS_SCRIPT_URL ? 'gas' : 'proxy',
  EMAIL_PROXY_URL: process.env.EMAIL_PROXY_URL || 'https://albneti.vercel.app/api/internal/send-email',
  EMAIL_PROXY_SECRET: process.env.EMAIL_PROXY_SECRET || 'albnet_email_proxy_2026_x7k9',
  EMAIL_SKIP_BREVO: 'false',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER,
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'AlbNet',
  SMTP_USE_ALT_PORT: 'false',
  SMTP_POOL: 'false',
  CRON_SECRET: process.env.CRON_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://albneti.vercel.app',
  AI_MARKETING_USE_SMART_ONLY: 'true',
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:support@albneti.vercel.app',
};

async function main() {
  const apiKey = (process.argv[2] || process.env.RENDER_API_KEY || '').trim();
  if (!apiKey?.startsWith('rnd_')) {
    console.error('❌ API key mungon ose është i pavlefshëm (duhet rnd_...)');
    console.error('   Përdorimi: node backend/scripts/push-render-env.js rnd_...');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  let ok = 0;
  let skip = 0;
  for (const [key, value] of Object.entries(KEYS)) {
    if (!value) {
      console.log(`SKIP ${key} (mungon lokalisht)`);
      skip++;
      continue;
    }
    const res = await fetch(`${API}/services/${SERVICE_ID}/env-vars/${key}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`FAIL ${key}: ${res.status} ${text.slice(0, 120)}`);
      continue;
    }
    console.log(`OK   ${key}`);
    ok++;
  }

  console.log(`\n${ok} variabla u vendosën, ${skip} u anashkaluan.`);

  const deploy = await fetch(`${API}/services/${SERVICE_ID}/deploys`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  if (deploy.ok) {
    console.log('✅ Redeploy u nis. Prit 2-3 minuta.');
  } else {
    console.log('⚠️ Bëj Manual Deploy në Render dashboard.');
  }

  console.log('\nKontrollo: https://albneti-api.onrender.com/api/health');
  console.log('Duhet: smtpConfigured true, stripeConfigured true');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
