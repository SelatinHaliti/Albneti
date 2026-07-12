/**
 * Test SMTP + dërgo AlbNet Ads (1 email test ose të gjithë aktivët).
 * Përdorimi:
 *   node scripts/send-marketing-now.js --test selatinhaliti6@gmail.com
 *   node scripts/send-marketing-now.js --all        # të gjithë me email
 *   node scripts/send-marketing-now.js --active     # vetëm aktivët (60 ditë)
 * Kërkon MONGODB_URI + JWT_SECRET në backend/.env për --all
 */
import '../env.js';
import mongoose from 'mongoose';
import { isSmtpConfigured, sendAlbnetAdsEmail } from '../utils/email.js';
import { runWeeklyMarketingEmails, sendMarketingTestEmail, startAIMarketingBlast } from '../services/marketingEmailService.js';

const args = process.argv.slice(2);
const isTest = args.includes('--test');
const testEmail = isTest ? args[args.indexOf('--test') + 1] : null;
const sendAll = args.includes('--all');
const sendActive = args.includes('--active');

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

  if (sendActive || sendAll) {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      console.error('❌ MONGODB_URI mungon në backend/.env – kopjoje nga Render Dashboard.');
      process.exit(1);
    }
    await mongoose.connect(uri);
    if (sendActive) {
      console.log('📧 Duke dërguar AlbNet Ads te përdoruesit AKTIVË (60 ditë, force)...');
      const result = await runWeeklyMarketingEmails({ force: true, triggeredBy: 'manual' });
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('📧 Duke nisur AI blast te të gjithë me email...');
      const result = await startAIMarketingBlast({ triggeredBy: 'manual' });
      console.log(JSON.stringify(result, null, 2));
      if (result.started && result.runKey) {
        console.log('⏳ Blast në background. Kontrollo statusin në admin ose prisni...');
        await new Promise((r) => setTimeout(r, 15000));
        const MarketingRun = (await import('../models/MarketingRun.js')).default;
        const run = await MarketingRun.findOne({ weekKey: result.runKey }).lean();
        console.log('Status:', run?.status, '| Dërguar:', run?.sentCount, '| Dështuar:', run?.failedCount);
      }
    }
    await mongoose.disconnect();
    return;
  }

  console.log('Përdorimi:');
  console.log('  node scripts/send-marketing-now.js --test email@example.com');
  console.log('  node scripts/send-marketing-now.js --active   # aktivët 60 ditë');
  console.log('  node scripts/send-marketing-now.js --all      # të gjithë me email');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
