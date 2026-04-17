/**
 * JWT token generation and validation
 */

import crypto from 'crypto';
import { TokenPair, JWTPayload } from './user';

/**
 * Simple JWT implementation (in production use jsonwebtoken library)
 */
export class JWTManager {
  private readonly secret: string;
  private readonly accessTokenExpiry: number = 15 * 60; // 15 minutes
  private readonly refreshTokenExpiry: number = 7 * 24 * 60 * 60; // 7 days

  constructor(secret?: string) {
    this.secret = secret || process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokenPair(userId: string, email: string): TokenPair {
    const accessToken = this.generateToken(userId, email, this.accessTokenExpiry);
    const refreshToken = this.generateToken(userId, email, this.refreshTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string, expiresIn: number): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + expiresIn;

    const header = this.base64UrlEncode(
      JSON.stringify({
        alg: 'HS256',
        typ: 'JWT',
      }),
    );

    const payload = this.base64UrlEncode(
      JSON.stringify({
        userId,
        email,
        iat: now,
        exp,
      }),
    );

    const signature = this.createSignature(`${header}.${payload}`);

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Verify and decode token
   */
  verifyToken(token: string): JWTPayload {
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature) {
      throw new Error('Invalid token format');
    }

    // Verify signature
    const expectedSignature = this.createSignature(`${header}.${payload}`);
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const decoded = JSON.parse(this.base64UrlDecode(payload));

    // Check expiry
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    return decoded;
  }

  /**
   * Create HMAC signature
   */
  private createSignature(message: string): string {
    return this.base64UrlEncode(
      crypto
        .createHmac('sha256', this.secret)
        .update(message)
        .digest(),
    );
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(data: string | Buffer): string {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(str: string): string {
    let output = str.replace(/-/g, '+').replace(/_/g, '/');
    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
      default:
        throw new Error('Invalid base64url string');
    }
    return Buffer.from(output, 'base64').toString();
  }
}
