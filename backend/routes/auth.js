import express from 'express';
import {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/regjistrohu', register);
router.post('/kycu', login);
router.post('/dil', logout);
router.post('/verifiko-email', verifyEmail);
router.post('/ridergo-verifikimin', resendVerification);
router.post('/harruar-fjalekalimin', forgotPassword);
router.post('/rifresko-fjalekalimin', resetPassword);
router.get('/une', protect, getMe);

export default router;
