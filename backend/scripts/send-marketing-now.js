/**
 * Test SMTP + dërgo AlbNet Ads (1 email test ose të gjithë aktivët).
 * Përdorimi:
 *   node scripts/send-marketing-now.js --test selatinhaliti6@gmail.com
 *   node scripts/send-marketing-now.js --all
 * Kërkon MONGODB_URI + JWT_SECRET në backend/.env për --all
 */
import '../env.js';
import mongoose from 'mongoose';
import { isSmtpConfigured, sendAlbnetAdsEmail } from '../utils/email.js';
import { runWeeklyMarketingEmails, sendMarketingTestEmail } from '../services/marketingEmailService.js';

const args = process.argv.slice(2);
const isTest = args.includes('--test');
const testEmail = isTest ? args[args.indexOf('--test') + 1] : null;
const sendAll = args.includes('--all');

async function main() {
  if (!isSmtpConfigured()) {
    console.error('❌ SMTP nuk është konfiguruar. Vendos SMTP_* në backend/.env');
    process.exit(1);
  }

  if (isTest && testEmail) {
    const result = await sendMarketingTestEmail(testEmail);
    if (result.ok) {
      console.log(`✅ ${result.message}`);
    } else {
      console.error('❌ Dështoi:', result.error);
      process.exit(1);
    }
    return;
  }

  if (sendAll) {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      console.error('❌ MONGODB_URI mungon në backend/.env – kopjoje nga Render Dashboard.');
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('📧 Duke dërguar AlbNet Ads te përdoruesit aktivë (force)...');
    const result = await runWeeklyMarketingEmails({ force: true, triggeredBy: 'manual' });
    console.log(JSON.stringify(result, null, 2));
    await mongoose.disconnect();
    return;
  }

  console.log('Përdorimi:');
  console.log('  node scripts/send-marketing-now.js --test email@example.com');
  console.log('  node scripts/send-marketing-now.js --all');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
