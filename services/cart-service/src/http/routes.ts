/**
 * Cart service routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { CartService } from '../application/cart.service';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  requestId: string;
  traceId: string;
}

export function createCartRoutes(cartService: CartService, logger: Logger): Router {
  const router = Router();

  /**
   * GET /cart - Get user's cart
   */
  router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const cart = await cartService.getCart(req.user.userId);
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /cart/items - Add item to cart
   */
  router.post('/items', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const { productId, quantity, price } = req.body;
      const cart = await cartService.addItem(req.user.userId, productId, quantity, price);

      logger.info(
        {
          userId: req.user.userId,
          productId,
          quantity,
          requestId: req.requestId,
        },
        'Item added to cart',
      );

      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /cart/items/:productId - Update item quantity
   */
  router.put('/items/:productId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const { quantity } = req.body;
      const cart = await cartService.updateItem(req.user.userId, req.params.productId, quantity);

      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /cart/items/:productId - Remove item from cart
   */
  router.delete('/items/:productId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const cart = await cartService.removeItem(req.user.userId, req.params.productId);
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /cart/checkout - Checkout cart
   */
  router.post('/checkout', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const checkout = await cartService.checkout(req.user.userId, req.body.shippingAddress);

      logger.info(
        {
          userId: req.user.userId,
          itemCount: checkout.items.length,
          total: checkout.total,
          requestId: req.requestId,
        },
        'Cart checked out',
      );

      res.status(200).json(checkout);
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /cart - Clear cart
   */
  router.delete('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      await cartService.clearCart(req.user.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
