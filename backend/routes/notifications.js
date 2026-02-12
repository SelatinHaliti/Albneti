import express from 'express';
import {
  getNotifications,
  markAllRead,
  markOneRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/lexo-te-gjitha', protect, markAllRead);
router.put('/:id/lexo', protect, markOneRead);

export default router;
