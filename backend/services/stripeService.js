import Stripe from 'stripe';
import User from '../models/User.js';

const PLANS = {
  monthly: {
    name: 'AlbNet Verifikuar – Krijues',
    amount: 499,
    interval: 'month',
  },
  yearly: {
    name: 'AlbNet Verifikuar – Krijues Pro',
    amount: 3999,
    interval: 'year',
  },
};

let stripeClient = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_'));
}

function getStripe() {
  if (!isStripeConfigured()) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'https://albneti.vercel.app').replace(/\/$/, '');
}

export async function activateSubscription(userId, plan, extra = {}) {
  const now = new Date();
  const expiresAt = extra.expiresAt ? new Date(extra.expiresAt) : new Date(now);
  if (!extra.expiresAt) {
    if (plan === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  const subscription = {
    plan,
    status: 'active',
    subscribedAt: now,
    expiresAt,
    ...(extra.stripeCustomerId ? { stripeCustomerId: extra.stripeCustomerId } : {}),
    ...(extra.stripeSubscriptionId ? { stripeSubscriptionId: extra.stripeSubscriptionId } : {}),
  };

  await User.findByIdAndUpdate(userId, {
    $set: { isVerified: true, verifiedSubscription: subscription },
  });

  return subscription;
}

export async function createCheckoutSession(user, plan) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe nuk është konfiguruar. Vendosni STRIPE_SECRET_KEY në backend.');
  }

  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error('Plan i pavlefshëm.');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: planConfig.name,
            description: 'Badge verifikimi blu + prioritet në feed (AlbNet)',
          },
          unit_amount: planConfig.amount,
          recurring: { interval: planConfig.interval },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: String(user._id),
      plan,
      username: user.username,
    },
    subscription_data: {
      metadata: {
        userId: String(user._id),
        plan,
      },
    },
    success_url: `${frontendUrl()}/verifikim?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl()}/verifikim?cancelled=1`,
  });

  return {
    url: session.url,
    sessionId: session.id,
    testMode: process.env.STRIPE_SECRET_KEY.startsWith('sk_test_'),
  };
}

export async function cancelStripeSubscription(user) {
  const subId = user?.verifiedSubscription?.stripeSubscriptionId;
  if (!subId || !isStripeConfigured()) return;
  const stripe = getStripe();
  await stripe.subscriptions.cancel(subId);
}

export function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe nuk është konfiguruar.');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET mungon.');
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export async function handleStripeWebhookEvent(event) {
  const stripe = getStripe();
  if (!stripe) return;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.mode !== 'subscription') return;

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (!userId || !['monthly', 'yearly'].includes(plan)) return;

    let expiresAt;
    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(String(session.subscription));
      expiresAt = new Date(sub.current_period_end * 1000);
    }

    await activateSubscription(userId, plan, {
      stripeCustomerId: session.customer ? String(session.customer) : undefined,
      stripeSubscriptionId: session.subscription ? String(session.subscription) : undefined,
      expiresAt,
    });
    return;
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const userId = sub.metadata?.userId;
    if (!userId) return;
    await User.findByIdAndUpdate(userId, {
      $set: { isVerified: false, 'verifiedSubscription.status': 'cancelled' },
    });
  }
}
