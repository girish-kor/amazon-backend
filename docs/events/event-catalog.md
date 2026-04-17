# Kafka Event Catalog

This document catalogs all Kafka events in the e-commerce system. Each event represents a domain fact that has occurred and is immutable. Events are the primary integration mechanism between services.

## Event Catalog

| Event | Topic | Producer | Consumers | Retention | Partitions | Schema Version |
|-------|-------|----------|-----------|-----------|------------|-----------------|
| `user.registered` | `user.events` | Auth | — (extensible) | 7 days | 3 | 1.0 |
| `product.created` | `product.events` | Catalog | Search, Inventory | 30 days | 6 | 1.0 |
| `product.updated` | `product.events` | Catalog | Search | 30 days | 6 | 1.0 |
| `product.deleted` | `product.events` | Catalog | Search, Inventory | 30 days | 6 | 1.0 |
| `inventory.reserved` | `inventory.events` | Inventory | Order | 7 days | 12 | 1.0 |
| `inventory.reservation_failed` | `inventory.events` | Inventory | Order | 7 days | 12 | 1.0 |
| `inventory.committed` | `inventory.events` | Inventory | Search, Audit | 7 days | 12 | 1.0 |
| `inventory.reservation_expired` | `inventory.events` | Inventory | Order | 7 days | 12 | 1.0 |
| `order.placed` | `order.events` | Order | Inventory, Payment, Notification | 30 days | 12 | 1.0 |
| `order.cancelled` | `order.events` | Order | Inventory, Payment, Notification | 30 days | 12 | 1.0 |
| `order.payment_requested` | `order.events` | Order | Payment | 30 days | 12 | 1.0 |
| `cart.checkout_initiated` | `cart.events` | Cart | Order | 1 day | 6 | 1.0 |
| `payment.succeeded` | `payment.events` | Payment | Order, Inventory | 90 days | 6 | 1.0 |
| `payment.failed` | `payment.events` | Payment | Order | 90 days | 6 | 1.0 |
| `payment.refunded` | `payment.events` | Payment | Order, Inventory | 90 days | 6 | 1.0 |

## Event Architecture Principles

### Immutability
Events are immutable records of things that happened. They are never updated or deleted. If an event is incorrect, a compensating event is emitted.

### Schema Versioning
- All events include `schemaVersion` field
- Schema changes that add optional fields: minor version bump
- Schema changes that remove fields: major version bump
- Consumers must handle schema versions they don't recognize (fail gracefully)

### Correlation & Causation
Every event includes:
- `eventId` — unique event identifier (UUID)
- `correlationId` — trace multiple events related to same user action
- `causationId` — ID of the event that caused this event
- Example flow:
  - User clicks checkout → `orderId=123` created
  - `cart.checkout_initiated` emitted with `eventId=E1, correlationId=C1`
  - Order Service receives E1 → emits `order.placed` with `eventId=E2, correlationId=C1, causationId=E1`
  - Inventory Service receives E2 → all its events have `correlationId=C1` for tracing

### At-Least-Once Delivery
Kafka guarantees messages are not lost (once committed). This means consumers may receive the same event twice:
- On network failure/retry
- On consumer group rebalancing
- **Solution:** All event handlers must be idempotent. Use `eventId` to detect and skip duplicates.

### Dead Letter Queue (DLQ)
If an event fails to process after 3 retries:
- Event moved to `{topic}.dlq` topic
- Logged with full context for manual review
- Alert fired if DLQ grows

### Timestamping
All events include `occurredAt` (when the event occurred in the system) and `recordedAt` (when it was written to Kafka):
- `occurredAt` is used for business logic
- `recordedAt` is used for infrastructure monitoring

---

## Event Details by Service

### Auth Service

#### user.registered
- **Emitted when:** User completes registration
- **Triggers:** Subsequent user.events consumers
- **Example:** Analytics system could create user profile; recommendation engine could initialize preferences
- **Schema:** [user.registered.json](schemas/user.registered.json)

---

### Catalog Service

#### product.created, product.updated, product.deleted
- **Emitted when:** Admin creates/updates/deletes product
- **Triggers:**
  - Search Service: indexes/updates/removes product from Elasticsearch
  - Inventory Service: creates inventory record on product.created
- **Idempotency:** Use `productId` as unique key
- **Schema:** 
  - [product.created.json](schemas/product.created.json)
  - [product.updated.json](schemas/product.updated.json)
  - [product.deleted.json](schemas/product.deleted.json)

---

### Inventory Service

#### inventory.reserved
- **Emitted when:** Stock successfully reserved for an order
- **Triggers:** Order Service → updates order status to CONFIRMED, emits order.payment_requested
- **Schema:** [inventory.reserved.json](schemas/inventory.reserved.json)

#### inventory.reservation_failed
- **Emitted when:** Insufficient stock for order
- **Triggers:** Order Service → cancels order, notifies user
- **Schema:** [inventory.reservation_failed.json](schemas/inventory.reservation_failed.json)

#### inventory.committed
- **Emitted when:** Reservation finalized to actual deduction (after payment succeeds)
- **Triggers:** Search Service → updates inStock flag
- **Schema:** [inventory.committed.json](schemas/inventory.committed.json)

#### inventory.reservation_expired
- **Emitted when:** Reservation times out (30 min with no payment)
- **Triggers:** Order Service → cancels order, releases reservation
- **Schema:** [inventory.reservation_expired.json](schemas/inventory.reservation_expired.json)

---

### Order Service

#### order.placed
- **Emitted when:** Order created from cart checkout
- **Triggers:**
  - Inventory Service → attempts to reserve stock
  - Payment Service → creates payment intent (via order.payment_requested)
  - Notification Service (future) → sends order confirmation email
- **Schema:** [order.placed.json](schemas/order.placed.json)

#### order.cancelled
- **Emitted when:** Order cancelled by user or system
- **Triggers:**
  - Inventory Service → releases any reservations
  - Payment Service → cancels/refunds payment if applicable
- **Schema:** [order.cancelled.json](schemas/order.cancelled.json)

#### order.payment_requested
- **Emitted when:** Inventory reserved, ready to request payment
- **Triggers:** Payment Service → creates/confirms payment intent
- **Schema:** [order.payment_requested.json](schemas/order.payment_requested.json)

---

### Cart Service

#### cart.checkout_initiated
- **Emitted when:** User clicks checkout and cart snapshot is taken
- **Triggers:** Order Service → creates order with cart items snapshot
- **Schema:** [cart.checkout_initiated.json](schemas/cart.checkout_initiated.json)

---

### Payment Service

#### payment.succeeded
- **Emitted when:** Payment processed successfully (via webhook or confirmation)
- **Triggers:**
  - Order Service → updates order status to PROCESSING
  - Inventory Service → commits reservations to actual deductions
- **Schema:** [payment.succeeded.json](schemas/payment.succeeded.json)

#### payment.failed
- **Emitted when:** Payment declined or failed
- **Triggers:**
  - Order Service → updates order status to PAYMENT_FAILED, emits order.cancelled
  - Inventory Service → releases reservations
- **Schema:** [payment.failed.json](schemas/payment.failed.json)

#### payment.refunded
- **Emitted when:** Refund processed successfully
- **Triggers:**
  - Order Service → updates order status to REFUNDED
  - Inventory Service → restores stock if previously committed
- **Schema:** [payment.refunded.json](schemas/payment.refunded.json)

---

## Schema Registry Integration

### Kafka Schema Registry Configuration

All schemas are registered with Confluent Schema Registry (or equivalent):

```bash
# Register a schema
curl -X POST http://localhost:8081/subjects/product.events-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "..."}'

# Get schema by version
curl http://localhost:8081/subjects/product.events-value/versions/1
```

### Schema Versioning in Code

In each service, consumers reference schemas by ID:

```typescript
// When consuming
const schema = schemaRegistry.getSchema(subject, version);
const record = await deserialize(kafkaMessage, schema);

// Producers include schema ID in message metadata
await producer.send({
  topic: 'product.events',
  messages: [{
    value: JSON.stringify({ ...event, schemaVersion: 1 }),
    headers: {
      'schema_id': '1'
    }
  }]
});
```

---

## Idempotency Implementation

Every event handler must be idempotent. Pattern:

```typescript
async function handleOrderPlaced(event: OrderPlacedEvent) {
  // Check if already processed
  const exists = await db.orderEvents.findOne({ eventId: event.eventId });
  if (exists) {
    return; // Already processed, skip
  }

  // Process event
  await db.transaction(async (tx) => {
    // Business logic
    await tx.orders.insert(order);
    
    // Record that we processed this event
    await tx.orderEvents.insert({
      eventId: event.eventId,
      orderId: order.id,
      eventType: 'order.placed',
      processedAt: new Date()
    });
  });
}
```

---

## Event Tracing Example

```
User clicks checkout
  ↓
Cart Service: emit cart.checkout_initiated
  eventId: "abc123"
  correlationId: "corr-xyz"
  ↓
Order Service: receives cart.checkout_initiated
  ↓ emit order.placed
  eventId: "def456"
  correlationId: "corr-xyz" (same)
  causationId: "abc123" (from previous event)
  ↓
Inventory Service: receives order.placed
  ↓ emit inventory.reserved
  eventId: "ghi789"
  correlationId: "corr-xyz" (same)
  causationId: "def456" (from previous event)
  ↓
Payment Service: receives order.placed (or order.payment_requested)
  ↓ emit payment.succeeded
  eventId: "jkl012"
  correlationId: "corr-xyz" (same)
  causationId: "order.payment_requested" or "payment.awaiting_method"

Result: All events linked by correlationId=corr-xyz for distributed tracing
```

---

## Updated: April 17, 2026
