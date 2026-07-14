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
  adminSendActiveMarketing,
  adminCancelStuckMarketing,
  activeMarketingCron,
  blastStatusCron,
} from '../controllers/marketingController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/cron/weekly', weeklyMarketingCron);
router.post('/cron/send-active', activeMarketingCron);
router.get('/cron/blast-status', blastStatusCron);
router.get('/unsubscribe', marketingUnsubscribe);
router.post('/unsubscribe', marketingUnsubscribe);

router.get('/admin/stats', protect, adminOnly, adminMarketingStats);
router.get('/admin/ai-preview', protect, adminOnly, adminAIMarketingPreview);
router.post('/admin/ai-blast', protect, adminOnly, adminAIMarketingBlast);
router.post('/admin/cancel-stuck', protect, adminOnly, adminCancelStuckMarketing);
router.post('/admin/send-active', protect, adminOnly, adminSendActiveMarketing);
router.get('/admin/blast-status', protect, adminOnly, adminBlastStatus);
router.post('/admin/test-email', protect, adminOnly, adminTestMarketingEmail);
router.post('/admin/send-weekly', protect, adminOnly, adminSendWeeklyMarketing);

export default router;
