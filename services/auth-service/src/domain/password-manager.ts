/**
 * Password hashing utilities
 */

import crypto from 'crypto';

export class PasswordManager {
  /**
   * Hash password using PBKDF2
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify password against hash
   */
  static verifyPassword(password: string, hash: string): boolean {
    const [salt, originalHash] = hash.split(':');
    const newHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return newHash === originalHash;
  }
}
