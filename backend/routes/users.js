import express from 'express';
import {
  getProfile,
  updateProfile,
  toggleFollow,
  searchUsers,
  toggleBlock,
  getSavedPosts,
  getTaggedPosts,
  getFollowers,
  getFollowing,
  getFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
} from '../controllers/userController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/kerko', protect, searchUsers);
router.get('/me/ruajturat', protect, getSavedPosts);
router.get('/me/tagged', protect, getTaggedPosts);
router.get('/me/kerkesa-ndjekje', protect, getFollowRequests);
router.post('/me/kerkesa-ndjekje/:requesterId/prano', protect, acceptFollowRequest);
router.post('/me/kerkesa-ndjekje/:requesterId/refuzo', protect, declineFollowRequest);
router.get('/liste/:userId/ndjekesit', protect, getFollowers);
router.get('/liste/:userId/ndjeket', protect, getFollowing);
router.get('/:username', optionalAuth, getProfile);
router.put('/profili', protect, uploadSingle, updateProfile);
router.post('/:userId/ndiq', protect, toggleFollow);
router.post('/:userId/blloko', protect, toggleBlock);

export default router;
