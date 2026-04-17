/**
 * Database initialization
 */

import { Pool } from 'pg';
import { Logger } from 'pino';

export async function initializeDatabase(pool: Pool, logger: Logger): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_levels (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) UNIQUE NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        reserved INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_levels(product_id);

      CREATE TABLE IF NOT EXISTS reservations (
        id VARCHAR(255) PRIMARY KEY,
        inventory_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        order_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        confirmed_at TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES inventory_levels(id)
      );

      CREATE INDEX IF NOT EXISTS idx_reservations_order ON reservations(order_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_product ON reservations(product_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
      CREATE INDEX IF NOT EXISTS idx_reservations_expires ON reservations(expires_at);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Database initialization failed');
    throw error;
  }
}
