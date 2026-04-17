# Inventory Service

Stock management with reservation and commitment model.

## Features

- **Inventory Tracking**: Track product stock levels
- **Reservations**: Reserve inventory for orders with time-based expiry
- **Confirmation**: Confirm reservations to commit stock
- **Cancellation**: Cancel reservations to release stock
- **Auto-Release**: Automatically release expired reservations
- **PostgreSQL**: Relational database for ACID transactions

## API Endpoints

### Get Inventory Level

```bash
GET /inventory/{productId}

Response (200):
{
  "id": "inv_xxx",
  "productId": "prod_001",
  "quantity": 100,
  "reserved": 25,
  "available": 75,
  "createdAt": "2026-04-17T...",
  "updatedAt": "2026-04-17T..."
}
```

### Reserve Inventory

```bash
POST /inventory/reserve
Content-Type: application/json

{
  "productId": "prod_001",
  "orderId": "order_123",
  "quantity": 5,
  "expiryMinutes": 15
}

Response (201):
{
  "id": "res_xxx",
  "inventoryId": "inv_xxx",
  "productId": "prod_001",
  "quantity": 5,
  "orderId": "order_123",
  "status": "pending",
  "createdAt": "2026-04-17T...",
  "expiresAt": "2026-04-17T00:15:..."
}
```

### Confirm Reservation

```bash
POST /inventory/confirm/{reservationId}

Response (200):
{
  "id": "res_xxx",
  "status": "confirmed",
  "confirmedAt": "2026-04-17T...",
  ...
}
```

### Cancel Reservation

```bash
POST /inventory/cancel/{reservationId}

Response (204): No content
```

## Database Schema

```sql
CREATE TABLE inventory_levels (
  id VARCHAR(255) PRIMARY KEY,
  product_id VARCHAR(255) UNIQUE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE reservations (
  id VARCHAR(255) PRIMARY KEY,
  inventory_id VARCHAR(255) NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  order_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory_levels(id)
);
```

## Reservation Lifecycle

1. **Reserved** (pending) - Inventory is held but not yet committed
2. **Confirmed** (confirmed) - Inventory is committed for order
3. **Cancelled** (cancelled) - Inventory is released back to available

## Configuration

Environment variables:

```bash
# Server
INVENTORY_SERVICE_PORT=3003
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ecommerce
DATABASE_USER=postgres
DATABASE_PASSWORD=password
```

## Development

### Start Service

```bash
pnpm dev
```

Service runs on port 3003 (or `INVENTORY_SERVICE_PORT` if set).

### Test Endpoints

```bash
# Get inventory
curl http://localhost:3003/inventory/prod_001

# Reserve inventory
curl -X POST http://localhost:3003/inventory/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "productId":"prod_001",
    "orderId":"order_123",
    "quantity":5,
    "expiryMinutes":15
  }'

# Confirm reservation
curl -X POST http://localhost:3003/inventory/confirm/res_xxx

# Cancel reservation
curl -X POST http://localhost:3003/inventory/cancel/res_xxx
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Product ID, order ID, and quantity are required",
    "code": "VALIDATION_ERROR"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Product not found in inventory",
    "code": "NOT_FOUND"
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "message": "Insufficient inventory",
    "code": "CONFLICT"
  }
}
```

## Concurrency & ACID

- All operations use database transactions
- Row-level locks prevent race conditions
- Serializable isolation level for inventory updates
- Automatic rollback on conflicts

## Performance Considerations

1. **Indexes**: Optimized for product lookups and order queries
2. **Expiry Cleanup**: Background job runs every minute
3. **Connection Pooling**: PgBouncer for connection management
4. **Read Replicas**: Consider for read-heavy scenarios

## Production Deployment

1. Enable connection pooling (PgBouncer)
2. Set up primary-replica replication
3. Monitor reservation expiry cleanup
4. Implement data archival for old reservations
5. Add inventory adjustment audit trail
6. Implement manual stock count synchronization
7. Add low stock alerts
8. Monitor transaction locks
9. Set up automated backups
10. Implement disaster recovery plan
