/**
 * Catalog service routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { CatalogService } from '../application/catalog.service';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  requestId: string;
  traceId: string;
}

export function createCatalogRoutes(catalogService: CatalogService, logger: Logger): Router {
  const router = Router();

  /**
   * GET /products - List products
   */
  router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filter = {
        categoryId: req.query.categoryId as string | undefined,
        inStock: req.query.inStock === 'true',
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await catalogService.getProducts(filter);

      res.status(200).json({
        items: result.items,
        total: result.total,
        page: filter.page,
        limit: filter.limit,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /products/:id - Get product by ID
   */
  router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await catalogService.getProduct(req.params.id);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /products - Create product (requires auth)
   */
  router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const product = await catalogService.createProduct(req.body);

      logger.info(
        {
          productId: product.id,
          sku: product.sku,
          requestId: req.requestId,
        },
        'Product created',
      );

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /products/:id - Update product (requires auth)
   */
  router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const product = await catalogService.updateProduct(req.params.id, req.body);

      logger.info(
        {
          productId: product.id,
          requestId: req.requestId,
        },
        'Product updated',
      );

      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /products/:id - Delete product (requires auth)
   */
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      await catalogService.deleteProduct(req.params.id);

      logger.info(
        {
          productId: req.params.id,
          requestId: req.requestId,
        },
        'Product deleted',
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
