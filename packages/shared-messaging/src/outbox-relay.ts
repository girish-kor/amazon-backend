/**
 * Outbox Pattern - Shared outbox relay
 */

import { Pool } from 'pg';
import { Producer } from 'kafkajs';
import { Logger } from 'pino';

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
}

export class OutboxRelay {
  private pollInterval: NodeJS.Timer | null = null;

  constructor(
    private pool: Pool,
    private kafkaProducer: Producer,
    private logger: Logger,
    private pollingIntervalMs: number = 500,
  ) {}

  async start(): Promise<void> {
    this.logger.info('Starting outbox relay');

    this.pollInterval = setInterval(async () => {
      try {
        await this.publishPendingEvents();
      } catch (error) {
        this.logger.error({ error }, 'Error publishing outbox events');
      }
    }, this.pollingIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.logger.info('Stopped outbox relay');
    }
  }

  private async publishPendingEvents(): Promise<void> {
    // Use advisory lock to ensure only one relay instance publishes
    const lockId = 1;

    const client = await this.pool.connect();
    try {
      // Try to acquire lock
      const lockResult = await client.query('SELECT pg_try_advisory_lock($1)', [lockId]);
      if (!lockResult.rows[0].pg_try_advisory_lock) {
        // Another relay instance has the lock, skip this cycle
        return;
      }

      try {
        // Fetch pending events
        const result = await client.query(
          `SELECT id, aggregate_type, aggregate_id, event_type, payload
           FROM outbox
           WHERE status = 'pending'
           ORDER BY created_at ASC
           LIMIT 100`,
        );

        const events: OutboxEvent[] = result.rows;

        for (const event of events) {
          try {
            // Publish to Kafka topic based on aggregate type
            const topic = `${event.aggregateType.toLowerCase()}.events`;

            await this.kafkaProducer.send({
              topic,
              messages: [
                {
                  key: event.aggregateId,
                  value: JSON.stringify({
                    type: event.eventType,
                    aggregateId: event.aggregateId,
                    aggregateType: event.aggregateType,
                    data: event.payload,
                    timestamp: new Date().toISOString(),
                  }),
                  headers: {
                    'event-type': event.eventType,
                  },
                },
              ],
            });

            // Mark as published
            await client.query(
              `UPDATE outbox SET status = 'published', published_at = now() WHERE id = $1`,
              [event.id],
            );

            this.logger.debug(
              {
                eventId: event.id,
                eventType: event.eventType,
                topic,
              },
              'Event published from outbox',
            );
          } catch (error) {
            // Mark as failed
            await client.query(
              `UPDATE outbox SET status = 'failed', failed_at = now(), failure_reason = $1 WHERE id = $2`,
              [(error as Error).message, event.id],
            );

            this.logger.error(
              {
                eventId: event.id,
                error,
              },
              'Failed to publish event from outbox',
            );
          }
        }

        // Cleanup published events older than 7 days
        await client.query(
          `DELETE FROM outbox WHERE status = 'published' AND published_at < now() - interval '7 days'`,
        );
      } finally {
        // Release advisory lock
        await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
      }
    } finally {
      client.release();
    }
  }
}

/**
 * Helper to write events to outbox within DB transaction
 */
export async function writeEventToOutbox(
  client: any,
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: any,
): Promise<void> {
  await client.query(
    `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
     VALUES ($1, $2, $3, $4)`,
    [aggregateType, aggregateId, eventType, JSON.stringify(payload)],
  );
}
