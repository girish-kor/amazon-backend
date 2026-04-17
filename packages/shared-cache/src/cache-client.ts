/**
 * Shared caching utility
 */

import Redis, { RedisOptions } from 'ioredis';
import { Logger } from 'pino';

export class CacheClient {
  private redis: Redis;
  private logger: Logger;

  constructor(url: string, logger: Logger) {
    this.logger = logger;
    const options: RedisOptions = {
      lazyConnect: true,
      enableOfflineQueue: false,
    };

    this.redis = new Redis(url, options);

    this.redis.on('error', (error) => {
      logger.error({ error }, 'Redis error');
    });

    this.redis.on('connect', () => {
      logger.info('Cache connected');
    });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn({ key, error }, 'Cache get failed');
      return null; // Degrade gracefully
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.warn({ key, error }, 'Cache set failed');
      // Degrade gracefully - cache failure should not break requests
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached) {
      this.logger.debug({ key }, 'Cache hit');
      return cached;
    }

    this.logger.debug({ key }, 'Cache miss');

    // Fetch from source
    const value = await fetcher();

    // Store in cache (non-blocking)
    this.set(key, value, ttlSeconds).catch((error) => {
      this.logger.warn({ key, error }, 'Failed to set cache after miss');
    });

    return value;
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn({ key, error }, 'Cache delete failed');
    }
  }

  /**
   * Delete pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn({ pattern, error }, 'Cache pattern delete failed');
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

// Cache key namespace helper
export function cacheKey(...parts: string[]): string {
  return parts.join(':');
}
