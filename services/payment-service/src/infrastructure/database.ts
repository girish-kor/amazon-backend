/**
 * Database initialization
 */

import { Pool } from 'pg';
import { Logger } from 'pino';

export async function initializeDatabase(pool: Pool, logger: Logger): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL UNIQUE,
        user_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        status VARCHAR(50) NOT NULL,
        stripe_payment_intent_id VARCHAR(255),
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Database initialization failed');
    throw error;
  }
}
