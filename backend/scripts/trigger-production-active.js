/**
 * Nis blast te përdoruesit aktivë në production përmes cron secret.
 * Vendos CRON_SECRET në backend/.env (i njëjti si në Render)
 *
 *   node backend/scripts/trigger-production-active.js
 */
import '../env.js';

const API = 'https://albneti-api.onrender.com';
const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error('❌ CRON_SECRET mungon në backend/.env');
  process.exit(1);
}

const headers = { 'x-cron-secret': secret, 'Content-Type': 'application/json' };

console.log('📧 Duke nisur marketing te përdoruesit AKTIVË në production...');

const startRes = await fetch(`${API}/api/marketing/cron/send-active`, { method: 'POST', headers });
const start = await startRes.json().catch(() => ({}));
console.log(JSON.stringify(start, null, 2));

if (!startRes.ok) {
  process.exit(1);
}

if (start.alreadyRunning && start.runKey) {
  console.log('Vazhdon dërgimi ekzistues...');
}

const runKey = start.runKey;
if (!runKey) process.exit(start.ok ? 0 : 1);

for (let i = 0; i < 180; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const res = await fetch(`${API}/api/marketing/cron/blast-status?runKey=${encodeURIComponent(runKey)}`, { headers });
  const s = await res.json().catch(() => ({}));
  console.log(`[${i + 1}] ${s.status} | dërguar: ${s.sent ?? 0} | dështuar: ${s.failed ?? 0} | anashkaluar: ${s.skipped ?? 0}`);
  if (s.status && s.status !== 'running') {
    if (s.error) console.error('Gabim:', s.error);
    console.log(s.sent > 0 ? `\n✅ Përfundoi: ${s.sent} email u dërguan` : `\n❌ Dështoi: ${s.error || '0 dërguar'}`);
    process.exit(s.sent > 0 ? 0 : 1);
  }
}

console.log('⏳ Blast ende në proces. Kontrollo Admin → Marketing.');
