/**
 * API Rate Limiting Middleware
 * Prevents API abuse with per-user and per-IP rate limits
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class APIRateLimiter {
  private userLimits: Map<string, Map<string, RateLimitEntry>> = new Map();
  private ipLimits: Map<string, Map<string, RateLimitEntry>> = new Map();

  private limits = {
    // Room creation: 5 requests per minute per user
    'room-creation': { max: 5, windowMs: 60 * 1000 },

    // General API: 100 requests per minute per user
    'general': { max: 100, windowMs: 60 * 1000 },

    // IP-based limits for unauthenticated requests
    'ip-general': { max: 50, windowMs: 60 * 1000 }
  };

  /**
   * Check if request is allowed
   */
  checkLimit(
    identifier: string,
    limitType: keyof typeof this.limits,
    useIPLimit: boolean = false
  ): { allowed: boolean; retryAfter?: number; remaining?: number } {
    const limit = this.limits[limitType];
    const limitsMap = useIPLimit ? this.ipLimits : this.userLimits;

    if (!limitsMap.has(identifier)) {
      limitsMap.set(identifier, new Map());
    }

    const userLimits = limitsMap.get(identifier)!;
    const now = Date.now();

    if (!userLimits.has(limitType)) {
      userLimits.set(limitType, {
        count: 1,
        resetTime: now + limit.windowMs
      });

      return {
        allowed: true,
        remaining: limit.max - 1
      };
    }

    const entry = userLimits.get(limitType)!;

    // Reset if window has passed
    if (now >= entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + limit.windowMs;

      return {
        allowed: true,
        remaining: limit.max - 1
      };
    }

    // Check if limit exceeded
    if (entry.count >= limit.max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        remaining: 0
      };
    }

    // Increment count
    entry.count++;

    return {
      allowed: true,
      remaining: limit.max - entry.count
    };
  }

  /**
   * Cleanup old entries (run periodically)
   */
  cleanup() {
    const now = Date.now();

    // Cleanup user limits
    for (const [identifier, limits] of this.userLimits.entries()) {
      for (const [limitType, entry] of limits.entries()) {
        if (now >= entry.resetTime) {
          limits.delete(limitType);
        }
      }
      if (limits.size === 0) {
        this.userLimits.delete(identifier);
      }
    }

    // Cleanup IP limits
    for (const [identifier, limits] of this.ipLimits.entries()) {
      for (const [limitType, entry] of limits.entries()) {
        if (now >= entry.resetTime) {
          limits.delete(limitType);
        }
      }
      if (limits.size === 0) {
        this.ipLimits.delete(identifier);
      }
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      trackedUsers: this.userLimits.size,
      trackedIPs: this.ipLimits.size
    };
  }
}

// Singleton instance
const rateLimiter = new APIRateLimiter();

// Cleanup every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

export default rateLimiter;
