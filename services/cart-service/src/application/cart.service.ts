/**
 * Cart service business logic
 */

import { Cart, CartItem, CartCheckout } from '../domain/cart';
import { ICartRepository } from '../domain/cart-repository';
import { ValidationError, NotFoundError } from '@shared/errors';

export class CartService {
  constructor(private cartRepository: ICartRepository) {}

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.getCart(userId);
    if (!cart) {
      // Return empty cart
      cart = {
        id: `cart_${userId}`,
        userId,
        items: [],
        total: 0,
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return cart;
  }

  /**
   * Add item to cart
   */
  async addItem(userId: string, productId: string, quantity: number, price: number): Promise<Cart> {
    if (!productId || quantity <= 0 || price <= 0) {
      throw new ValidationError('Product ID, quantity, and price are required');
    }

    const item: CartItem = {
      productId,
      quantity,
      price,
    };

    return this.cartRepository.addItem(userId, item);
  }

  /**
   * Update item quantity
   */
  async updateItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    if (!productId || quantity < 0) {
      throw new ValidationError('Product ID and quantity are required');
    }

    if (quantity === 0) {
      return this.cartRepository.removeItem(userId, productId);
    }

    return this.cartRepository.updateItem(userId, productId, quantity);
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, productId: string): Promise<Cart> {
    return this.cartRepository.removeItem(userId, productId);
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<void> {
    await this.cartRepository.clear(userId);
  }

  /**
   * Checkout cart
   */
  async checkout(
    userId: string,
    shippingAddress: CartCheckout['shippingAddress'],
  ): Promise<CartCheckout> {
    const cart = await this.cartRepository.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
      throw new ValidationError('Shipping address is required');
    }

    return {
      cartId: cart.id,
      userId,
      items: cart.items,
      total: cart.total,
      shippingAddress,
    };
  }
}
