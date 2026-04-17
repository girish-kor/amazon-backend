# Observability Stack Configuration

This directory contains configuration for the observability stack including Prometheus, Grafana, Loki, and Jaeger.

## Components

### Prometheus (`prometheus.yml`)
- Scrapes metrics from all services on `/metrics` endpoint
- 15-second scrape interval
- Stores time-series data in local volume
- Alerting rules in `prometheus-alerts.yml`

### Grafana (`docker-compose.yml`)
- Dashboards for service metrics, logs, and traces
- Data sources connected to Prometheus and Loki
- Default credentials: admin:admin

### Loki (`loki-config.yml`)
- Log aggregation for all services
- Stores logs in local filesystem
- Integrated with Grafana for querying

### Jaeger
- Distributed tracing and observability
- All services send traces via OpenTelemetry
- UI available at http://localhost:16686

## Metrics by Service

### API Gateway
- `http_request_duration_seconds` - Request latency
- `http_requests_total` - Total requests by status code
- `circuit_breaker_state` - State of circuit breakers to backend services
- `rate_limiter_rejected_total` - Rejected requests due to rate limiting

### Auth Service
- `user_registrations_total` - Total user registrations
- `user_logins_total` - Total login attempts
- `failed_logins_total` - Failed login attempts
- `jwt_validations_total` - JWT token validations

### Catalog Service
- `products_total` - Total products in catalog
- `product_searches_total` - Product searches
- `mongodb_queries_total` - MongoDB query count
- `cache_hits_total` - Cache hit count

### Inventory Service
- `inventory_reservations_total` - Stock reservations
- `inventory_committed_total` - Committed inventory
- `reservation_failures_total` - Failed reservations
- `database_queries_total` - Database query count

### Cart Service
- `cart_additions_total` - Items added to carts
- `cart_checkouts_total` - Completed checkouts
- `redis_operations_total` - Redis command count
- `cart_abandonment_total` - Abandoned carts

### Order Service
- `orders_created_total` - Total orders created
- `order_status_changes_total` - Order status changes
- `database_transactions_total` - Database transactions
- `saga_failures_total` - Failed order sagas

### Payment Service
- `payment_attempts_total` - Total payment attempts
- `payment_successes_total` - Successful payments
- `payment_failures_total` - Failed payments
- `payment_processing_duration_seconds` - Processing time

### Search Service
- `search_queries_total` - Total search queries
- `elasticsearch_queries_total` - ES query count
- `search_result_latency_seconds` - Search latency
- `index_updates_total` - Product index updates

## Alerts

Configured alerts in `prometheus-alerts.yml`:
- Service Down (critical)
- Circuit Breaker Open (warning)
- High Error Rate > 10% (warning)
- High Latency > 1s p99 (warning)
- Database Connection Pool > 90% (warning)
- Kafka Consumer Lag > 100k (warning)
- Low Disk Space < 10% (warning)
- High Memory > 90% (warning)

## Dashboards

### Main Service Dashboard
Shows health and performance of all services

### Request Performance Dashboard
HTTP latency, error rates, throughput

### Database Performance Dashboard
Query count, slow queries, connection pool usage

### Event Processing Dashboard
Kafka topic throughput, consumer lag, event volumes

### System Dashboard
CPU, memory, disk, network utilization

## Logs

All services send structured logs to Loki with fields:
- timestamp
- level (info, warn, error)
- service
- request_id
- trace_id
- message
- custom fields (per service)

Query examples:
```
{service="auth-service"} | json | level="error"
{service=~".*-service"} | json | duration > 1000
```

## Tracing

Services integrate OpenTelemetry for distributed tracing:
- Automatic instrumentation for HTTP, database, messaging
- Trace context propagated via headers
- All traces visible in Jaeger UI

## Configuration Updates

To update configurations:

1. **Prometheus**: Edit `prometheus.yml` or `prometheus-alerts.yml`, then reload
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

2. **Loki**: Edit `loki-config.yml`, restart Loki
   ```bash
   docker-compose restart loki
   ```

3. **Grafana**: Configure dashboards in UI or via API

4. **Jaeger**: Configuration via environment variables (see docker-compose.yml)

## Production Considerations

- Use managed observability services (Datadog, New Relic, etc.)
- Implement long-term log storage (S3, GCS, etc.)
- Set up alerting integration (PagerDuty, Slack, etc.)
- Enable RBAC for Grafana
- Implement metric retention policies
- Add service SLOs and error budgets
- Use sampling for high-volume trace data
- Implement cost optimization for observability

## Troubleshooting

### Prometheus not scraping metrics
- Check service is running and `/metrics` endpoint works
- Verify firewall allows connections to service
- Check Prometheus logs: `docker-compose logs prometheus`

### Grafana dashboards not showing data
- Verify Prometheus data source is connected
- Check dashboard queries (use Prometheus UI to test)
- Ensure service is sending metrics

### Loki not receiving logs
- Verify services are configured to send logs to Loki
- Check Loki logs: `docker-compose logs loki`
- Verify network connectivity

### Jaeger showing no traces
- Verify OpenTelemetry SDK is initialized in services
- Check Jaeger agent is running: `docker-compose ps jaeger`
- Check firewall allows UDP 6831 for agent
