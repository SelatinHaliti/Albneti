import express from 'express';
import {
  weeklyMarketingCron,
  marketingUnsubscribe,
  adminMarketingStats,
  adminSendWeeklyMarketing,
} from '../controllers/marketingController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/cron/weekly', weeklyMarketingCron);
router.get('/unsubscribe', marketingUnsubscribe);
router.post('/unsubscribe', marketingUnsubscribe);

router.get('/admin/stats', protect, adminOnly, adminMarketingStats);
router.post('/admin/send-weekly', protect, adminOnly, adminSendWeeklyMarketing);

export default router;
