import express from 'express';
import {
  getOrCreateConversation,
  getConversationById,
  getConversations,
  sendMessage,
  markAsRead,
  createGroupConversation,
  replyToStory,
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/', protect, getConversations);
router.post('/grup', protect, createGroupConversation);
router.post('/story/:storyId/pergjigje', protect, replyToStory);
router.get('/conversation/:conversationId', protect, getConversationById);
router.get('/me/:userId', protect, getOrCreateConversation);
router.post('/:conversationId', protect, uploadSingle, sendMessage);
router.put('/:conversationId/lexuar', protect, markAsRead);

export default router;
