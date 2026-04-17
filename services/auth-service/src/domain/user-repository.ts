/**
 * User repository interface
 */

import { User, UserProfile } from './user';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(email: string, passwordHash: string): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
}
