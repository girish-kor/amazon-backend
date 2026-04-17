# Cart Service

Shopping cart management with Redis.

## Features

- **Shopping Cart**: Manage user shopping carts
- **Add/Remove Items**: Add or remove products from cart
- **Quantity Management**: Update item quantities
- **Price Tracking**: Store prices at time of addition
- **Cart Checkout**: Initiate checkout with shipping address
- **Redis Storage**: In-memory cart persistence with 24-hour TTL
- **Session Management**: Per-user cart sessions

## API Endpoints

### Get Cart

```bash
GET /cart
Authorization: Bearer <ACCESS_TOKEN>

Response (200):
{
  "id": "cart_user_123",
  "userId": "user_123",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 2,
      "price": 99.99
    }
  ],
  "total": 199.98,
  "itemCount": 2,
  "createdAt": "2026-04-17T...",
  "updatedAt": "2026-04-17T..."
}
```

### Add Item to Cart

```bash
POST /cart/items
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "productId": "prod_001",
  "quantity": 2,
  "price": 99.99
}

Response (200):
{
  "id": "cart_user_123",
  "items": [...],
  "total": 199.98,
  ...
}
```

### Update Item Quantity

```bash
PUT /cart/items/{productId}
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "quantity": 5
}

Response (200):
{
  "id": "cart_user_123",
  ...
}
```

### Remove Item from Cart

```bash
DELETE /cart/items/{productId}
Authorization: Bearer <ACCESS_TOKEN>

Response (200):
{
  "id": "cart_user_123",
  ...
}
```

### Checkout Cart

```bash
POST /cart/checkout
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "country": "US"
  }
}

Response (200):
{
  "cartId": "cart_user_123",
  "userId": "user_123",
  "items": [...],
  "total": 199.98,
  "shippingAddress": {...}
}
```

### Clear Cart

```bash
DELETE /cart
Authorization: Bearer <ACCESS_TOKEN>

Response (204): No content
```

## Data Storage

Redis keys structure:
```
cart:user_123 -> JSON serialized Cart object
```

Each cart expires after 24 hours (86400 seconds) of inactivity.

## Configuration

Environment variables:

```bash
# Server
CART_SERVICE_PORT=3004
NODE_ENV=development
LOG_LEVEL=info

# Redis
REDIS_URI=redis://localhost:6379
```

## Development

### Start Service

```bash
pnpm dev
```

Service runs on port 3004 (or `CART_SERVICE_PORT` if set).

### Test Endpoints

```bash
# Get cart
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3004/cart

# Add item
curl -X POST http://localhost:3004/cart/items \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId":"prod_001",
    "quantity":2,
    "price":99.99
  }'

# Update quantity
curl -X PUT http://localhost:3004/cart/items/prod_001 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"quantity":5}'

# Remove item
curl -X DELETE http://localhost:3004/cart/items/prod_001 \
  -H "Authorization: Bearer <TOKEN>"

# Checkout
curl -X POST http://localhost:3004/cart/checkout \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress":{
      "street":"123 Main St",
      "city":"Springfield",
      "state":"IL",
      "zipCode":"62701",
      "country":"US"
    }
  }'
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Product ID, quantity, and price are required",
    "code": "VALIDATION_ERROR"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "Unauthorized",
    "code": "UNAUTHORIZED"
  }
}
```

## Performance Considerations

1. **Redis Clustering**: Use Redis Cluster for scalability
2. **Cache Invalidation**: Items cleared after 24 hours
3. **TTL Management**: Automatic expiry prevents memory bloat
4. **Connection Pooling**: Single redis client per instance
5. **Price Snapshot**: Capture price at add time for consistency

## Production Deployment

1. Enable Redis persistence (RDB or AOF)
2. Set up Redis replication/clustering
3. Implement backup strategy
4. Monitor Redis memory usage
5. Set up Redis monitoring and alerts
6. Implement cart recovery mechanism
7. Add cart abandonment tracking
8. Implement cart size limits
9. Add promotional code support
10. Sync cart with Inventory Service before checkout
