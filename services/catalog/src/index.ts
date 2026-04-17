import express, { Express, Request, Response } from 'express';
import { createLogger } from '@shared/logger';

const logger = createLogger('catalog-service');

const app: Express = express();
const port = process.env.CATALOG_SERVICE_PORT || 3002;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    service: 'catalog-service',
    timestamp: new Date().toISOString(),
  });
});

// Ready check endpoint
app.get('/ready', (_req: Request, res: Response): void => {
  res.status(200).json({
    ready: true,
    service: 'catalog-service',
  });
});

// Start server
const server = app.listen(port, () => {
  logger.info({ port }, 'Catalog Service listening');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app };
