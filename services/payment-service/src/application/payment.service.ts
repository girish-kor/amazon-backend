/**
 * Payment service business logic
 */

import { Payment, CreatePaymentRequest, RefundRequest } from '../domain/payment';
import { IPaymentRepository } from '../domain/payment-repository';
import { ValidationError, NotFoundError, ConflictError } from '@shared/errors';

export class PaymentService {
  constructor(private paymentRepository: IPaymentRepository) {}

  /**
   * Get payment by ID
   */
  async getPayment(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    return payment;
  }

  /**
   * Create payment
   */
  async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    if (!request.orderId || !request.userId || request.amount <= 0) {
      throw new ValidationError('Order ID, user ID, and amount are required');
    }

    // Check if payment already exists for order
    const existing = await this.paymentRepository.findByOrderId(request.orderId);
    if (existing && existing.status === 'succeeded') {
      throw new ConflictError('Payment already processed for this order');
    }

    return this.paymentRepository.create(request);
  }

  /**
   * Process payment (in production, integrate with Stripe)
   */
  async processPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'pending') {
      throw new ConflictError('Payment already processed');
    }

    // In production, call Stripe API here
    // For demo, simulate successful payment
    return this.paymentRepository.update(paymentId, {
      status: 'succeeded',
      updatedAt: new Date(),
    });
  }

  /**
   * Refund payment
   */
  async refundPayment(request: RefundRequest): Promise<Payment> {
    const payment = await this.paymentRepository.findById(request.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'succeeded') {
      throw new ConflictError('Only succeeded payments can be refunded');
    }

    return this.paymentRepository.refund(request);
  }
}
