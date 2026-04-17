/**
 * PostgreSQL order repository implementation
 */

import { Pool } from 'pg';
import { Order, CreateOrderRequest } from '../domain/order';
import { IOrderRepository } from '../domain/order-repository';

export class PostgresOrderRepository implements IOrderRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Order | null> {
    const result = await this.pool.query(
      `SELECT id, user_id as "userId", items, total, status, 
              shipping_address as "shippingAddress",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM orders WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const result = await this.pool.query(
      `SELECT id, user_id as "userId", items, total, status,
              shipping_address as "shippingAddress",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows;
  }

  async create(request: CreateOrderRequest): Promise<Order> {
    const id = this.generateId();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO orders (id, user_id, items, total, status, shipping_address, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
       RETURNING id, user_id as "userId", items, total, status,
                 shipping_address as "shippingAddress",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [id, request.userId, JSON.stringify(request.items), request.total, JSON.stringify(request.shippingAddress), now, now],
    );

    return result.rows[0];
  }

  async update(id: string, order: Partial<Order>): Promise<Order> {
    const updateFields: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (order.status) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(order.status);
    }
    if (order.items) {
      updateFields.push(`items = $${paramIndex++}`);
      values.push(JSON.stringify(order.items));
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $1 
                   RETURNING id, user_id as "userId", items, total, status,
                             shipping_address as "shippingAddress",
                             created_at as "createdAt", updated_at as "updatedAt"`;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  private generateId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
