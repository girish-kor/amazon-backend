import express, { Express, Request, Response, NextFunction } from 'express';
import { MongoClient } from 'mongodb';
import helmet from 'helmet';
import { createLogger } from '@shared/logger';
import { requestIdMiddleware, errorHandler } from '@shared/middleware';
import { createCatalogRoutes, AuthenticatedRequest } from './http/routes';
import { CatalogService } from './application/catalog.service';
import { MongoProductRepository } from './infrastructure/mongo-product-repository';
import { connectMongoDB } from './infrastructure/mongo-connection';

const logger = createLogger('catalog-service');
const app: Express = express();
const port = process.env.CATALOG_SERVICE_PORT || 3002;

let mongoClient: MongoClient;

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
    service: 'catalog-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req, res) => {
  const ready = mongoClient && mongoClient.topology?.isConnected();
  res.status(ready ? 200 : 503).json({
    ready: !!ready,
    service: 'catalog-service',
  });
});

// Middleware for optional JWT validation
app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      // Extract user info from token (without verification for simplicity)
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
let catalogService: CatalogService;

// Routes
app.get('/products', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!catalogService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCatalogRoutes(catalogService, logger);
  router(req, res, next);
});

app.get('/products/:id', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!catalogService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCatalogRoutes(catalogService, logger);
  router(req, res, next);
});

app.post('/products', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!catalogService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCatalogRoutes(catalogService, logger);
  router(req, res, next);
});

app.put('/products/:id', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!catalogService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCatalogRoutes(catalogService, logger);
  router(req, res, next);
});

app.delete('/products/:id', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!catalogService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createCatalogRoutes(catalogService, logger);
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
    const { client, db } = await connectMongoDB(logger);
    mongoClient = client;

    const productRepository = new MongoProductRepository(db);
    catalogService = new CatalogService(productRepository);

    logger.info({ port }, 'Catalog Service listening');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize catalog service');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    if (mongoClient) {
      await mongoClient.close();
    }
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app };
