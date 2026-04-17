/**
 * Payment repository interface
 */

import { Payment, CreatePaymentRequest, RefundRequest } from './payment';

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  create(request: CreatePaymentRequest): Promise<Payment>;
  update(id: string, payment: Partial<Payment>): Promise<Payment>;
  refund(request: RefundRequest): Promise<Payment>;
}
