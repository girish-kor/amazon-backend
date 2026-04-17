/**
 * Order repository interface
 */

import { Order, CreateOrderRequest } from './order';

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  create(request: CreateOrderRequest): Promise<Order>;
  update(id: string, order: Partial<Order>): Promise<Order>;
}
