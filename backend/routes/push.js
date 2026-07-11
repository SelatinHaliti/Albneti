import express from 'express';
import { protect } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import { getVapidPublicKey, isPushConfigured } from '../services/pushService.js';

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ message: 'Push nuk është konfiguruar në server.' });
  }
  res.json({ publicKey: key, enabled: isPushConfigured() });
});

router.post('/subscribe', protect, async (req, res) => {
  try {
    const sub = req.body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return res.status(400).json({ message: 'Abonimi push nuk është i vlefshëm.' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      {
        user: req.user.id,
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        userAgent: req.headers['user-agent']?.slice(0, 300) || '',
        deviceLabel: req.body?.deviceLabel || '',
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: 'Njoftimet push u aktivizuan.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim në abonim push.' });
  }
});

router.delete('/subscribe', protect, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint mungon.' });
    }
    await PushSubscription.deleteOne({ user: req.user.id, endpoint });
    res.json({ success: true, message: 'Njoftimet push u çaktivizuan.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
});

router.get('/status', protect, async (req, res) => {
  const count = await PushSubscription.countDocuments({ user: req.user.id });
  res.json({
    enabled: isPushConfigured(),
    subscribed: count > 0,
    devices: count,
  });
});

export default router;
