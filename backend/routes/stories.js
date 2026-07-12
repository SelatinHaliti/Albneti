import express from 'express';
import {
  createStory,
  getActiveStories,
  viewStory,
  deleteStory,
  getStoryViewers,
} from '../controllers/storyController.js';
import { protect } from '../middleware/auth.js';
import { uploadStoryWithMusic } from '../middleware/upload.js';

const router = express.Router();

router.get('/', protect, getActiveStories);
router.post('/', protect, uploadStoryWithMusic, createStory);
router.post('/:id/shiko', protect, viewStory);
router.get('/:id/shikuesit', protect, getStoryViewers);
router.delete('/:id', protect, deleteStory);

export default router;
