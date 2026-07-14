/**
 * Teston Google Apps Script email web app.
 *
 *   node backend/scripts/test-google-apps-script.js
 *   node backend/scripts/test-google-apps-script.js email@example.com
 */
import '../env.js';

const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim();
const to = process.argv[2]?.trim() || process.env.SMTP_USER?.trim();

if (!url?.includes('script.google.com')) {
  console.error('❌ GOOGLE_APPS_SCRIPT_URL mungon në backend/.env');
  console.error('   Deploy Apps Script → kopjo URL /exec nga Deploy');
  process.exit(1);
}
if (!secret) {
  console.error('❌ GOOGLE_APPS_SCRIPT_SECRET mungon në backend/.env');
  process.exit(1);
}
if (!to?.includes('@')) {
  console.error('Përdorimi: node backend/scripts/test-google-apps-script.js email@example.com');
  process.exit(1);
}

function parseGasBody(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Përgjigje jo-JSON nga Apps Script');
  }
}

console.log('URL:', url);
console.log('Ping...');
const pingRes = await fetch(`${url}?secret=${encodeURIComponent(secret)}`, { redirect: 'follow' });
const ping = parseGasBody(await pingRes.text());
console.log('Ping:', ping);
if (!ping.ok) process.exit(1);

console.log(`\nDuke dërguar test te ${to}...`);
const sendRes = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret,
    to,
    subject: '🧪 Test AlbNet – Google Apps Script',
    html: '<p>Ky email vjen nga <strong>AlbNet</strong> përmes Google Apps Script (Gmail).</p>',
  }),
  redirect: 'follow',
});
const result = parseGasBody(await sendRes.text());
console.log('Rezultati:', result);
process.exit(result.ok ? 0 : 1);
