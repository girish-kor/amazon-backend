/**
 * Express middleware utilities
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  requestId: string;
  traceId: string;
}

/**
 * Middleware to add request ID and trace ID to all requests
 */
export function requestIdMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.traceId = req.headers['x-trace-id'] as string || req.headers['x-request-id'] as string || uuidv4();
  next();
}

/**
 * Middleware to validate JWT and set userId
 */
export function authMiddleware(
  _req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  // Stub: implement JWT validation in actual services
  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: err.message,
      code: (err as any).code || 'INTERNAL_SERVER_ERROR',
    },
  });
}
