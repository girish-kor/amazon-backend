# Kafka Consumer Groups Configuration

## Consumer Group Mapping

### Auth Service
- **Group ID:** `auth-service-consumer-group`
- **Topics Subscribed:**
  - `user.events` — consumes events from auth service itself for audit logging

### Catalog Service
- **Group ID:** `catalog-service-consumer-group`
- **Topics Subscribed:**
  - `product.events` — publishes only, no subscriptions

### Inventory Service
- **Group ID:** `inventory-service-consumer-group`
- **Topics Subscribed:**
  - `order.events` — responds to `order.placed`, `order.cancelled`
  - `payment.events` — responds to `payment.succeeded`, `payment.failed`

### Cart Service
- **Group ID:** `cart-service-consumer-group`
- **Topics Subscribed:**
  - `cart.events` — internal event tracking only

### Order Service
- **Group ID:** `order-service-consumer-group`
- **Topics Subscribed:**
  - `cart.events` — responds to `cart.checkout_initiated`
  - `inventory.events` — responds to `inventory.reserved`, `inventory.reservation_failed`
  - `payment.events` — responds to `payment.succeeded`, `payment.failed`

### Payment Service
- **Group ID:** `payment-service-consumer-group`
- **Topics Subscribed:**
  - `order.events` — responds to `order.payment_requested`

### Search Service
- **Group ID:** `search-service-consumer-group`
- **Topics Subscribed:**
  - `product.events` — responds to `product.created`, `product.updated`, `product.deleted`
  - `inventory.events` — responds to `inventory.committed` (for stock status updates)

---

## Topic-to-Service Mapping

| Topic | Producer | Consumers |
|---|---|---|
| `user.events` | Auth Service | Auth Service (audit), DLQ Monitor |
| `product.events` | Catalog Service | Search Service, Inventory Service |
| `inventory.events` | Inventory Service | Order Service, Search Service, DLQ Monitor |
| `order.events` | Order Service | Inventory Service, Payment Service, DLQ Monitor |
| `payment.events` | Payment Service | Order Service, DLQ Monitor |
| `cart.events` | Cart Service | Order Service, DLQ Monitor |

---

## Dead Letter Queue (DLQ) Topics

All topics have corresponding DLQ topics with pattern: `{topic}.dlq`

- `user.events.dlq` — unprocessable user events
- `product.events.dlq` — unprocessable product events
- `inventory.events.dlq` — unprocessable inventory events
- `order.events.dlq` — unprocessable order events
- `payment.events.dlq` — unprocessable payment events
- `cart.events.dlq` — unprocessable cart events

---

## Consumer Configuration

### Default Consumer Settings
```
auto.offset.reset: earliest
enable.auto.commit: false
session.timeout.ms: 30000
heartbeat.interval.ms: 10000
max.poll.interval.ms: 300000
```

### Max Retries Policy
- **Retry Attempts:** 3
- **Backoff:** Exponential (100ms, 200ms, 400ms)
- **After 3 Retries:** Message sent to DLQ
- **Alert on DLQ:** Prometheus alert if DLQ message count > 0

---

## Scaling Guidelines

| Topic | Partitions | Scaling Reason |
|---|---|---|
| `user.events` | 3 | Low volume (~10 events/min) |
| `product.events` | 6 | Medium volume (~100 events/min) |
| `inventory.events` | 12 | High volume, time-sensitive (~1000 events/min) |
| `order.events` | 12 | Critical business events |
| `payment.events` | 6 | Financial transactions |
| `cart.events` | 6 | Ephemeral user actions |

---

## Monitoring

### Prometheus Metrics
- `kafka_consumer_group_lag` — lag per consumer group
- `kafka_consumer_lag_ms` — time since last message
- `kafka_topic_partition_count` — verify partition counts
- `kafka_dlq_message_count` — DLQ message count per topic

### Alerts
```yaml
- alert: HighConsumerLag
  expr: kafka_consumer_group_lag > 10000
  annotations:
    summary: "Consumer group {{ $labels.group_id }} lagging 10k+ messages"

- alert: DLQMessagesPresent
  expr: kafka_dlq_message_count > 0
  annotations:
    summary: "DLQ {{ $labels.topic }} has unprocessable messages"
```
