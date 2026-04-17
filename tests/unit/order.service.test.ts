// Example unit test for Order Service state machine

import { describe, it, expect } from 'vitest';
import { OrderService } from '../src/application/order.service';
import { CreateOrderRequest } from '../src/domain/order';

describe('OrderService - State Machine', () => {
  it('should create order in pending state', async () => {
    const mockRepository = {
      create: (req: CreateOrderRequest) => Promise.resolve({
        id: 'order_1',
        ...req,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: () => Promise.resolve(null),
      findByUserId: () => Promise.resolve([]),
      update: () => Promise.resolve(null),
    };

    const service = new OrderService(mockRepository);
    const order = await service.createOrder({
      userId: 'user_1',
      items: [{ productId: 'prod_1', quantity: 2, price: 99.99 }],
      total: 199.98,
      shippingAddress: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        country: 'US',
      },
    });

    expect(order.status).toBe('pending');
  });

  it('should reject payment processing for non-pending order', async () => {
    const order = {
      id: 'order_1',
      status: 'cancelled',
    };

    const mockRepository = {
      findById: () => Promise.resolve(order),
      create: () => Promise.resolve(null),
      findByUserId: () => Promise.resolve([]),
      update: () => Promise.resolve(null),
    };

    const service = new OrderService(mockRepository);
    
    expect(() => service.processPayment('order_1')).rejects.toThrow();
  });
});
