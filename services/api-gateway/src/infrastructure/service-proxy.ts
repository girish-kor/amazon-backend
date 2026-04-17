/**
 * HTTP proxy with retry logic
 */

import { HttpClient } from '@shared/http-client';
import { CircuitBreaker } from './circuit-breaker';

export interface ProxyOptions {
  retries?: number;
  timeout?: number;
}

export class ServiceProxy {
  private httpClient: HttpClient;
  private circuitBreaker: CircuitBreaker;

  constructor(
    private baseURL: string,
    private circuitBreakerThreshold: number = 5,
    private retries: number = 2,
    timeout: number = 5000,
  ) {
    this.httpClient = new HttpClient({
      baseURL,
      timeout,
    });
    this.circuitBreaker = new CircuitBreaker(this.circuitBreakerThreshold);
  }

  async get(path: string, headers?: Record<string, string>) {
    return this.circuitBreaker.execute(() =>
      this.retryRequest(() => this.httpClient.get(path), headers),
    );
  }

  async post(path: string, body: unknown, headers?: Record<string, string>) {
    return this.circuitBreaker.execute(() =>
      this.retryRequest(() => this.httpClient.post(path, body), headers),
    );
  }

  async put(path: string, body: unknown, headers?: Record<string, string>) {
    return this.circuitBreaker.execute(() =>
      this.retryRequest(() => this.httpClient.put(path, body), headers),
    );
  }

  async delete(path: string, headers?: Record<string, string>) {
    return this.circuitBreaker.execute(() =>
      this.retryRequest(() => this.httpClient.delete(path), headers),
    );
  }

  private async retryRequest(
    fn: () => Promise<any>,
    _headers?: Record<string, string>,
    attempt: number = 0,
  ): Promise<any> {
    try {
      return await fn();
    } catch (error) {
      if (attempt < this.retries) {
        await this.delay(Math.pow(2, attempt) * 100); // Exponential backoff
        return this.retryRequest(fn, _headers, attempt + 1);
      }
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }
}
