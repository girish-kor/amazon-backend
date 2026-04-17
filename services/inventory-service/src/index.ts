import express, { Express, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import helmet from 'helmet';
import { createLogger } from '@shared/logger';
import { requestIdMiddleware, errorHandler } from '@shared/middleware';
import { createInventoryRoutes, AuthenticatedRequest } from './http/routes';
import { InventoryService } from './application/inventory.service';
import { PostgresInventoryRepository } from './infrastructure/postgres-inventory-repository';
import { initializeDatabase } from './infrastructure/database';

const logger = createLogger('inventory-service');
const app: Express = express();
const port = process.env.INVENTORY_SERVICE_PORT || 3003;

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
    service: 'inventory-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      ready: true,
      service: 'inventory-service',
    });
  } catch {
    res.status(503).json({
      ready: false,
      service: 'inventory-service',
    });
  }
});

// Initialize services
const inventoryRepository = new PostgresInventoryRepository(pool);
const inventoryService = new InventoryService(inventoryRepository);

// Routes
app.use('/inventory', createInventoryRoutes(inventoryService, logger));

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

// Background job: Release expired reservations every minute
setInterval(async () => {
  try {
    const count = await inventoryService.releaseExpired();
    if (count > 0) {
      logger.info({ count }, 'Released expired reservations');
    }
  } catch (error) {
    logger.error({ error }, 'Error releasing expired reservations');
  }
}, 60000);

// Start server
const server = app.listen(port, async () => {
  try {
    await initializeDatabase(pool, logger);
    logger.info({ port }, 'Inventory Service listening');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize inventory service');
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
