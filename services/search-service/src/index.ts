import express, { Express, Request, Response, NextFunction } from 'express';
import { Client } from '@elastic/elasticsearch';
import helmet from 'helmet';
import { createLogger } from '@shared/logger';
import { requestIdMiddleware, errorHandler } from '@shared/middleware';
import { createSearchRoutes, AuthenticatedRequest } from './http/routes';
import { SearchService } from './application/search.service';
import { ElasticsearchRepository } from './infrastructure/elasticsearch-repository';
import { connectElasticsearch } from './infrastructure/elasticsearch-connection';

const logger = createLogger('search-service');
const app: Express = express();
const port = process.env.SEARCH_SERVICE_PORT || 3007;

let esClient: Client;

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
    service: 'search-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    if (esClient) {
      await esClient.info();
      res.status(200).json({
        ready: true,
        service: 'search-service',
      });
    } else {
      res.status(503).json({
        ready: false,
        service: 'search-service',
      });
    }
  } catch {
    res.status(503).json({
      ready: false,
      service: 'search-service',
    });
  }
});

// Initialize services
let searchService: SearchService;

// Routes
app.get('/search', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!searchService) {
    res.status(503).json({
      error: {
        message: 'Service not ready',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
    return;
  }
  const router = createSearchRoutes(searchService, logger);
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
    esClient = await connectElasticsearch(logger);

    const searchRepository = new ElasticsearchRepository(esClient);
    searchService = new SearchService(searchRepository);

    logger.info({ port }, 'Search Service listening');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize search service');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    if (esClient) {
      await esClient.close();
    }
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app };
