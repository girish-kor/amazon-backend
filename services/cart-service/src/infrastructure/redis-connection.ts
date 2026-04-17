/**
 * Redis connection
 */

import Redis from 'ioredis';
import { Logger } from 'pino';

export async function connectRedis(logger: Logger): Promise<Redis> {
  const url = process.env.REDIS_URI || 'redis://localhost:6379';

  try {
    const redis = new Redis(url);

    redis.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redis.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });

    // Test connection
    await redis.ping();

    return redis;
  } catch (error) {
    logger.error({ error, url }, 'Failed to connect to Redis');
    throw error;
  }
}
