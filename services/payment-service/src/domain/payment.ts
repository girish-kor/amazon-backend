/**
 * Payment entity and value objects
 */

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}
