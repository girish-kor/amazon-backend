/**
 * Order service routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { OrderService } from '../application/order.service';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  requestId: string;
  traceId: string;
}

export function createOrderRoutes(orderService: OrderService, logger: Logger): Router {
  const router = Router();

  /**
   * GET /orders - List user's orders
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

      const orders = await orderService.getOrders(req.user.userId);
      res.status(200).json({ orders });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /orders/:id - Get order by ID
   */
  router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const order = await orderService.getOrder(req.params.id);

      // Verify order belongs to user
      if (order.userId !== req.user.userId) {
        res.status(403).json({
          error: {
            message: 'Forbidden',
            code: 'FORBIDDEN',
          },
        });
        return;
      }

      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /orders - Create order
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

      const request = {
        ...req.body,
        userId: req.user.userId,
      };

      const order = await orderService.createOrder(request);

      logger.info(
        {
          orderId: order.id,
          userId: req.user.userId,
          itemCount: order.items.length,
          total: order.total,
          requestId: req.requestId,
        },
        'Order created',
      );

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /orders/:id/cancel - Cancel order
   */
  router.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

      const order = await orderService.getOrder(req.params.id);

      // Verify order belongs to user
      if (order.userId !== req.user.userId) {
        res.status(403).json({
          error: {
            message: 'Forbidden',
            code: 'FORBIDDEN',
          },
        });
        return;
      }

      const updated = await orderService.cancelOrder(req.params.id);

      logger.info(
        {
          orderId: req.params.id,
          userId: req.user.userId,
          requestId: req.requestId,
        },
        'Order cancelled',
      );

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
