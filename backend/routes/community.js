import express from 'express';
import { getEvents, getEvent, toggleInterest } from '../controllers/communityController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/events', optionalAuth, getEvents);
router.get('/events/:id', optionalAuth, getEvent);
router.post('/events/:id/interesohem', protect, toggleInterest);

export default router;
