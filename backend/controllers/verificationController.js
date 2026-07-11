import User from '../models/User.js';
import {
  isStripeConfigured,
  activateSubscription,
  createCheckoutSession,
  cancelStripeSubscription,
  constructWebhookEvent,
  handleStripeWebhookEvent,
} from '../services/stripeService.js';

const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Krijues',
    price: 4.99,
    currency: 'EUR',
    period: 'muaj',
    benefits: [
      'Badge verifikimi blu (si Instagram)',
      'Prioritet në feed & explore',
      'Mbrojtje nga imitim',
      'Mbështetje e dedikuar',
      'Promovim në Komuniteti',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Krijues Pro',
    price: 39.99,
    currency: 'EUR',
    period: 'vit',
    savings: '33%',
    benefits: [
      'Gjithçka nga plani mujor',
      'Prioritet maksimal në algoritëm',
      'Evente ekskluzive diasporë',
      'Analitika bazë (së shpejti)',
      'Badge ari për vitin e parë',
    ],
  },
};

function isSubscriptionActive(user) {
  if (!user?.verifiedSubscription) return false;
  if (user.verifiedSubscription.status !== 'active') return false;
  if (user.verifiedSubscription.expiresAt && new Date(user.verifiedSubscription.expiresAt) < new Date()) {
    return false;
  }
  return user.verifiedSubscription.plan !== 'none';
}

export const getPlans = async (_req, res) => {
  res.json({
    plans: Object.values(PLANS),
    stripeEnabled: isStripeConfigured(),
    testMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false,
  });
};

export const getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'isVerified verifiedSubscription username fullName avatar'
    );
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const active = isSubscriptionActive(user);
    if (user.isVerified !== active) {
      const updates = { isVerified: active };
      if (!active && user.verifiedSubscription?.status === 'active') {
        updates['verifiedSubscription.status'] = 'expired';
      }
      await User.findByIdAndUpdate(req.user.id, { $set: updates });
      user.isVerified = active;
    }

    res.json({
      isVerified: active,
      subscription: user.verifiedSubscription || { plan: 'none', status: 'none' },
      plans: Object.values(PLANS),
      stripeEnabled: isStripeConfigured(),
      testMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

export const createCheckout = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ message: 'Zgjidhni planin monthly ose yearly.' });
    }

    const user = await User.findById(req.user.id).select('email username verifiedSubscription');
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    if (isSubscriptionActive(user)) {
      return res.status(400).json({ message: 'Ke tashmë një abonim aktiv.' });
    }

    if (!isStripeConfigured()) {
      const subscription = await activateSubscription(req.user.id, plan);
      return res.json({
        success: true,
        simulated: true,
        message: 'U verifikua! (Stripe nuk është aktiv – modalitet dev)',
        isVerified: true,
        subscription,
      });
    }

    const checkout = await createCheckoutSession(user, plan);
    res.json({
      success: true,
      url: checkout.url,
      sessionId: checkout.sessionId,
      testMode: checkout.testMode,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim gjatë pagesës.' });
  }
};

/** Legacy direct subscribe – përdoret vetëm kur Stripe s'është aktiv */
export const subscribe = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ message: 'Zgjidhni planin monthly ose yearly.' });
    }

    if (isStripeConfigured()) {
      return res.status(400).json({
        message: 'Përdorni pagesën me Stripe. Klikoni Abonohu për të vazhduar.',
      });
    }

    const subscription = await activateSubscription(req.user.id, plan);
    res.json({
      success: true,
      message: 'U verifikua! Badge-i yt është aktiv.',
      isVerified: true,
      subscription,
      user: { id: req.user.id, isVerified: true, verifiedSubscription: subscription },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('verifiedSubscription');
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    await cancelStripeSubscription(user);

    await User.findByIdAndUpdate(req.user.id, {
      $set: { isVerified: false, 'verifiedSubscription.status': 'cancelled' },
    });

    res.json({
      success: true,
      message: 'Abonimi u anulua. Badge verifikimi u hoq.',
      isVerified: false,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

export const stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).send('Mungon stripe-signature');

  try {
    const event = constructWebhookEvent(req.body, signature);
    await handleStripeWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

export const getVerifiedCreators = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const users = await User.find({
      isBlocked: false,
      isVerified: true,
      username: { $ne: 'albnet_official' },
    })
      .select('username fullName avatar followers isVerified verifiedSubscription')
      .limit(limit * 2)
      .lean();

    users.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));

    res.json({
      creators: users.slice(0, limit).map((u) => ({
        username: u.username,
        name: u.fullName || u.username,
        avatar: u.avatar,
        verified: true,
        followers: u.followers?.length || 0,
        plan: u.verifiedSubscription?.plan || 'monthly',
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
