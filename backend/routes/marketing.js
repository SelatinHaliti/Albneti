import express from 'express';
import {
  weeklyMarketingCron,
  marketingUnsubscribe,
  adminMarketingStats,
  adminSendWeeklyMarketing,
  adminTestMarketingEmail,
  adminAIMarketingPreview,
  adminAIMarketingBlast,
  adminBlastStatus,
} from '../controllers/marketingController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/cron/weekly', weeklyMarketingCron);
router.get('/unsubscribe', marketingUnsubscribe);
router.post('/unsubscribe', marketingUnsubscribe);

router.get('/admin/stats', protect, adminOnly, adminMarketingStats);
router.get('/admin/ai-preview', protect, adminOnly, adminAIMarketingPreview);
router.post('/admin/ai-blast', protect, adminOnly, adminAIMarketingBlast);
router.get('/admin/blast-status', protect, adminOnly, adminBlastStatus);
router.post('/admin/test-email', protect, adminOnly, adminTestMarketingEmail);
router.post('/admin/send-weekly', protect, adminOnly, adminSendWeeklyMarketing);

export default router;
