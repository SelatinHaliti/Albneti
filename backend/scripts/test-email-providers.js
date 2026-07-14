/**
 * Teston dërgimin e email-it përmes providerëve të konfiguruar.
 * node backend/scripts/test-email-providers.js email@example.com
 */
import '../env.js';
import { getBlastDeliveryInfo, refreshResendDomainStatus, sendAlbnetAdsEmail } from '../utils/email.js';

const to = process.argv[2]?.trim();
if (!to || !to.includes('@')) {
  console.error('Përdorimi: node backend/scripts/test-email-providers.js email@example.com');
  process.exit(1);
}

const blast = getBlastDeliveryInfo();
console.log('blastReady:', blast.blastReady);
console.log('blastVia:', blast.blastVia);
console.log('brevoConfigured:', blast.brevoConfigured);
console.log('resendConfigured:', blast.resendConfigured);
console.log('smtpBlockedOnHost:', blast.smtpBlockedOnHost);
if (blast.deliveryNote) console.log('note:', blast.deliveryNote);

const resend = await refreshResendDomainStatus();
console.log('resendFrom:', resend.from);
console.log('resendVerified:', resend.verified);

if (!blast.blastReady) {
  console.error('\n❌ Email blast NUK është gati. Vendos SMTP_PASS në Render ose verifiko Resend domain.');
  process.exit(1);
}

const result = await sendAlbnetAdsEmail({
  to,
  username: 'test',
  fullName: 'Test',
  theme: {
    id: 'test',
    subject: '🧪 Test AlbNet Email',
    headline: 'Test',
    intro: 'Ky është një email test.',
    features: [],
  },
  highlights: {},
  baseUrl: process.env.FRONTEND_URL || 'https://albneti.vercel.app',
  unsubscribeToken: 'test',
});

if (result.ok) {
  console.log(`\n✅ U dërgua te ${to} përmes ${result.provider || 'email'}`);
} else {
  console.error('\n❌ Dështoi:', result.error);
  process.exit(1);
}
