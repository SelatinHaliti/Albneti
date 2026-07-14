/**
 * Nis blast te aktivët duke thirrur API-n e production (pa MongoDB lokal).
 * Përdor kredencialet admin nga .env: ADMIN_EMAIL, ADMIN_PASSWORD
 *
 *   node backend/scripts/trigger-production-blast.js
 */
import '../env.js';

const API = (process.env.FRONTEND_URL || 'https://albneti.vercel.app').replace('albneti.vercel.app', 'albneti-api.onrender.com').replace(/\/$/, '');
const apiBase = API.includes('onrender') ? API : 'https://albneti-api.onrender.com';

async function login() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!email || !password) {
    console.error('❌ Vendos ADMIN_EMAIL dhe ADMIN_PASSWORD në backend/.env');
    process.exit(1);
  }
  const res = await fetch(`${apiBase}/api/auth/kycu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  const token = data.token || data.accessToken;
  if (!token) {
    console.error('❌ Login dështoi:', data.message || res.status);
    process.exit(1);
  }
  return token;
}

async function poll(token, runKey) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`${apiBase}/api/marketing/admin/blast-status?runKey=${encodeURIComponent(runKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const s = await res.json().catch(() => ({}));
    console.log(`[${i + 1}] ${s.status} | dërguar: ${s.sent ?? 0} | dështuar: ${s.failed ?? 0}`);
    if (s.status !== 'running') {
      console.log(s.sent > 0 ? `✅ Përfundoi: ${s.sent} email` : `❌ ${s.error || 'Asnjë email'}`);
      return;
    }
  }
}

const token = await login();
console.log('📧 Duke nisur blast te përdoruesit aktivë në production...');

const res = await fetch(`${apiBase}/api/marketing/admin/send-active`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: '{}',
});
const data = await res.json().catch(() => ({}));
console.log(JSON.stringify(data, null, 2));

if (data.runKey) await poll(token, data.runKey);
