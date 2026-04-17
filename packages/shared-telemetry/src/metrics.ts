/**
 * Shared Prometheus metric utilities
 */

export interface MetricLabels {
  [key: string]: string | number;
}

/**
 * Prometheus metric helpers for all services
 */
export class MetricsCollector {
  /**
   * HTTP request duration (histogram)
   */
  static getHttpMetrics = () => ({
    name: 'http_request_duration_seconds',
    type: 'histogram',
    help: 'HTTP request latency in seconds',
  });

  /**
   * HTTP requests total (counter)
   */
  static getHttpRequestsTotal = () => ({
    name: 'http_requests_total',
    type: 'counter',
    help: 'Total HTTP requests',
  });

  /**
   * Circuit breaker state
   */
  static getCircuitBreakerMetric = () => ({
    name: 'circuit_breaker_state',
    type: 'gauge',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  });

  /**
   * Database connection pool usage
   */
  static getConnectionPoolMetric = () => ({
    name: 'database_connection_pool_used',
    type: 'gauge',
    help: 'Number of database connections in use',
  });

  /**
   * Cache hit rate
   */
  static getCacheMetrics = () => ({
    hits: {
      name: 'cache_hits_total',
      type: 'counter',
      help: 'Total cache hits',
    },
    misses: {
      name: 'cache_misses_total',
      type: 'counter',
      help: 'Total cache misses',
    },
  });

  /**
   * Kafka metrics
   */
  static getKafkaMetrics = () => ({
    produced: {
      name: 'kafka_messages_produced_total',
      type: 'counter',
      help: 'Total messages produced to Kafka',
    },
    consumed: {
      name: 'kafka_messages_consumed_total',
      type: 'counter',
      help: 'Total messages consumed from Kafka',
    },
    lag: {
      name: 'kafka_consumer_lag',
      type: 'gauge',
      help: 'Kafka consumer lag',
    },
  });
}
