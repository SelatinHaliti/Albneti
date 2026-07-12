import express from 'express';
import {
  startLive,
  endLive,
  getActiveLives,
  getLive,
  joinLive,
  addLiveComment,
  addLiveReaction,
} from '../controllers/liveController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getActiveLives);
router.post('/nis', protect, startLive);
router.get('/:id', protect, getLive);
router.post('/:id/bashkohu', protect, joinLive);
router.post('/:id/koment', protect, addLiveComment);
router.post('/:id/reagim', protect, addLiveReaction);
router.post('/:id/mbyll', protect, endLive);

export default router;
