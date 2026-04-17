/**
 * API Gateway router with service routing
 */

import { Router as ExpressRouter, Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { SERVICES, ROUTES, RATE_LIMIT_CONFIG } from '../config/gateway';
import { ServiceProxy } from '../infrastructure/service-proxy';
import { RateLimiter } from '../infrastructure/rate-limiter';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../application/jwt';

export class Router {
  private router: ExpressRouter = ExpressRouter();
  private proxies: Map<string, ServiceProxy> = new Map();
  private rateLimiter: RateLimiter;

  constructor(private logger: Logger) {
    this.rateLimiter = new RateLimiter(RATE_LIMIT_CONFIG.windowMs, RATE_LIMIT_CONFIG.maxRequests);

    // Initialize service proxies
    Object.entries(SERVICES).forEach(([key, config]) => {
      this.proxies.set(key, new ServiceProxy(config.url, config.circuitBreakerThreshold, config.retries, config.timeout));
    });

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Rate limiting middleware
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || 'unknown';
      if (!this.rateLimiter.isAllowed(ip)) {
        const remaining = this.rateLimiter.getRemainingTime(ip);
        res.status(429).json({
          error: {
            message: 'Too many requests',
            code: 'RATE_LIMITED',
            retryAfter: remaining,
          },
        });
        return;
      }
      next();
    });

    // Auth routes (no authentication required for registration/login)
    this.router.post('/auth/register', (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'auth', '/auth/register'),
    );
    this.router.post('/auth/login', (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'auth', '/auth/login'),
    );
    this.router.post('/auth/refresh', (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'auth', '/auth/refresh'),
    );
    this.router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'auth', '/auth/me'),
    );

    // Catalog routes (optional authentication)
    this.router.get('/products', optionalAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'catalog', '/products'),
    );
    this.router.get('/products/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'catalog', `/products/${req.params.id}`),
    );
    this.router.post('/products', requireAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'catalog', '/products'),
    );

    // Search routes
    this.router.get('/search', optionalAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'search', `/search?${new URLSearchParams(req.query as any).toString()}`),
    );

    // Cart routes (requires authentication)
    this.router.get('/cart', requireAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'cart', '/cart'),
    );
    this.router.post('/cart/items', requireAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'cart', '/cart/items'),
    );
    this.router.post('/cart/checkout', requireAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'cart', '/cart/checkout'),
    );

    // Order routes (requires authentication)
    this.router.get('/orders', requireAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'order', `/orders?${new URLSearchParams(req.query as any).toString()}`),
    );
    this.router.get('/orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) =>
      this.proxyRequest(req, res, 'order', `/orders/${req.params.id}`),
    );

    // Gateway status routes
    this.router.get('/status', (_req: Request, res: Response) => {
      const status: any = {
        gateway: 'ok',
        services: {},
      };

      Object.entries(SERVICES).forEach(([key, _config]) => {
        const proxy = this.proxies.get(key);
        status.services[key] = {
          circuitBreaker: proxy?.getCircuitBreakerState() || 'unknown',
        };
      });

      res.status(200).json(status);
    });
  }

  private async proxyRequest(
    req: AuthenticatedRequest,
    res: Response,
    service: string,
    path: string,
  ): Promise<void> {
    try {
      const proxy = this.proxies.get(service);
      if (!proxy) {
        res.status(503).json({
          error: {
            message: `Service ${service} not configured`,
            code: 'SERVICE_NOT_FOUND',
          },
        });
        return;
      }

      const headers = this.buildHeaders(req);
      const response = await this.callService(proxy, req.method, path, req.body, headers);

      res.status(response.status).set(response.headers).send(response.data);
    } catch (error) {
      this.logger.error(
        {
          error: (error as any).message,
          service,
          path,
          requestId: req.requestId,
        },
        'Service proxy error',
      );

      res.status(503).json({
        error: {
          message: 'Service unavailable',
          code: 'SERVICE_UNAVAILABLE',
        },
      });
    }
  }

  private buildHeaders(req: AuthenticatedRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'x-request-id': req.requestId,
      'x-trace-id': req.traceId,
    };

    if (req.user) {
      headers['x-user-id'] = req.user.userId;
    }

    return headers;
  }

  private async callService(
    proxy: ServiceProxy,
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const methodLower = method.toLowerCase();

    if (methodLower === 'get') {
      return proxy.get(path, headers);
    } else if (methodLower === 'post') {
      return proxy.post(path, body, headers);
    } else if (methodLower === 'put') {
      return proxy.put(path, body, headers);
    } else if (methodLower === 'delete') {
      return proxy.delete(path, headers);
    } else {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  getRouter(): ExpressRouter {
    return this.router;
  }
}
