# Payment Service

Payment processing and management.

## Features

- **Payment Creation**: Create payments for orders
- **Payment Processing**: Process payments (Stripe integration ready)
- **Refund Management**: Refund processed payments
- **Payment Status**: Track payment lifecycle
- **Stripe Integration**: Ready for Stripe API integration
- **PostgreSQL**: Payment persistence with ACID transactions

## API Endpoints

### Get Payment

```bash
GET /payments/{paymentId}

Response (200):
{
  "id": "pay_xxx",
  "orderId": "order_123",
  "userId": "user_123",
  "amount": 199.98,
  "currency": "USD",
  "status": "succeeded",
  "createdAt": "2026-04-17T...",
  "updatedAt": "2026-04-17T..."
}
```

### Create Payment

```bash
POST /payments
Content-Type: application/json

{
  "orderId": "order_123",
  "userId": "user_123",
  "amount": 199.98,
  "currency": "USD",
  "paymentMethodId": "pm_xxx"
}

Response (201):
{
  "id": "pay_xxx",
  "status": "pending",
  ...
}
```

### Process Payment

```bash
POST /payments/{paymentId}/process

Response (200):
{
  "id": "pay_xxx",
  "status": "succeeded",
  ...
}
```

### Refund Payment

```bash
POST /payments/{paymentId}/refund
Content-Type: application/json

{
  "amount": 199.98,
  "reason": "Customer requested refund"
}

Response (200):
{
  "id": "pay_xxx",
  "status": "refunded",
  ...
}
```

## Database Schema

```sql
CREATE TABLE payments (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

## Configuration

Environment variables:

```bash
# Server
PAYMENT_SERVICE_PORT=3006
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ecommerce
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx
```

## Development

### Start Service

```bash
pnpm dev
```

Service runs on port 3006 (or `PAYMENT_SERVICE_PORT` if set).

## Payment Status Lifecycle

1. **pending** - Payment created, awaiting processing
2. **succeeded** - Payment processed successfully
3. **failed** - Payment processing failed
4. **refunded** - Payment was refunded

## Production Deployment

1. Integrate Stripe API
2. Implement PCI compliance
3. Add payment retry logic
4. Implement idempotency keys
5. Add webhook handlers for Stripe events
6. Implement payment reconciliation
7. Add fraud detection
8. Set up payment monitoring
9. Implement secure logging (no sensitive data)
10. Add payment analytics
