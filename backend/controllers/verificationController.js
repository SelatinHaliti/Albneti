import User from '../models/User.js';

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
  res.json({ plans: Object.values(PLANS) });
};

export const getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'isVerified verifiedSubscription username fullName avatar'
    );
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const active = isSubscriptionActive(user);
    if (user.isVerified !== active) {
      user.isVerified = active;
      if (!active && user.verifiedSubscription?.status === 'active') {
        user.verifiedSubscription.status = 'expired';
      }
      await user.save();
    }

    res.json({
      isVerified: active,
      subscription: user.verifiedSubscription || { plan: 'none', status: 'none' },
      plans: Object.values(PLANS),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

export const subscribe = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ message: 'Zgjidhni planin monthly ose yearly.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const now = new Date();
    const expiresAt = new Date(now);
    if (plan === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    user.verifiedSubscription = {
      plan,
      status: 'active',
      subscribedAt: now,
      expiresAt,
    };
    user.isVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'U verifikua! Badge-i yt është aktiv.',
      isVerified: true,
      subscription: user.verifiedSubscription,
      user: {
        id: user._id,
        username: user.username,
        isVerified: true,
        verifiedSubscription: user.verifiedSubscription,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    if (user.verifiedSubscription) {
      user.verifiedSubscription.status = 'cancelled';
    }
    user.isVerified = false;
    await user.save();

    res.json({
      success: true,
      message: 'Abonimi u anulua. Badge verifikimi u hoq.',
      isVerified: false,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
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
