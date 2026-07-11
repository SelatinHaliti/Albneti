/**
 * Gjenero VAPID keys për Web Push.
 * Ekzekuto: node scripts/generate-vapid.js
 * Vendos rezultatin në backend/.env dhe Render Environment.
 */
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('\n=== VAPID Keys për AlbNet Push ===\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:support@albneti.vercel.app');
console.log('\nVendos edhe në Vercel (frontend):');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('\n');
