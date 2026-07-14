import express from 'express';
import {
  register,
  login,
  logout,
  verifyEmail,
  verifyEmailLink,
  resendVerification,
  emailStatus,
  forgotPassword,
  resetPassword,
  getMe,
  googleLogin,
  appleLogin,
  oauthStatus,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/regjistrohu', register);
router.post('/kycu', login);
router.post('/google', googleLogin);
router.post('/apple', appleLogin);
router.get('/oauth-status', oauthStatus);
router.post('/dil', logout);
router.post('/verifiko-email', verifyEmail);
router.get('/verifiko-link', verifyEmailLink);
router.post('/ridergo-verifikimin', resendVerification);
router.get('/email-status', emailStatus);
router.post('/harruar-fjalekalimin', forgotPassword);
router.post('/rifresko-fjalekalimin', resetPassword);
router.get('/une', protect, getMe);

export default router;
