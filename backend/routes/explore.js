import express from 'express';
import {
  getExplorePosts,
  getTrendingHashtags,
  getPostsByHashtag,
  getSuggestions,
  searchHashtags,
} from '../controllers/exploreController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/postime', optionalAuth, getExplorePosts);
router.get('/hashtag-trending', getTrendingHashtags);
router.get('/kerko-hashtag', protect, searchHashtags);
router.get('/hashtag/:tag', optionalAuth, getPostsByHashtag);
router.get('/sugjerime', protect, getSuggestions);

export default router;
