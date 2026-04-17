/**
 * PostgreSQL payment repository implementation
 */

import { Pool } from 'pg';
import { Payment, CreatePaymentRequest, RefundRequest } from '../domain/payment';
import { IPaymentRepository } from '../domain/payment-repository';

export class PostgresPaymentRepository implements IPaymentRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Payment | null> {
    const result = await this.pool.query(
      `SELECT id, order_id as "orderId", user_id as "userId", amount, currency, status, 
              stripe_payment_intent_id as "stripePaymentIntentId",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM payments WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const result = await this.pool.query(
      `SELECT id, order_id as "orderId", user_id as "userId", amount, currency, status,
              stripe_payment_intent_id as "stripePaymentIntentId",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM payments WHERE order_id = $1`,
      [orderId],
    );
    return result.rows[0] || null;
  }

  async create(request: CreatePaymentRequest): Promise<Payment> {
    const id = this.generateId();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO payments (id, order_id, user_id, amount, currency, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
       RETURNING id, order_id as "orderId", user_id as "userId", amount, currency, status,
                 stripe_payment_intent_id as "stripePaymentIntentId",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [id, request.orderId, request.userId, request.amount, request.currency, now, now],
    );

    return result.rows[0];
  }

  async update(id: string, payment: Partial<Payment>): Promise<Payment> {
    const updateFields: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (payment.status) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(payment.status);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `UPDATE payments SET ${updateFields.join(', ')} WHERE id = $1
                   RETURNING id, order_id as "orderId", user_id as "userId", amount, currency, status,
                             stripe_payment_intent_id as "stripePaymentIntentId",
                             created_at as "createdAt", updated_at as "updatedAt"`;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async refund(request: RefundRequest): Promise<Payment> {
    const payment = await this.findById(request.paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    return this.update(request.paymentId, {
      status: 'refunded',
    });
  }

  private generateId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
