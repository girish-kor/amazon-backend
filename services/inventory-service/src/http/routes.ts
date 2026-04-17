/**
 * Inventory service routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { InventoryService } from '../application/inventory.service';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  requestId: string;
  traceId: string;
}

export function createInventoryRoutes(inventoryService: InventoryService, logger: Logger): Router {
  const router = Router();

  /**
   * GET /inventory/:productId - Get inventory level
   */
  router.get('/:productId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const level = await inventoryService.getInventory(req.params.productId);
      res.status(200).json(level);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /inventory/reserve - Reserve inventory
   */
  router.post('/reserve', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const reservation = await inventoryService.reserveInventory(req.body);

      logger.info(
        {
          reservationId: reservation.id,
          productId: reservation.productId,
          quantity: reservation.quantity,
          orderId: reservation.orderId,
          requestId: req.requestId,
        },
        'Inventory reserved',
      );

      res.status(201).json(reservation);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /inventory/confirm/:reservationId - Confirm reservation
   */
  router.post('/confirm/:reservationId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const reservation = await inventoryService.confirmReservation(req.params.reservationId);

      logger.info(
        {
          reservationId: reservation.id,
          requestId: req.requestId,
        },
        'Reservation confirmed',
      );

      res.status(200).json(reservation);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /inventory/cancel/:reservationId - Cancel reservation
   */
  router.post('/cancel/:reservationId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await inventoryService.cancelReservation(req.params.reservationId);

      logger.info(
        {
          reservationId: req.params.reservationId,
          requestId: req.requestId,
        },
        'Reservation cancelled',
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
