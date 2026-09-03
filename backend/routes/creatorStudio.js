import express from 'express';
import { getStudio, postSuggest, postCaption } from '../controllers/creatorStudioController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/studio', protect, getStudio);
router.post('/suggest', protect, postSuggest);
router.post('/caption', protect, postCaption);

export default router;
