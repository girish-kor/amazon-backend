/**
 * Auth service routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { AuthenticationService } from '../application/auth.service';
import { ApplicationError } from '@shared/errors';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  requestId: string;
  traceId: string;
}

export function createAuthRoutes(authService: AuthenticationService, logger: Logger): Router {
  const router = Router();

  /**
   * POST /register
   */
  router.post('/register', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const result = await authService.register(email, password);

      logger.info(
        {
          userId: result.user.id,
          email: result.user.email,
          requestId: req.requestId,
        },
        'User registered',
      );

      res.status(201).json({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /login
   */
  router.post('/login', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      logger.info(
        {
          userId: result.user.id,
          email: result.user.email,
          requestId: req.requestId,
        },
        'User logged in',
      );

      res.status(200).json({
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /refresh
   */
  router.post('/refresh', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: {
            message: 'Refresh token is required',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /me - Get current user profile
   */
  router.get('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
        });
        return;
      }

      const userProfile = await authService.getUserProfile(req.user.userId);

      res.status(200).json(userProfile);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /.well-known/jwks.json - Public keys for JWT verification
   */
  router.get('/.well-known/jwks.json', (_req: AuthenticatedRequest, res: Response) => {
    // In production, return actual public keys
    // For now, return empty JWKS
    res.status(200).json({
      keys: [],
    });
  });

  return router;
}
