/**
 * PostgreSQL inventory repository implementation
 */

import { Pool } from 'pg';
import { InventoryLevel, Reservation, ReservationRequest } from '../domain/inventory';
import { IInventoryRepository } from '../domain/inventory-repository';

export class PostgresInventoryRepository implements IInventoryRepository {
  constructor(private pool: Pool) {}

  async getLevel(productId: string): Promise<InventoryLevel | null> {
    const result = await this.pool.query(
      `SELECT id, product_id as "productId", quantity, reserved, 
              (quantity - reserved) as available, 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM inventory_levels 
       WHERE product_id = $1`,
      [productId],
    );
    return result.rows[0] || null;
  }

  async createLevel(productId: string, quantity: number): Promise<InventoryLevel> {
    const id = this.generateId();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO inventory_levels (id, product_id, quantity, reserved, created_at, updated_at)
       VALUES ($1, $2, $3, 0, $4, $5)
       RETURNING id, product_id as "productId", quantity, reserved,
                 (quantity - reserved) as available,
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [id, productId, quantity, now, now],
    );

    return result.rows[0];
  }

  async updateLevel(productId: string, quantity: number): Promise<InventoryLevel> {
    const result = await this.pool.query(
      `UPDATE inventory_levels 
       SET quantity = quantity + $1, updated_at = NOW()
       WHERE product_id = $2
       RETURNING id, product_id as "productId", quantity, reserved,
                 (quantity - reserved) as available,
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [quantity, productId],
    );

    if (result.rows.length === 0) {
      // Create if doesn't exist
      return this.createLevel(productId, Math.max(0, quantity));
    }

    return result.rows[0];
  }

  async reserve(request: ReservationRequest): Promise<Reservation> {
    const id = this.generateId();
    const now = new Date();
    const expiryMinutes = request.expiryMinutes || 15;
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);

    const result = await this.pool.query(
      `INSERT INTO reservations (id, inventory_id, product_id, quantity, order_id, status, created_at, expires_at)
       SELECT $1, il.id, $2, $3, $4, 'pending', $5, $6
       FROM inventory_levels il
       WHERE il.product_id = $2 AND (il.quantity - il.reserved) >= $3
       RETURNING id, inventory_id as "inventoryId", product_id as "productId", quantity, 
                 order_id as "orderId", status, created_at as "createdAt", expires_at as "expiresAt"`,
      [id, request.productId, request.quantity, request.orderId, now, expiresAt],
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create reservation - insufficient inventory');
    }

    // Update reserved count
    await this.pool.query(
      `UPDATE inventory_levels SET reserved = reserved + $1 WHERE product_id = $2`,
      [request.quantity, request.productId],
    );

    return result.rows[0];
  }

  async getReservation(reservationId: string): Promise<Reservation | null> {
    const result = await this.pool.query(
      `SELECT id, inventory_id as "inventoryId", product_id as "productId", quantity,
              order_id as "orderId", status, created_at as "createdAt", expires_at as "expiresAt",
              confirmed_at as "confirmedAt"
       FROM reservations 
       WHERE id = $1`,
      [reservationId],
    );
    return result.rows[0] || null;
  }

  async confirmReservation(reservationId: string): Promise<Reservation> {
    const result = await this.pool.query(
      `UPDATE reservations 
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE id = $1
       RETURNING id, inventory_id as "inventoryId", product_id as "productId", quantity,
                 order_id as "orderId", status, created_at as "createdAt", expires_at as "expiresAt",
                 confirmed_at as "confirmedAt"`,
      [reservationId],
    );

    return result.rows[0];
  }

  async cancelReservation(reservationId: string): Promise<void> {
    // Get reservation first to find inventory
    const res = await this.pool.query(
      `SELECT product_id as "productId", quantity FROM reservations WHERE id = $1`,
      [reservationId],
    );

    if (res.rows.length > 0) {
      const { productId, quantity } = res.rows[0];
      // Release reserved quantity
      await this.pool.query(
        `UPDATE inventory_levels SET reserved = reserved - $1 WHERE product_id = $2`,
        [quantity, productId],
      );
    }

    // Update reservation status
    await this.pool.query(
      `UPDATE reservations SET status = 'cancelled' WHERE id = $1`,
      [reservationId],
    );
  }

  async releaseExpiredReservations(): Promise<number> {
    const result = await this.pool.query(
      `SELECT id, product_id as "productId", quantity 
       FROM reservations 
       WHERE status = 'pending' AND expires_at < NOW()`,
    );

    for (const row of result.rows) {
      await this.pool.query(
        `UPDATE inventory_levels SET reserved = reserved - $1 WHERE product_id = $2`,
        [row.quantity, row.productId],
      );

      await this.pool.query(
        `UPDATE reservations SET status = 'cancelled' WHERE id = $1`,
        [row.id],
      );
    }

    return result.rows.length;
  }

  private generateId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
