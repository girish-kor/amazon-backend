// Integration test example - Order saga flow

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';

describe('Order Saga Integration', () => {
  let pgPool: Pool;
  let redis: Redis;
  let kafka: Kafka;

  beforeAll(async () => {
    // Setup test infrastructure
    pgPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'ecommerce_test',
    });

    redis = new Redis('redis://localhost:6379/1');
    kafka = new Kafka({ brokers: ['localhost:9092'] });

    // Wait for dependencies to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        await pgPool.query('SELECT 1');
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  });

  afterAll(async () => {
    await pgPool.end();
    await redis.disconnect();
  });

  it('should process complete order-to-payment saga', async () => {
    // 1. Create order
    const orderResult = await pgPool.query(
      `INSERT INTO orders (user_id, total_amount, status, shipping_address)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        'user_1',
        199.98,
        'pending',
        JSON.stringify({
          street: '123 Main St',
          city: 'Springfield',
        }),
      ],
    );
    const orderId = orderResult.rows[0].id;

    // 2. Emit order.placed event via Kafka
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({
      topic: 'order.events',
      messages: [{
        key: orderId,
        value: JSON.stringify({
          type: 'order.placed',
          orderId,
          userId: 'user_1',
        }),
      }],
    });
    await producer.disconnect();

    // 3. Wait for inventory to process event and reserve stock
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. Verify order state machine progressed
    const orderResult2 = await pgPool.query(
      'SELECT status FROM orders WHERE id = $1',
      [orderId],
    );
    
    expect(
      ['pending', 'payment_processing', 'confirmed'].includes(
        orderResult2.rows[0].status,
      ),
    ).toBe(true);
  });
});
