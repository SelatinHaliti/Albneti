/**
 * Gjenero VAPID keys për Web Push.
 * Ekzekuto: node scripts/generate-vapid.js
 */
import crypto from 'crypto';

function urlBase64Encode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

const curve = crypto.createECDH('prime256v1');
curve.generateKeys();

const keys = {
  publicKey: urlBase64Encode(curve.getPublicKey()),
  privateKey: urlBase64Encode(curve.getPrivateKey()),
};

console.log('\n=== VAPID Keys për AlbNet Push ===\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:support@albneti.vercel.app');
console.log('\nVendos edhe në Vercel (frontend):');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('\n');
