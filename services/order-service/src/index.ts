import express, { Express, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import helmet from 'helmet';
import { createLogger } from '@shared/logger';
import { requestIdMiddleware, errorHandler } from '@shared/middleware';
import { createOrderRoutes, AuthenticatedRequest } from './http/routes';
import { OrderService } from './application/order.service';
import { PostgresOrderRepository } from './infrastructure/postgres-order-repository';
import { initializeDatabase } from './infrastructure/database';

const logger = createLogger('order-service');
const app: Express = express();
const port = process.env.ORDER_SERVICE_PORT || 3005;

// Database connection
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecommerce',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
});

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
    service: 'order-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      ready: true,
      service: 'order-service',
    });
  } catch {
    res.status(503).json({
      ready: false,
      service: 'order-service',
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
const orderRepository = new PostgresOrderRepository(pool);
const orderService = new OrderService(orderRepository);

// Routes
app.use('/orders', createOrderRoutes(orderService, logger));

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
    await initializeDatabase(pool, logger);
    logger.info({ port }, 'Order Service listening');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize order service');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await pool.end();
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app };
