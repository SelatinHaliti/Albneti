/**
 * Vendos variabla email në Vercel (albneti frontend) përmes Vercel CLI.
 *
 * Kërkon: npm i -g vercel && vercel login
 * Pastaj: node backend/scripts/push-vercel-env.js
 */
import '../env.js';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '../../frontend');

const PROXY_SECRET = process.env.EMAIL_PROXY_SECRET || 'albnet_email_proxy_2026_x7k9';

const VARS = {
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'AlbNet',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER,
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'AlbNet',
  EMAIL_PROXY_SECRET: PROXY_SECRET,
  EMAIL_PRIMARY: 'brevo',
};

function setVercelEnv(key, value, env = 'production') {
  if (!value) {
    console.log(`SKIP ${key}`);
    return false;
  }
  try {
    execSync(`npx vercel env rm ${key} ${env} --yes`, { cwd: frontendDir, stdio: 'pipe' });
  } catch {
    /* nuk ekziston */
  }
  execSync(`npx vercel env add ${key} ${env}`, {
    cwd: frontendDir,
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  console.log(`OK   ${key} (${env})`);
  return true;
}

async function main() {
  let ok = 0;
  for (const [key, value] of Object.entries(VARS)) {
    if (setVercelEnv(key, value)) ok++;
  }
  console.log(`\n${ok} variabla u vendosën në Vercel production.`);
  console.log('Rindeploy: npx vercel --prod (nga frontend/) ose push në main.');
  console.log(`\nVendos në Render: EMAIL_PROXY_URL=https://albneti.vercel.app/api/internal/send-email`);
  console.log(`Vendos në Render: EMAIL_PROXY_SECRET=${PROXY_SECRET}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
