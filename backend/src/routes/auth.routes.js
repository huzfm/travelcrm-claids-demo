import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  me,
  updateProfile,
  changePassword,
  adminChangePassword,
  forgotPassword,
  verifyOTP,
  resetPassword,
  verifyLoginOTP,
  resendLoginOTP,
  loginValidation,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import {
  loginRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  otpRateLimiter,
} from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', loginRateLimiter, loginValidation, login);
router.post('/verify-login-otp', verifyLoginOTP);
router.post('/resend-login-otp', resendLoginOTP);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.patch('/profile', authenticate, apiRateLimiter, updateProfile);
router.post('/change-password', authenticate, strictRateLimiter, changePassword);

// Admin routes - no old password required
router.post('/admin/change-password', authenticate, apiRateLimiter, adminChangePassword);

// Forgot password routes (no authentication required)
// IMPORTANT: These use the OTP instance via otpWhatsapp.js
router.post('/forgot-password', otpRateLimiter, forgotPassword);
router.post('/verify-otp', otpRateLimiter, verifyOTP);
router.post('/reset-password', resetPassword);

export default router;
