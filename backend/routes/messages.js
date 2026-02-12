import express from 'express';
import {
  getOrCreateConversation,
  getConversationById,
  getConversations,
  sendMessage,
  markAsRead,
} from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/', protect, getConversations);
router.get('/conversation/:conversationId', protect, getConversationById);
router.get('/me/:userId', protect, getOrCreateConversation);
router.post('/:conversationId', protect, uploadSingle, sendMessage);
router.put('/:conversationId/lexuar', protect, markAsRead);

export default router;
