/**
 * Redis cache utilities
 */

export interface CacheClient {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Stub implementation - actual Redis client will be implemented per service
export const createCacheClient = async (): Promise<CacheClient> => {
  return {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    clear: async () => {},
  };
};
