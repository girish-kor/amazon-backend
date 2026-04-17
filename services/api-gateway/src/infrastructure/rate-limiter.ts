/**
 * Simple rate limiter (per-IP)
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const entry = this.store[ip];

    if (!entry || now > entry.resetTime) {
      this.store[ip] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return true;
    }

    if (entry.count < this.maxRequests) {
      entry.count++;
      return true;
    }

    return false;
  }

  getRemainingTime(ip: string): number {
    const entry = this.store[ip];
    if (!entry) {
      return this.windowMs;
    }
    return Math.max(0, entry.resetTime - Date.now());
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((ip) => {
      if (now > this.store[ip].resetTime) {
        delete this.store[ip];
      }
    });
  }
}
