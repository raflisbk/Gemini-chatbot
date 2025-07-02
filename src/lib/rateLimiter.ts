// src/lib/rateLimiter.ts
import { NextRequest } from 'next/server';
import { cacheManager } from './redis';

// ========================================
// RATE LIMITING INTERFACES
// ========================================

export interface RateLimitConfig {
  windowMs: number;     // Window size in milliseconds
  maxRequests: number;  // Max requests per window
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  customMessage?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
  windowMs: number;
  retryAfter?: number;
}

export interface RateLimitStore {
  current: number;
  resetTime: number;
}

// ========================================
// RATE LIMITER CLASS
// ========================================

export class RateLimiter {
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      customMessage: config.customMessage || 'Too many requests, please try again later.',
    };
  }

  // Default key generator (IP-based)
  private defaultKeyGenerator(req: NextRequest): string {
    // Try multiple methods to get client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    let clientIp = 'unknown';
    
    if (forwarded) {
      clientIp = forwarded.split(',')[0].trim();
    } else if (realIp) {
      clientIp = realIp;
    } else if (cfConnectingIp) {
      clientIp = cfConnectingIp;
    } else if (req.ip) {
      clientIp = req.ip;
    }

    return `rate_limit:${clientIp}`;
  }

  // Check rate limit
  async checkLimit(req: NextRequest): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get current state from cache
      const currentState = await cacheManager.get<RateLimitStore>(key, 'rate_limit');

      // If no previous state or window has expired, start fresh
      if (!currentState || currentState.resetTime < now) {
        const newState: RateLimitStore = {
          current: 1,
          resetTime: now + this.config.windowMs,
        };

        await cacheManager.set(
          key, 
          newState, 
          Math.ceil(this.config.windowMs / 1000), 
          'rate_limit'
        );

        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetTime: newState.resetTime,
          totalRequests: 1,
          windowMs: this.config.windowMs,
        };
      }

      // Check if limit exceeded
      if (currentState.current >= this.config.maxRequests) {
        const retryAfter = Math.ceil((currentState.resetTime - now) / 1000);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime: currentState.resetTime,
          totalRequests: currentState.current,
          windowMs: this.config.windowMs,
          retryAfter: Math.max(retryAfter, 1),
        };
      }

      // Increment counter
      const updatedState: RateLimitStore = {
        current: currentState.current + 1,
        resetTime: currentState.resetTime,
      };

      await cacheManager.set(
        key, 
        updatedState, 
        Math.ceil((currentState.resetTime - now) / 1000), 
        'rate_limit'
      );

      return {
        allowed: true,
        remaining: this.config.maxRequests - updatedState.current,
        resetTime: currentState.resetTime,
        totalRequests: updatedState.current,
        windowMs: this.config.windowMs,
      };

    } catch (error) {
      console.error('❌ Rate limiter error:', error);
      
      // On error, allow the request but log the issue
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
        totalRequests: 1,
        windowMs: this.config.windowMs,
      };
    }
  }

  // Reset limit for a specific key
  async resetLimit(req: NextRequest): Promise<boolean> {
    const key = this.config.keyGenerator(req);
    
    try {
      return await cacheManager.del(key, 'rate_limit');
    } catch (error) {
      console.error('❌ Failed to reset rate limit:', error);
      return false;
    }
  }

  // Get current limit status
  async getStatus(req: NextRequest): Promise<RateLimitStore | null> {
    const key = this.config.keyGenerator(req);
    
    try {
      return await cacheManager.get<RateLimitStore>(key, 'rate_limit');
    } catch (error) {
      console.error('❌ Failed to get rate limit status:', error);
      return null;
    }
  }
}

// ========================================
// PREDEFINED RATE LIMITERS
// ========================================

// General API rate limiter
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  customMessage: 'Too many API requests from this IP, please try again after 15 minutes.',
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  customMessage: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
});

// Chat rate limiter
export const chatRateLimiter = new RateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 20,
  customMessage: 'Too many chat messages, please slow down.',
});

// File upload rate limiter
export const uploadRateLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 10,
  customMessage: 'Too many file uploads, please try again later.',
});

// User-based rate limiter (for authenticated users)
export const createUserRateLimiter = (userId: string, config: RateLimitConfig) => {
  return new RateLimiter({
    ...config,
    keyGenerator: () => `user:${userId}`,
  });
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Create rate limit headers
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.totalRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'X-RateLimit-Window': Math.ceil(result.windowMs / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

// Check multiple rate limiters
export async function checkMultipleRateLimits(
  req: NextRequest, 
  limiters: RateLimiter[]
): Promise<RateLimitResult> {
  for (const limiter of limiters) {
    const result = await limiter.checkLimit(req);
    if (!result.allowed) {
      return result;
    }
  }

  // If all limiters pass, return success with most restrictive remaining count
  const results = await Promise.all(
    limiters.map(limiter => limiter.checkLimit(req))
  );

  const minRemaining = Math.min(...results.map(r => r.remaining));
  const maxReset = Math.max(...results.map(r => r.resetTime));

  return {
    allowed: true,
    remaining: minRemaining,
    resetTime: maxReset,
    totalRequests: results[0].totalRequests,
    windowMs: results[0].windowMs,
  };
}

// Sliding window rate limiter (more precise)
export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private keyGenerator: (req: NextRequest) => string;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.keyGenerator = config.keyGenerator || this.defaultKeyGenerator;
  }

  private defaultKeyGenerator(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : (req.ip || 'unknown');
    return `sliding:${clientIp}`;
  }

  async checkLimit(req: NextRequest): Promise<RateLimitResult> {
    const key = this.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Get request timestamps within current window
      const timestamps = await cacheManager.get<number[]>(key, 'sliding_window') || [];
      
      // Filter out old requests
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      
      // Check if limit exceeded
      if (validTimestamps.length >= this.maxRequests) {
        const oldestRequest = Math.min(...validTimestamps);
        const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime: oldestRequest + this.windowMs,
          totalRequests: validTimestamps.length,
          windowMs: this.windowMs,
          retryAfter: Math.max(retryAfter, 1),
        };
      }

      // Add current request
      validTimestamps.push(now);
      
      // Store updated timestamps
      await cacheManager.set(
        key, 
        validTimestamps, 
        Math.ceil(this.windowMs / 1000), 
        'sliding_window'
      );

      return {
        allowed: true,
        remaining: this.maxRequests - validTimestamps.length,
        resetTime: now + this.windowMs,
        totalRequests: validTimestamps.length,
        windowMs: this.windowMs,
      };

    } catch (error) {
      console.error('❌ Sliding window rate limiter error:', error);
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
        totalRequests: 1,
        windowMs: this.windowMs,
      };
    }
  }
}

// ========================================
// CLEANUP UTILITIES
// ========================================

// Clean up expired rate limit entries
export async function cleanupExpiredRateLimits(): Promise<boolean> {
  try {
    // This would be more complex with Redis patterns
    // For now, rely on TTL expiration
    console.log('🧹 Rate limit cleanup completed (TTL-based)');
    return true;
  } catch (error) {
    console.error('❌ Rate limit cleanup failed:', error);
    return false;
  }
}

// Start cleanup job (call this on server startup)
export function startRateLimitCleanup(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  return setInterval(() => {
    cleanupExpiredRateLimits();
  }, intervalMs);
}