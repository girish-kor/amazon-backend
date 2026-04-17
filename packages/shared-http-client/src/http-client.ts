/**
 * Shared HTTP client with retry, timeout, and circuit breaker
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import CircuitBreaker from 'opossum';
import { Logger } from 'pino';

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class HttpClient {
  private client: AxiosInstance;
  private circuitBreakers: Map<string, CircuitBreaker<any>>;
  private logger: Logger;
  private retryConfig: RetryConfig;
  private cbConfig: CircuitBreakerConfig;

  constructor(
    logger: Logger,
    retryConfig?: Partial<RetryConfig>,
    cbConfig?: Partial<CircuitBreakerConfig>,
  ) {
    this.logger = logger;
    this.circuitBreakers = new Map();

    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      backoffMs: retryConfig?.backoffMs ?? 100,
    };

    this.cbConfig = {
      failureThreshold: cbConfig?.failureThreshold ?? 5,
      timeout: cbConfig?.timeout ?? 30000,
      resetTimeout: cbConfig?.resetTimeout ?? 30000,
    };

    this.client = axios.create({
      timeout: 3000,
      validateStatus: () => true,
    });
  }

  private getCircuitBreaker(key: string): CircuitBreaker<any> {
    if (!this.circuitBreakers.has(key)) {
      const breaker = new CircuitBreaker(
        async (fn: () => Promise<any>) => fn(),
        {
          rollingCountBuckets: 10,
          rollingCountTimeout: 10000,
          name: key,
          volumeThreshold: this.cbConfig.failureThreshold,
          errorThresholdPercentage: 50,
          resetTimeout: this.cbConfig.resetTimeout,
        },
      );

      breaker.fallback(() => {
        throw new Error(`Circuit breaker open for ${key}`);
      });

      breaker.on('open', () => {
        this.logger.warn({ service: key }, 'Circuit breaker opened');
      });

      breaker.on('halfOpen', () => {
        this.logger.info({ service: key }, 'Circuit breaker half-open');
      });

      this.circuitBreakers.set(key, breaker);
    }

    return this.circuitBreakers.get(key)!;
  }

  async request<T>(
    method: string,
    url: string,
    config?: AxiosRequestConfig,
    serviceKey?: string,
  ): Promise<T> {
    const key = serviceKey || url.split('/')[2]; // Extract host as key

    const breaker = this.getCircuitBreaker(key);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await breaker.fire(async () => {
          const response = await this.client.request<T>({
            method,
            url,
            ...config,
          });

          if (response.status >= 400) {
            const error = new Error(`HTTP ${response.status}: ${url}`);
            (error as any).response = response;
            throw error;
          }

          return response.data;
        });

        return result;
      } catch (error) {
        lastError = error as Error;

        this.logger.debug(
          {
            attempt,
            maxRetries: this.retryConfig.maxRetries,
            url,
            error: (error as Error).message,
          },
          'HTTP request failed',
        );

        if (attempt < this.retryConfig.maxRetries) {
          // Exponential backoff with jitter
          const backoff = this.retryConfig.backoffMs * Math.pow(2, attempt);
          const jitter = Math.random() * backoff * 0.1;
          await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
        }
      }
    }

    this.logger.error(
      {
        url,
      error: lastError?.message,
        attempts: this.retryConfig.maxRetries + 1,
      },
      'HTTP request exhausted retries',
    );

    throw lastError || new Error('HTTP request failed');
  }

  async get<T>(url: string, config?: AxiosRequestConfig, serviceKey?: string): Promise<T> {
    return this.request<T>('GET', url, config, serviceKey);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig, serviceKey?: string): Promise<T> {
    return this.request<T>('POST', url, { ...config, data }, serviceKey);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig, serviceKey?: string): Promise<T> {
    return this.request<T>('PUT', url, { ...config, data }, serviceKey);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig, serviceKey?: string): Promise<T> {
    return this.request<T>('DELETE', url, config, serviceKey);
  }
}
