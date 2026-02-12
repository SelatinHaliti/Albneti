import express from 'express';
import { getLibrary } from '../controllers/musicController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Biblioteka e muzikës – e hapur për të gjithë (lista këngësh), pa kërkuar kyçje
router.get('/', optionalAuth, getLibrary);

export default router;
