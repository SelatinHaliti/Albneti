import express from 'express';
import {
  createPost,
  getFeed,
  getPost,
  getArchivedPosts,
  updatePost,
  deletePost,
  archivePost,
  toggleLike,
  addComment,
  deleteComment,
  updateComment,
  toggleCommentLike,
  toggleSave,
  sharePost,
} from '../controllers/postController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { uploadPostWithMusic } from '../middleware/upload.js';

const router = express.Router();

router.get('/feed', protect, getFeed);
router.get('/arkivuara', protect, getArchivedPosts);
router.get('/:id', optionalAuth, getPost);
router.post('/', protect, uploadPostWithMusic, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.put('/:id/arkivo', protect, archivePost);
router.post('/:id/pelqim', protect, toggleLike);
router.post('/:id/koment', protect, addComment);
router.delete('/:id/koment/:commentId', protect, deleteComment);
router.put('/:id/koment/:commentId', protect, updateComment);
router.post('/:id/koment/:commentId/pelqim', protect, toggleCommentLike);
router.post('/:id/ruaj', protect, toggleSave);
router.post('/:id/ndaj', protect, sharePost);

export default router;
