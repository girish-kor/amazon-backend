# Order Service

Order management and lifecycle coordination.

## Features

- **Order Creation**: Create orders from cart checkout
- **Order Tracking**: Track orders by user
- **Order Status**: Monitor order status through lifecycle
- **Order Cancellation**: Cancel pending orders
- **Payment Integration**: Coordinate with Payment Service
- **Inventory Coordination**: Reserve inventory for orders
- **PostgreSQL**: Relational database for order persistence

## Order Status Lifecycle

1. **pending** - Order created, awaiting payment
2. **payment_processing** - Payment is being processed
3. **confirmed** - Payment confirmed, order confirmed
4. **cancelled** - Order was cancelled
5. **completed** - Order fulfilled

## API Endpoints

### List Orders

```bash
GET /orders
Authorization: Bearer <ACCESS_TOKEN>

Response (200):
{
  "orders": [
    {
      "id": "order_xxx",
      "userId": "user_123",
      "items": [
        {
          "productId": "prod_001",
          "quantity": 2,
          "price": 99.99
        }
      ],
      "total": 199.98,
      "status": "confirmed",
      "shippingAddress": {...},
      "createdAt": "2026-04-17T...",
      "updatedAt": "2026-04-17T..."
    }
  ]
}
```

### Get Order

```bash
GET /orders/{orderId}
Authorization: Bearer <ACCESS_TOKEN>

Response (200):
{
  "id": "order_xxx",
  ...
}
```

### Create Order

```bash
POST /orders
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "items": [
    {
      "productId": "prod_001",
      "quantity": 2,
      "price": 99.99
    }
  ],
  "total": 199.98,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "country": "US"
  }
}

Response (201):
{
  "id": "order_xxx",
  "status": "pending",
  ...
}
```

### Cancel Order

```bash
POST /orders/{orderId}/cancel
Authorization: Bearer <ACCESS_TOKEN>

Response (200):
{
  "id": "order_xxx",
  "status": "cancelled",
  ...
}
```

## Database Schema

```sql
CREATE TABLE orders (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

## Configuration

Environment variables:

```bash
# Server
ORDER_SERVICE_PORT=3005
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

Service runs on port 3005 (or `ORDER_SERVICE_PORT` if set).

### Test Endpoints

```bash
# List orders
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3005/orders

# Get order
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3005/orders/order_xxx

# Create order
curl -X POST http://localhost:3005/orders \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "items":[{"productId":"prod_001","quantity":2,"price":99.99}],
    "total":199.98,
    "shippingAddress":{...}
  }'

# Cancel order
curl -X POST http://localhost:3005/orders/order_xxx/cancel \
  -H "Authorization: Bearer <TOKEN>"
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "User ID and items are required",
    "code": "VALIDATION_ERROR"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Order not found",
    "code": "NOT_FOUND"
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "message": "Order cannot be cancelled",
    "code": "CONFLICT"
  }
}
```

## Event Integration

Orders emit events to Kafka:
- `order.placed` - Order created
- `order.payment_requested` - Payment processing initiated
- `order.confirmed` - Order confirmed
- `order.cancelled` - Order cancelled

## Production Deployment

1. Implement distributed saga for order processing
2. Add order event sourcing
3. Implement order retry logic
4. Add order timeout handling
5. Set up order notifications
6. Implement order refund handling
7. Add order audit trail
8. Implement order search/filtering
9. Add order analytics
10. Set up backup and recovery procedures
