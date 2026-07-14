/**
 * Nis marketing te përdoruesit aktivë në production (Render).
 * Kërkon: MONGODB_URI + JWT_SECRET në backend/.env (kopjo nga Render Dashboard)
 *
 *   node backend/scripts/run-active-blast.js
 */
import '../env.js';
import mongoose from 'mongoose';
import { startActiveMarketingSend, getBlastStatus } from '../services/marketingEmailService.js';
import { getBlastDeliveryInfo } from '../utils/email.js';

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error('❌ MONGODB_URI mungon në backend/.env – kopjoje nga Render Dashboard → Environment');
  process.exit(1);
}

const blast = getBlastDeliveryInfo();
console.log('Provider:', blast.blastVia, '| blastReady:', blast.blastReady);
if (!blast.blastReady) {
  console.error('❌ Email nuk është gati. Vendos BREVO_API_KEY në Render.');
  process.exit(1);
}

await mongoose.connect(uri);
console.log('📧 Duke nisur blast te përdoruesit AKTIVË (60 ditë)...');

const result = await startActiveMarketingSend({ triggeredBy: 'cli-active' });
console.log(JSON.stringify(result, null, 2));

if (!result.ok || !result.runKey) {
  await mongoose.disconnect();
  process.exit(result.ok ? 0 : 1);
}

const runKey = result.runKey;
for (let i = 0; i < 120; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const status = await getBlastStatus(runKey);
  console.log(`[${i + 1}] status=${status.status} sent=${status.sent} failed=${status.failed} skipped=${status.skipped}`);
  if (status.status !== 'running') {
    if (status.error) console.error('Error:', status.error);
    console.log(status.sent > 0 ? `✅ Përfundoi: ${status.sent} dërguar` : `❌ Dështoi: ${status.error || '0 dërguar'}`);
    break;
  }
}

await mongoose.disconnect();
