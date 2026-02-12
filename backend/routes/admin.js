import express from 'express';
import {
  getStats,
  getReports,
  updateReportStatus,
  blockUser,
  unblockUser,
  getUsers,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/raportet', getReports);
router.put('/raportet/:id', updateReportStatus);
router.get('/perdoruesit', getUsers);
router.post('/perdoruesit/:userId/blloko', blockUser);
router.post('/perdoruesit/:userId/zhblloko', unblockUser);

export default router;
