import express from 'express';
import {
  getPlans,
  getStatus,
  subscribe,
  cancelSubscription,
  getVerifiedCreators,
} from '../controllers/verificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', getPlans);
router.get('/creators', getVerifiedCreators);
router.get('/status', protect, getStatus);
router.post('/subscribe', protect, subscribe);
router.post('/cancel', protect, cancelSubscription);

export default router;
