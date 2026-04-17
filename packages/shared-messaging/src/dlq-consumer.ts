/**
 * Shared DLQ message consumer
 */

import { Kafka, KafkaMessage } from 'kafkajs';
import { Logger } from 'pino';

export interface DLQMessage {
  originalTopic: string;
  originalPartition: number;
  originalOffset: string;
  failureReason: string;
  failureCount: number;
  messageContent: KafkaMessage;
  failedAt: Date;
}

export class DLQConsumer {
  private kafka: Kafka;
  private logger: Logger;

  constructor(brokers: string[], logger: Logger) {
    this.kafka = new Kafka({ brokers });
    this.logger = logger;
  }

  async startConsuming(): Promise<void> {
    const consumer = this.kafka.consumer({
      groupId: 'dlq-monitor-consumer-group',
      sessionTimeout: 30000,
      heartbeatInterval: 10000,
    });

    await consumer.connect();

    // Subscribe to all DLQ topics
    const dlqTopics = [
      'user.events.dlq',
      'product.events.dlq',
      'inventory.events.dlq',
      'order.events.dlq',
      'payment.events.dlq',
      'cart.events.dlq',
    ];

    await consumer.subscribe({ topics: dlqTopics });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        this.logger.error(
          {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            timestamp: message.timestamp,
            headers: message.headers,
          },
          'DLQ message received - unprocessable event',
        );

        // Emit metric for monitoring
        // metricsClient.increment('dlq_message_count', {
        //   topic,
        // });

        // Parse failure reason from headers if available
        const failureReason = message.headers?.['failure-reason']?.toString() || 'unknown';

        this.logger.error(
          {
            dlqTopic: topic,
            failureReason,
            messageValue: message.value?.toString(),
          },
          'DLQ analysis required',
        );
      },
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      this.logger.info('Shutting down DLQ consumer');
      await consumer.disconnect();
      process.exit(0);
    });
  }
}

/**
 * Error handler for retryable Kafka consumers
 */
export async function handleKafkaMessageWithRetry(
  handler: () => Promise<void>,
  options: {
    topic: string;
    partition: number;
    offset: string;
    dlqTopic: string;
    maxRetries?: number;
    logger: Logger;
    kafkaProducer?: any;
  },
): Promise<void> {
  const maxRetries = options.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await handler();
      return; // Success
    } catch (error) {
      lastError = error as Error;
      options.logger.warn(
        {
          attempt,
          maxRetries,
          topic: options.topic,
          error: (error as Error).message,
        },
        'Kafka message processing failed, retrying',
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const backoffMs = Math.pow(2, attempt - 1) * 100;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted, send to DLQ
  options.logger.error(
    {
      topic: options.topic,
      dlqTopic: options.dlqTopic,
      error: lastError?.message,
    },
    'Message exhausted retries, sending to DLQ',
  );

  if (options.kafkaProducer) {
    await options.kafkaProducer.send({
      topic: options.dlqTopic,
      messages: [
        {
          value: JSON.stringify({
            originalTopic: options.topic,
            originalPartition: options.partition,
            originalOffset: options.offset,
            failureReason: lastError?.message || 'Unknown error',
            failedAt: new Date().toISOString(),
          }),
          headers: {
            'failure-reason': lastError?.message || 'Unknown error',
            'original-topic': options.topic,
          },
        },
      ],
    });
  }

  throw new Error(`Message failed after ${maxRetries} retries: ${lastError?.message}`);
}
