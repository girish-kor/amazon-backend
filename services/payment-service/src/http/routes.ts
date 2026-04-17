/**
 * Payment service routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { PaymentService } from '../application/payment.service';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  requestId: string;
  traceId: string;
}

export function createPaymentRoutes(paymentService: PaymentService, logger: Logger): Router {
  const router = Router();

  /**
   * GET /payments/:id - Get payment
   */
  router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payment = await paymentService.getPayment(req.params.id);
      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /payments - Create payment
   */
  router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payment = await paymentService.createPayment(req.body);

      logger.info(
        {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          requestId: req.requestId,
        },
        'Payment created',
      );

      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /payments/:id/process - Process payment
   */
  router.post('/:id/process', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const payment = await paymentService.processPayment(req.params.id);

      logger.info(
        {
          paymentId: payment.id,
          status: payment.status,
          requestId: req.requestId,
        },
        'Payment processed',
      );

      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /payments/:id/refund - Refund payment
   */
  router.post('/:id/refund', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const refund = {
        paymentId: req.params.id,
        ...req.body,
      };

      const payment = await paymentService.refundPayment(refund);

      logger.info(
        {
          paymentId: payment.id,
          status: payment.status,
          requestId: req.requestId,
        },
        'Payment refunded',
      );

      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
