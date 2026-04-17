import express, { Express, Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import helmet from 'helmet';
import { createLogger } from '@shared/logger';
import { requestIdMiddleware, errorHandler } from '@shared/middleware';
import { createCartRoutes, AuthenticatedRequest } from './http/routes';
import { CartService } from './application/cart.service';
import { RedisCartRepository } from './infrastructure/redis-cart-repository';
import { connectRedis } from './infrastructure/redis-connection';

const logger = createLogger('cart-service');
const app: Express = express();
const port = process.env.CART_SERVICE_PORT || 3004;

let redis: Redis;

// Security middleware
app.use(helmet());

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request tracking
app.use(requestIdMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.info(
    {
      method: req.method,
      path: req.path,
      requestId: (req as any).requestId,
    },
    'Incoming request',
  );
  next();
});

// Health checks
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cart-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await redis.ping();
    res.status(200).json({
      ready: true,
      service: 'cart-service',
    });
  } catch {
    res.status(503).json({
      ready: false,
      service: 'cart-service',
    });
  }
});

// Middleware for JWT validation
app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      req.user = {
        userId: payload.userId,
        email: payload.email,
      };
    } catch (error) {
      logger.debug({ error: (error as any).message }, 'Invalid token in request');
    }
  }
  next();
});

// Initialize services
let cartService: CartService;

// Routes
app.get('/cart', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!cartService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCartRoutes(cartService, logger);
  router(req, res, next);
});

app.post('/cart/items', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!cartService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCartRoutes(cartService, logger);
  router(req, res, next);
});

app.put('/cart/items/:productId', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!cartService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCartRoutes(cartService, logger);
  router(req, res, next);
});

app.delete('/cart/items/:productId', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!cartService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCartRoutes(cartService, logger);
  router(req, res, next);
});

app.post('/cart/checkout', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!cartService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCartRoutes(cartService, logger);
  router(req, res, next);
});

app.delete('/cart', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!cartService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCartRoutes(cartService, logger);
  router(req, res, next);
});

// Fallback 404
app.use((_req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      code: 'NOT_FOUND',
    },
  });
});

// Error handling
app.use(errorHandler);

// Start server
const server = app.listen(port, async () => {
  try {
    redis = await connectRedis(logger);

    const cartRepository = new RedisCartRepository(redis);
    cartService = new CartService(cartRepository);

    logger.info({ port }, 'Cart Service listening');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize cart service');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    if (redis) {
      await redis.quit();
    }
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app };
