import express from 'express';
import {
  createStory,
  getActiveStories,
  viewStory,
  deleteStory,
} from '../controllers/storyController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/', protect, getActiveStories);
router.post('/', protect, uploadSingle, createStory);
router.post('/:id/shiko', protect, viewStory);
router.delete('/:id', protect, deleteStory);

export default router;
