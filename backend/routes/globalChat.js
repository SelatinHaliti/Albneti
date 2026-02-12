import express from 'express';
import { getMessages, sendMessage, deleteMessage, banUser } from '../controllers/globalChatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/messages', protect, getMessages);
router.post('/messages', protect, sendMessage);
router.delete('/messages/:id', protect, deleteMessage);
router.post('/ban', protect, banUser);

export default router;
