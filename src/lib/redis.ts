// src/lib/redis.ts
import { Redis } from 'ioredis';

// ========================================
// REDIS CONFIGURATION
// ========================================

// Environment variables with fallbacks
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';
const isServer = typeof window === 'undefined';

// Redis client instance
let redisClient: Redis | null = null;

// ========================================
// REDIS CLIENT INITIALIZATION
// ========================================

export const getRedisClient = (): Redis | null => {
  // Only initialize on server-side
  if (!isServer) {
    console.warn('🚨 Redis client called from browser, returning null');
    return null;
  }

  // Return existing client
  if (redisClient) {
    return redisClient;
  }

  try {
    // Production: Use Redis URL if available (Upstash, Railway, etc.)
    if (REDIS_URL) {
      console.log('🔗 Connecting to Redis via URL...');
      redisClient = new Redis(REDIS_URL, {
        // Additional options for production
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Add token for Upstash
        ...(REDIS_TOKEN && {
          password: REDIS_TOKEN
        })
      });
    } 
    // Development/Local: Use host/port
    else {
      console.log(`🔗 Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
      redisClient = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    }

    // Event listeners
    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    redisClient.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    return redisClient;

  } catch (error) {
    console.error('❌ Failed to initialize Redis client:', error);
    return null;
  }
};

// ========================================
// REDIS UTILITIES
// ========================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class RedisCache {
  private client: Redis | null;
  private defaultTTL: number = 3600; // 1 hour

  constructor() {
    this.client = getRedisClient();
  }

  // Check if Redis is available
  isAvailable(): boolean {
    return this.client !== null;
  }

  // Generate cache key with prefix
  private generateKey(key: string, prefix?: string): string {
    const basePrefix = 'ai-chatbot';
    const fullPrefix = prefix ? `${basePrefix}:${prefix}` : basePrefix;
    return `${fullPrefix}:${key}`;
  }

  // Set value with TTL
  async set(
    key: string, 
    value: any, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.client) return false;

    try {
      const cacheKey = this.generateKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;
      
      const serializedValue = JSON.stringify(value);
      await this.client.setex(cacheKey, ttl, serializedValue);
      
      return true;
    } catch (error) {
      console.error('❌ Redis SET error:', error);
      return false;
    }
  }

  // Get value
  async get<T = any>(key: string, prefix?: string): Promise<T | null> {
    if (!this.client) return null;

    try {
      const cacheKey = this.generateKey(key, prefix);
      const value = await this.client.get(cacheKey);
      
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('❌ Redis GET error:', error);
      return null;
    }
  }

  // Delete key
  async del(key: string, prefix?: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const cacheKey = this.generateKey(key, prefix);
      await this.client.del(cacheKey);
      return true;
    } catch (error) {
      console.error('❌ Redis DEL error:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key: string, prefix?: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const cacheKey = this.generateKey(key, prefix);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis EXISTS error:', error);
      return false;
    }
  }

  // Increment counter
  async incr(key: string, prefix?: string): Promise<number | null> {
    if (!this.client) return null;

    try {
      const cacheKey = this.generateKey(key, prefix);
      return await this.client.incr(cacheKey);
    } catch (error) {
      console.error('❌ Redis INCR error:', error);
      return null;
    }
  }

  // Set with expiration using SETEX
  async setWithExpiry(
    key: string, 
    value: any, 
    seconds: number, 
    prefix?: string
  ): Promise<boolean> {
    if (!this.client) return false;

    try {
      const cacheKey = this.generateKey(key, prefix);
      const serializedValue = JSON.stringify(value);
      const result = await this.client.setex(cacheKey, seconds, serializedValue);
      return result === 'OK';
    } catch (error) {
      console.error('❌ Redis SETEX error:', error);
      return false;
    }
  }

  // Get TTL
  async getTTL(key: string, prefix?: string): Promise<number | null> {
    if (!this.client) return null;

    try {
      const cacheKey = this.generateKey(key, prefix);
      return await this.client.ttl(cacheKey);
    } catch (error) {
      console.error('❌ Redis TTL error:', error);
      return null;
    }
  }

  // Clear all keys with prefix
  async clearPrefix(prefix: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const pattern = this.generateKey('*', prefix);
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Redis CLEAR PREFIX error:', error);
      return false;
    }
  }
}

// ========================================
// FALLBACK STORE (In-Memory)
// ========================================

interface MemoryStoreItem {
  value: any;
  expiry: number;
}

class MemoryStore {
  private store = new Map<string, MemoryStoreItem>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(key: string, value: any, ttlSeconds: number = 3600): boolean {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.store.set(key, { value, expiry });
    return true;
  }

  get<T = any>(key: string): T | null {
    const item = this.store.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  del(key: string): boolean {
    return this.store.delete(key);
  }

  exists(key: string): boolean {
    const item = this.store.get(key);
    
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiry) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// ========================================
// UNIFIED CACHE INTERFACE
// ========================================

export class CacheManager {
  private redisCache: RedisCache;
  private memoryStore: MemoryStore;
  private useRedis: boolean;

  constructor() {
    this.redisCache = new RedisCache();
    this.memoryStore = new MemoryStore();
    this.useRedis = this.redisCache.isAvailable();
    
    console.log(`🗃️ Cache Manager initialized with ${this.useRedis ? 'Redis' : 'Memory'} backend`);
  }

  async set(key: string, value: any, ttlSeconds: number = 3600, prefix?: string): Promise<boolean> {
    if (this.useRedis) {
      return await this.redisCache.set(key, value, { ttl: ttlSeconds, prefix });
    } else {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      return this.memoryStore.set(fullKey, value, ttlSeconds);
    }
  }

  async get<T = any>(key: string, prefix?: string): Promise<T | null> {
    if (this.useRedis) {
      return await this.redisCache.get<T>(key, prefix);
    } else {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      return this.memoryStore.get<T>(fullKey);
    }
  }

  async del(key: string, prefix?: string): Promise<boolean> {
    if (this.useRedis) {
      return await this.redisCache.del(key, prefix);
    } else {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      return this.memoryStore.del(fullKey);
    }
  }

  async exists(key: string, prefix?: string): Promise<boolean> {
    if (this.useRedis) {
      return await this.redisCache.exists(key, prefix);
    } else {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      return this.memoryStore.exists(fullKey);
    }
  }

  async incr(key: string, prefix?: string): Promise<number | null> {
    if (this.useRedis) {
      return await this.redisCache.incr(key, prefix);
    } else {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const current = this.memoryStore.get<number>(fullKey) || 0;
      const newValue = current + 1;
      this.memoryStore.set(fullKey, newValue, 3600); // Default 1 hour TTL
      return newValue;
    }
  }

  async setWithExpiry(key: string, value: any, ttlSeconds: number, prefix?: string): Promise<boolean> {
    if (this.useRedis) {
      return await this.redisCache.setWithExpiry(key, value, ttlSeconds, prefix);
    } else {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      return this.memoryStore.set(fullKey, value, ttlSeconds);
    }
  }

  isUsingRedis(): boolean {
    return this.useRedis;
  }
}

// ========================================
// EXPORTS
// ========================================

// Export singleton instance
export const cacheManager = new CacheManager();

// Export Redis client getter
// (Removed duplicate export to avoid redeclaration error)

// Clean up on process exit
if (isServer) {
  process.on('beforeExit', () => {
    if (redisClient) {
      redisClient.disconnect();
    }
  });
}