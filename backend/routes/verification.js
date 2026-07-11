import express from 'express';
import {
  getPlans,
  getStatus,
  subscribe,
  createCheckout,
  confirmCheckout,
  cancelSubscription,
  getVerifiedCreators,
} from '../controllers/verificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', getPlans);
router.get('/creators', getVerifiedCreators);
router.get('/status', protect, getStatus);
router.post('/create-checkout', protect, createCheckout);
router.post('/confirm-checkout', protect, confirmCheckout);
router.post('/subscribe', protect, subscribe);
router.post('/cancel', protect, cancelSubscription);

export default router;
