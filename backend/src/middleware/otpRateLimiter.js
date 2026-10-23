/**
 * OTP Rate Limiter Middleware
 *
 * Limits the number of forgot password requests per phone number.
 * Prevents OTP spam and abuse.
 */


// In-memory store for OTP requests (per phone)
// For production, use Redis or similar
const otpRequestCounts = new Map();
const otpRequestTimestamps = new Map();

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS = 3; // Max 3 forgot-password requests per phone per hour

// Cleanup function
const cleanupOldEntries = () => {
  const now = Date.now();
  const phoneNumbers = [...otpRequestCounts.keys()];

  phoneNumbers.forEach(phone => {
    const timestamps = otpRequestTimestamps.get(phone) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < WINDOW_MS);

    if (validTimestamps.length === 0) {
      otpRequestCounts.delete(phone);
      otpRequestTimestamps.delete(phone);
    } else {
      otpRequestTimestamps.set(phone, validTimestamps);
      otpRequestCounts.set(phone, validTimestamps.length);
    }
  });
};

// Start cleanup interval
setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

/**
 * Check if phone has exceeded rate limit
 *
 * @param {string} phone - Normalized phone number
 * @returns {{allowed: boolean, remaining: number, resetTime: number}}
 */
export const checkOTPRequestLimit = phone => {
  const now = Date.now();
  const timestamps = otpRequestTimestamps.get(phone) || [];

  // Filter out expired timestamps
  const validTimestamps = timestamps.filter(ts => now - ts < WINDOW_MS);
  const requestCount = validTimestamps.length;

  if (requestCount >= MAX_REQUESTS) {
    const oldestRequest = Math.min(...validTimestamps);
    const resetTime = oldestRequest + WINDOW_MS;

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - requestCount,
    resetTime: 0,
    retryAfter: 0,
  };
};

/**
 * Record an OTP request for rate limiting
 *
 * @param {string} phone - Normalized phone number
 */
export const recordOTPRequest = phone => {
  const now = Date.now();
  const timestamps = otpRequestTimestamps.get(phone) || [];
  timestamps.push(now);
  otpRequestTimestamps.set(phone, timestamps);
  otpRequestCounts.set(phone, timestamps.length);
};

/**
 * Express middleware for OTP rate limiting on forgot-password endpoint
 */
export const otpRateLimiter = (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next();
  }

  // Normalize phone for rate limit tracking
  const normalizedPhone = phone.replace(/[^\d]/g, '').slice(-10);
  const rateLimitKey = `otp:${normalizedPhone}`;

  const check = checkOTPRequestLimit(rateLimitKey);

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': MAX_REQUESTS,
    'X-RateLimit-Remaining': check.remaining,
    'X-RateLimit-Reset': check.resetTime ? new Date(check.resetTime).toISOString() : undefined,
  });

  if (!check.allowed) {
    console.log(
      `[RateLimit] OTP request blocked for ${normalizedPhone}. Retry after ${check.retryAfter}s`
    );

    return res.status(429).json({
      success: false,
      error: 'Too many OTP requests. Please try again later.',
      code: 'OTP_RATE_LIMITED',
      retryAfter: check.retryAfter,
      resetTime: new Date(check.resetTime).toISOString(),
    });
  }

  // Record this request
  recordOTPRequest(normalizedPhone);

  next();
};

/**
 * Get current rate limit status for a phone
 *
 * @param {string} phone - Phone number to check
 * @returns {{remaining: number, total: number, resetIn: number}}
 */
export const getOTPRequestStatus = phone => {
  const normalizedPhone = phone.replace(/[^\d]/g, '').slice(-10);
  const rateLimitKey = `otp:${normalizedPhone}`;
  const check = checkOTPRequestLimit(rateLimitKey);

  return {
    remaining: check.remaining,
    total: MAX_REQUESTS,
    resetIn: check.retryAfter > 0 ? check.retryAfter : 0,
  };
};

export default otpRateLimiter;
