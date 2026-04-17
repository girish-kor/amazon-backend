/**
 * Authentication use cases
 */

import { User, TokenPair, UserProfile } from '../domain/user';
import { IUserRepository } from '../domain/user-repository';
import { PasswordManager } from '../domain/password-manager';
import { JWTManager } from '../domain/jwt-manager';
import { ValidationError, ConflictError, UnauthorizedError } from '@shared/errors';

export class AuthenticationService {
  constructor(
    private userRepository: IUserRepository,
    private jwtManager: JWTManager,
  ) {}

  /**
   * Register new user
   */
  async register(email: string, password: string): Promise<{ user: UserProfile; tokens: TokenPair }> {
    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = PasswordManager.hashPassword(password);

    // Create user
    const user = await this.userRepository.create(email, passwordHash);

    // Generate tokens
    const tokens = this.jwtManager.generateTokenPair(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: UserProfile; tokens: TokenPair }> {
    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = PasswordManager.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = this.jwtManager.generateTokenPair(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtManager.verifyToken(refreshToken);
      return this.jwtManager.generateTokenPair(payload.userId, payload.email);
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }
}
