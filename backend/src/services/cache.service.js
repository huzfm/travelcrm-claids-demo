/**
 * Simple in-memory cache service for API responses
 * Note: Resets on server restart. For production, use Redis.
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();

    // Clean up every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.timers.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 60)
   */
  set(key, value, ttlSeconds = 60) {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, { value, expiresAt });

    // Auto-cleanup when TTL expires
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Delete keys matching pattern
   * @param {string} pattern - Key pattern (e.g., "users:*")
   */
  deletePattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
      }
    }
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
const cacheService = new CacheService();

export default cacheService;

// Cache keys helper
export const cacheKeys = {
  analytics: branchId => `analytics:${branchId || 'all'}`,
  branchStats: branchId => `branch:stats:${branchId}`,
  teamStats: branchId => `team:stats:${branchId}`,
  user: userId => `user:${userId}`,
  users: branchId => `users:${branchId || 'all'}`,
};
