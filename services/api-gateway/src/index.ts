import express, { Express } from 'express';
import helmet from 'helmet';
import { createLogger } from '@shared/logger';
import { requestIdMiddleware, errorHandler } from '@shared/middleware';
import { Router } from './http/router';

const app: Express = express();
const logger = createLogger('api-gateway');
const port = process.env.API_GATEWAY_PORT || 3000;

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
      traceId: (req as any).traceId,
    },
    'Incoming request',
  );
  next();
});

// Health checks
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req, res) => {
  res.status(200).json({
    ready: true,
    service: 'api-gateway',
  });
});

// Routes
const router = new Router(logger);
app.use('/api', router.getRouter());

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
const server = app.listen(port, () => {
  logger.info({ port }, 'API Gateway listening');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app };
