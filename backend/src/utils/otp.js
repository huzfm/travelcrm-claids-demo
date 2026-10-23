/**
 * OTP Utilities
 *
 * Handles OTP generation, hashing, and verification.
 * Uses bcrypt for secure hashing and includes rate limiting.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;

/**
 * Generate a random 6-digit OTP
 *
 * @returns {string} - 6-digit OTP string
 */
export const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[OTP] Generated new OTP (for logging only - never log in production)`);
  return otp;
};

/**
 * Hash an OTP using bcrypt
 *
 * @param {string} otp - The plain OTP
 * @returns {Promise<string>} - Hashed OTP
 */
export const hashOTP = async otp => {
  const hash = await bcrypt.hash(otp, SALT_ROUNDS);
  return hash;
};

/**
 * Verify an OTP against a hash
 *
 * @param {string} otp - The plain OTP to verify
 * @param {string} hash - The bcrypt hash to compare against
 * @returns {Promise<boolean>} - true if valid, false otherwise
 */
export const verifyOTP = async (otp, hash) => {
  try {
    const isValid = await bcrypt.compare(otp, hash);
    return isValid;
  } catch (error) {
    console.error('[OTP] Verification error:', error);
    return false;
  }
};

/**
 * Calculate OTP expiry time
 *
 * @param {number} minutes - Minutes until expiry (default: 10)
 * @returns {Date} - Expiry date
 */
export const getOTPExpiry = (minutes = OTP_EXPIRY_MINUTES) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Check if OTP has expired
 *
 * @param {Date} expiryDate - The expiry date to check
 * @returns {boolean} - true if expired, false otherwise
 */
export const isOTPExpired = expiryDate => {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
};

/**
 * Create a secure reset token
 *
 * @returns {string} - 32-byte hex string
 */
export const createResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get max attempts allowed
 *
 * @returns {number}
 */
export const getMaxAttempts = () => {
  return MAX_ATTEMPTS;
};

export default {
  generateOTP,
  hashOTP,
  verifyOTP,
  getOTPExpiry,
  isOTPExpired,
  createResetToken,
  getMaxAttempts,
  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
};
