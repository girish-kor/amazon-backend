/**
 * PostgreSQL user repository implementation
 */

import { Pool } from 'pg';
import { User, UserProfile } from '../domain/user';
import { IUserRepository } from '../domain/user-repository';

export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] || null;
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const id = this.generateId();
    const now = new Date();

    const result = await this.pool.query(
      'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"',
      [id, email, passwordHash, now, now],
    );

    return result.rows[0];
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    const updateFields: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (user.email) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(user.email);
    }
    if (user.passwordHash) {
      updateFields.push(`password_hash = $${paramIndex++}`);
      values.push(user.passwordHash);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $1 RETURNING id, email, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"`;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
