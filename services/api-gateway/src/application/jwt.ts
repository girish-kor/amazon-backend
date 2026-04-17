/**
 * JWT validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';

export interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  requestId: string;
  traceId: string;
}

/**
 * Extract JWT from Authorization header
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Validate JWT token (stub - actual validation done via JWKS in production)
 */
export function validateJWT(token: string): JWTPayload {
  try {
    // Stub implementation - in production, verify signature using JWKS endpoint
    // For now, accept any token format for testing
    if (!token || token.split('.').length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode payload (without signature verification)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    if (payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }

    return payload as JWTPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: {
        message: 'Authorization header required',
        code: 'MISSING_AUTH',
      },
    });
    return;
  }

  try {
    req.user = validateJWT(token);
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        message: (error as any).message || 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    });
  }
}

/**
 * Middleware to optionally check authentication
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (token) {
    try {
      req.user = validateJWT(token);
    } catch {
      // Ignore auth errors for optional auth
    }
  }

  next();
}
