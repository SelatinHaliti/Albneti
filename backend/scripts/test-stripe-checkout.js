/**
 * Test Stripe checkout session creation (pa MongoDB).
 * node scripts/test-stripe-checkout.js
 */
import '../env.js';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key?.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY mungon');
  process.exit(1);
}

const stripe = new Stripe(key);
const frontend = (process.env.FRONTEND_URL || 'https://albneti.vercel.app').replace(/\/$/, '');

try {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: 'test@albneti.app',
    client_reference_id: 'test-user-id',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: 'AlbNet Verifikuar – Test' },
          unit_amount: 499,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    metadata: { userId: 'test-user-id', plan: 'monthly' },
    success_url: `${frontend}/verifikim/sukses?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontend}/verifikim?cancelled=1`,
  });
  console.log('✅ Stripe Checkout OK');
  console.log('   Session:', session.id);
  console.log('   URL:', session.url?.slice(0, 60) + '...');
  console.log('   Test mode:', !key.startsWith('sk_live_'));
} catch (err) {
  console.error('❌ Stripe dështoi:', err.message);
  process.exit(1);
}
