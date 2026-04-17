/**
 * Redis cart repository implementation
 */

import { Redis } from 'ioredis';
import { Cart, CartItem } from '../domain/cart';
import { ICartRepository } from '../domain/cart-repository';

export class RedisCartRepository implements ICartRepository {
  constructor(private redis: Redis) {}

  async getCart(userId: string): Promise<Cart | null> {
    const cartKey = this.getCartKey(userId);
    const cartData = await this.redis.get(cartKey);

    if (!cartData) {
      return null;
    }

    const cart = JSON.parse(cartData) as Cart;
    return cart;
  }

  async addItem(userId: string, item: CartItem): Promise<Cart> {
    const cart = (await this.getCart(userId)) || this.createEmptyCart(userId);

    // Check if item already exists
    const existingIndex = cart.items.findIndex((i) => i.productId === item.productId);
    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    this.updateCartTotals(cart);
    await this.saveCart(userId, cart);

    return cart;
  }

  async updateItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    const cart = await this.getCart(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    const item = cart.items.find((i) => i.productId === productId);
    if (!item) {
      throw new Error('Item not found in cart');
    }

    item.quantity = quantity;
    this.updateCartTotals(cart);
    await this.saveCart(userId, cart);

    return cart;
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getCart(userId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.items = cart.items.filter((i) => i.productId !== productId);
    this.updateCartTotals(cart);
    await this.saveCart(userId, cart);

    return cart;
  }

  async clear(userId: string): Promise<void> {
    const cartKey = this.getCartKey(userId);
    await this.redis.del(cartKey);
  }

  private createEmptyCart(userId: string): Cart {
    return {
      id: `cart_${userId}`,
      userId,
      items: [],
      total: 0,
      itemCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private updateCartTotals(cart: Cart): void {
    cart.total = 0;
    cart.itemCount = 0;

    for (const item of cart.items) {
      cart.itemCount += item.quantity;
      cart.total += item.price * item.quantity;
    }

    cart.updatedAt = new Date();
  }

  private async saveCart(userId: string, cart: Cart): Promise<void> {
    const cartKey = this.getCartKey(userId);
    // Store for 24 hours
    await this.redis.setex(cartKey, 86400, JSON.stringify(cart));
  }

  private getCartKey(userId: string): string {
    return `cart:${userId}`;
  }
}
