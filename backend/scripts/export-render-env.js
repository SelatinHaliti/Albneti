/**
 * Gjeneron skedar për import në Render Dashboard → Environment → Add from .env
 * node backend/scripts/export-render-env.js
 * Output: scripts/render-env-to-add.env (MOS e commit në git)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import '../env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'STRIPE_SECRET_KEY',
  'FRONTEND_URL',
  'AI_MARKETING_USE_SMART_ONLY',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
];

const lines = [
  '# Kopjo në Render: albneti-api → Environment → Add from .env',
  '# URL: https://dashboard.render.com/web/srv-d672kvvpm1nc739uuhjg/env',
  '# MOS e commit këtë skedar në git',
  '',
];

for (const key of KEYS) {
  let value = process.env[key]?.trim();
  if (!value) continue;
  if (key === 'SMTP_PASS') value = value.replace(/\s+/g, '');
  if (key === 'FRONTEND_URL' && !value) value = 'https://albneti.vercel.app';
  lines.push(`${key}=${value}`);
}

if (!process.env.FRONTEND_URL) {
  lines.push('FRONTEND_URL=https://albneti.vercel.app');
}

const out = path.join(root, 'scripts', 'render-env-to-add.env');
fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
console.log(`✅ U shkrua: ${out}`);
console.log(`   ${lines.filter((l) => l.includes('=')).length} variabla`);
