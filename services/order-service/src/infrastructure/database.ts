/**
 * Database initialization
 */

import { Pool } from 'pg';
import { Logger } from 'pino';

export async function initializeDatabase(pool: Pool, logger: Logger): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        items JSONB NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        shipping_address JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Database initialization failed');
    throw error;
  }
}
