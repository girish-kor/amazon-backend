/**
 * Order service business logic
 */

import { Order, CreateOrderRequest, OrderItem } from '../domain/order';
import { IOrderRepository } from '../domain/order-repository';
import { ValidationError, NotFoundError, ConflictError } from '@shared/errors';

export class OrderService {
  constructor(private orderRepository: IOrderRepository) {}

  /**
   * Get user's orders
   */
  async getOrders(userId: string): Promise<Order[]> {
    return this.orderRepository.findByUserId(userId);
  }

  /**
   * Get order by ID
   */
  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return order;
  }

  /**
   * Create new order
   */
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    // Validate input
    if (!request.userId || !request.items || request.items.length === 0) {
      throw new ValidationError('User ID and items are required');
    }

    if (request.total <= 0) {
      throw new ValidationError('Order total must be greater than 0');
    }

    // Validate items
    for (const item of request.items) {
      if (!item.productId || item.quantity <= 0 || item.price <= 0) {
        throw new ValidationError('Each item must have productId, quantity, and price');
      }
    }

    // Create order with pending status
    const order = await this.orderRepository.create(request);

    return order;
  }

  /**
   * Process payment for order
   */
  async processPayment(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status !== 'pending') {
      throw new ConflictError('Order is not in pending status');
    }

    return this.orderRepository.update(orderId, {
      status: 'payment_processing',
      updatedAt: new Date(),
    });
  }

  /**
   * Confirm payment and order
   */
  async confirmOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status !== 'payment_processing') {
      throw new ConflictError('Order is not being processed');
    }

    return this.orderRepository.update(orderId, {
      status: 'confirmed',
      updatedAt: new Date(),
    });
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new ConflictError('Order cannot be cancelled');
    }

    return this.orderRepository.update(orderId, {
      status: 'cancelled',
      updatedAt: new Date(),
    });
  }
}
