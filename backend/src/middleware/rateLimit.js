/**
 * Rate Limiting Middleware
 *
 * Simple in-memory rate limiter for Phase 1.
 * For production/multi-server, use Redis-based rate limiting.
 *
 * Limits:
 * - Login: 5 attempts per 15 minutes per IP
 * - General API: 100 requests per minute per user
 * - Bulk operations: 10 per hour per user
 */

import jwt from 'jsonwebtoken';

const loginAttempts = new Map();
const requestCounts = new Map();
const bulkOperations = new Map();
const otpAttempts = new Map(); // Separate for password reset OTP requests

// Clean up old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_MINUTE = 60 * 1000;

    // Clean login attempts
    for (const [ip, data] of loginAttempts.entries()) {
      if (now - data.windowStart > FIFTEEN_MINUTES) {
        loginAttempts.delete(ip);
      }
    }

    // Clean request counts
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.windowStart > ONE_MINUTE) {
        requestCounts.delete(key);
      }
    }

    // Clean bulk operations
    for (const [userId, data] of bulkOperations.entries()) {
      if (now - data.windowStart > ONE_HOUR) {
        bulkOperations.delete(userId);
      }
    }

    // Clean OTP attempts
    for (const [key, data] of otpAttempts.entries()) {
      if (now - data.windowStart > ONE_MINUTE) {
        otpAttempts.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks
 */
export const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 50;

  let record = loginAttempts.get(ip);

  if (!record || now - record.windowStart > windowMs) {
    // Start new window
    record = {
      windowStart: now,
      attempts: 0,
    };
  }

  // Block if max attempts reached
  if (record.attempts >= maxAttempts) {
    const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
    return res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.',
      retryAfter,
    });
  }

  record.attempts++;
  loginAttempts.set(ip, record);

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': maxAttempts,
    'X-RateLimit-Remaining': maxAttempts - record.attempts,
    'X-RateLimit-Reset': Math.ceil((record.windowStart + windowMs - now) / 1000),
  });

  next();
};

/**
 * General API rate limiter
 * 100 requests per minute per user/IP
 */
// apiRateLimiter is mounted in index.js before each router's authenticate(),
// so req.user isn't set yet. Read the user from the bearer token here —
// otherwise everyone behind the same proxy / office network shares one
// IP-keyed budget. The signature is verified so a forged token can't be used
// to rotate through fresh budgets; an invalid token falls back to the IP.
const userIdFromToken = req => {
  if (req.user?.id) return req.user.id;
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET)?.id || null;
  } catch {
    return null;
  }
};

export const apiRateLimiter = (req, res, next) => {
  const userId = userIdFromToken(req);
  const key = userId ? `user:${userId}` : `ip:${req.ip || 'unknown'}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  let record = requestCounts.get(key);

  if (!record || now - record.windowStart > windowMs) {
    record = {
      windowStart: now,
      count: 0,
    };
  }

  record.count++;
  requestCounts.set(key, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000),
    });
  }

  res.set({
    'X-RateLimit-Limit': maxRequests,
    'X-RateLimit-Remaining': Math.max(0, maxRequests - record.count),
  });

  next();
};

/**
 * Rate limiter for OTP requests (password reset)
 * 3 requests per minute per phone/IP
 */
export const otpRateLimiter = (req, res, next) => {
  const identifier = req.body?.phone || req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 3;

  let record = otpAttempts.get(identifier);

  if (!record || now - record.windowStart > windowMs) {
    record = {
      windowStart: now,
      attempts: 0,
    };
  }

  if (record.attempts >= maxAttempts) {
    const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
    return res.status(429).json({
      success: false,
      error: 'Too many OTP requests. Please try again later.',
      retryAfter,
    });
  }

  record.attempts++;
  otpAttempts.set(identifier, record);

  res.set({
    'X-RateLimit-Limit': maxAttempts,
    'X-RateLimit-Remaining': maxAttempts - record.attempts,
    'X-RateLimit-Reset': Math.ceil((record.windowStart + windowMs - now) / 1000),
  });

  next();
};

/**
 * Bulk operation rate limiter
 * 10 bulk operations per hour per user
 */
export const bulkRateLimiter = (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required for bulk operations',
    });
  }

  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxOperations = 10;

  let record = bulkOperations.get(userId);

  if (!record || now - record.windowStart > windowMs) {
    record = {
      windowStart: now,
      count: 0,
    };
  }

  if (record.count >= maxOperations) {
    return res.status(429).json({
      success: false,
      error: 'Bulk operation limit reached. Please try again later.',
      retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000),
    });
  }

  record.count++;
  bulkOperations.set(userId, record);

  res.set({
    'X-RateLimit-Limit': maxOperations,
    'X-RateLimit-Remaining': maxOperations - record.count,
  });

  next();
};

/**
 * Strict rate limiter for sensitive operations
 * Lower limits for more protection
 */
export const strictRateLimiter = (req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  const key = `strict_${ip}`;
  let record = requestCounts.get(key);

  if (!record || now - record.windowStart > windowMs) {
    record = { windowStart: now, count: 0 };
  }

  record.count++;
  requestCounts.set(key, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please wait before retrying.',
      retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000),
    });
  }

  next();
};
