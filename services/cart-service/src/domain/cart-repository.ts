/**
 * Cart repository interface
 */

import { Cart, CartItem } from './cart';

export interface ICartRepository {
  getCart(userId: string): Promise<Cart | null>;
  addItem(userId: string, item: CartItem): Promise<Cart>;
  updateItem(userId: string, productId: string, quantity: number): Promise<Cart>;
  removeItem(userId: string, productId: string): Promise<Cart>;
  clear(userId: string): Promise<void>;
}
