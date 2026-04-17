/**
 * Database initialization
 */

import { Pool } from 'pg';
import { Logger } from 'pino';

export async function initializeDatabase(pool: Pool, logger: Logger): Promise<void> {
  try {
    // Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Database initialization failed');
    throw error;
  }
}
