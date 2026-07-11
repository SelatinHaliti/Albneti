import express from 'express';
import { protect } from '../middleware/auth.js';
import { getIceServersForCall, isMeteredConfigured } from '../services/meteredTurnService.js';

const router = express.Router();

/** ICE/STUN/TURN për thirrje audio/video – vetëm përdorues të kyçur */
router.get('/ice-servers', protect, async (req, res) => {
  try {
    const iceServers = await getIceServersForCall();
    res.json({
      iceServers,
      source: isMeteredConfigured() ? 'metered' : 'fallback',
    });
  } catch (err) {
    console.error('[calls/ice-servers]', err);
    res.status(502).json({ message: 'TURN server nuk është i disponueshëm. Kontrollo konfigurimin Metered.' });
  }
});

export default router;
