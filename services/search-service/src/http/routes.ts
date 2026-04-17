/**
 * Search service routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { SearchService } from '../application/search.service';

export interface AuthenticatedRequest extends Request {
  requestId: string;
  traceId: string;
}

export function createSearchRoutes(searchService: SearchService, logger: Logger): Router {
  const router = Router();

  /**
   * GET /search - Search products
   */
  router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = {
        q: req.query.q as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await searchService.search(query);

      logger.info(
        {
          query: query.q,
          results: result.total,
          requestId: req.requestId,
        },
        'Search performed',
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
