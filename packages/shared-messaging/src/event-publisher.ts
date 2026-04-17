/**
 * Kafka event emitter shared utilities
 */

import { Producer, Kafka } from 'kafkajs';
import { Logger } from 'pino';

export interface KafkaEventPayload {
  [key: string]: any;
}

export interface KafkaEvent {
  type: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  version: number;
  data: KafkaEventPayload;
  correlationId?: string;
  causationId?: string;
}

export class EventPublisher {
  private producer: Producer;
  private logger: Logger;

  constructor(brokers: string[], logger: Logger) {
    const kafka = new Kafka({ brokers });
    this.producer = kafka.producer();
    this.logger = logger;
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    this.logger.info('Event publisher connected');
  }

  async publishEvent(
    topic: string,
    event: KafkaEvent,
    options?: { partition?: number; key?: string },
  ): Promise<void> {
    const key = options?.key || event.aggregateId;

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(event),
            headers: {
              'event-type': event.type,
              'correlation-id': event.correlationId || event.aggregateId,
              'content-type': 'application/json',
              timestamp: event.timestamp,
            },
            partition: options?.partition,
          },
        ],
      });

      this.logger.debug(
        {
          topic,
          eventType: event.type,
          aggregateId: event.aggregateId,
        },
        'Event published',
      );
    } catch (error) {
      this.logger.error(
        {
          topic,
          eventType: event.type,
          error,
        },
        'Failed to publish event',
      );
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    this.logger.info('Event publisher disconnected');
  }
}

/**
 * Helper to create event payloads
 */
export function createEvent(
  type: string,
  aggregateId: string,
  aggregateType: string,
  data: KafkaEventPayload,
  options?: { correlationId?: string; causationId?: string },
): KafkaEvent {
  return {
    type,
    aggregateId,
    aggregateType,
    timestamp: new Date().toISOString(),
    version: 1,
    data,
    correlationId: options?.correlationId,
    causationId: options?.causationId,
  };
}
