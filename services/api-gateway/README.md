# API Gateway Service

The API Gateway is the single entry point for all external client requests. It provides authentication, routing, rate limiting, circuit breaking, and request/response logging.

## Features

- **JWT Authentication**: Validates JWT tokens from Authorization header
- **Service Routing**: Routes requests to appropriate backend services based on URL path
- **Rate Limiting**: Per-IP rate limiting to prevent abuse (100 requests per 15 minutes default)
- **Circuit Breaker**: Detects and isolates failing services to prevent cascading failures
- **Request/Response Logging**: Structured logging with request ID and trace ID tracking
- **Security Middleware**: Helmet.js for HTTP header security
- **Health Checks**: `/health` and `/ready` endpoints for Kubernetes probes
- **Service Status**: `/api/status` endpoint showing circuit breaker state of all services

## Architecture

### Request Flow

```
Client Request
    ↓
Rate Limiter (Per-IP)
    ↓
JWT Middleware (if required)
    ↓
Service Router
    ↓
Service Proxy with Circuit Breaker & Retry
    ↓
Backend Service
    ↓
Response returned through proxy
```

### Service Routing

| Path | Service | Auth |
|------|---------|------|
| `/api/auth/*` | Auth Service | Optional |
| `/api/products` | Catalog Service | Optional |
| `/api/search` | Search Service | Optional |
| `/api/cart` | Cart Service | Required |
| `/api/orders` | Order Service | Required |

### Rate Limiting

- **Window**: 15 minutes
- **Limit**: 100 requests per window per IP
- **Response**: HTTP 429 when limit exceeded
- **Backoff**: Automatic, returns `Retry-After` header

### Circuit Breaker

Implemented per service with three states:

1. **Closed**: Normal operation, requests proxied normally
2. **Open**: Service failed (threshold reached), requests rejected immediately
3. **Half-Open**: Recovery attempt, limited requests allowed

**Configuration**:
- Failure threshold: 5 consecutive failures
- Success threshold: 2 consecutive successes to close
- Reset timeout: 60 seconds

### Request/Response Handling

All requests include:
- `X-Request-Id`: Unique identifier for the request
- `X-Trace-Id`: Correlation ID for distributed tracing
- `X-User-Id`: User ID (if authenticated)

All responses from gateway include original service response status and headers.

## API Endpoints

### Health & Status

```bash
# Health check
GET /health

# Readiness check
GET /ready

# Service status (circuit breaker state)
GET /api/status
```

### Authentication Routes

```bash
# Register user
POST /api/auth/register
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "password123"
}

# Login
POST /api/auth/login
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "password123"
}

# Get current user (requires auth)
GET /api/auth/me
Authorization: Bearer <JWT_TOKEN>

# Refresh token
POST /api/auth/refresh
```

### Product Routes

```bash
# List products
GET /api/products?page=1&limit=20&category=electronics

# Get product details
GET /api/products/{id}

# Create product (requires auth)
POST /api/products
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
{
  "sku": "PROD-001",
  "name": "Product Name",
  "basePrice": 99.99,
  "currency": "USD",
  "categoryId": "cat-001"
}

# Search products
GET /api/search?q=electronics&minPrice=100&maxPrice=500&inStock=true
```

### Cart Routes (Requires Authentication)

```bash
# Get cart
GET /api/cart
Authorization: Bearer <JWT_TOKEN>

# Add item to cart
POST /api/cart/items
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
{
  "productId": "prod-001",
  "quantity": 2
}

# Checkout
POST /api/cart/checkout
Authorization: Bearer <JWT_TOKEN>
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
```

### Order Routes (Requires Authentication)

```bash
# List orders
GET /api/orders?page=1&limit=20
Authorization: Bearer <JWT_TOKEN>

# Get order details
GET /api/orders/{orderId}
Authorization: Bearer <JWT_TOKEN>
```

## Configuration

Environment variables:

```bash
# Server
API_GATEWAY_PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
CATALOG_SERVICE_URL=http://localhost:3002
INVENTORY_SERVICE_URL=http://localhost:3003
CART_SERVICE_URL=http://localhost:3004
ORDER_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3006
SEARCH_SERVICE_URL=http://localhost:3007
```

## Development

### Start Gateway

```bash
pnpm dev
```

The gateway will start on port 3000 (or `API_GATEWAY_PORT` if set).

### Test with cURL

```bash
# Health check
curl http://localhost:3000/health

# List products (no auth required)
curl http://localhost:3000/api/products

# Get cart (requires auth)
curl -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:3000/api/cart
```

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `NOT_FOUND` | 404 | Endpoint not found |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `SERVICE_UNAVAILABLE` | 503 | Backend service is down or circuit breaker open |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

## Monitoring

### Prometheus Metrics

The gateway exposes metrics on `/metrics` endpoint (per service pattern).

### Jaeger Tracing

All requests include trace ID for distributed tracing via Jaeger UI (http://localhost:16686).

## Production Deployment

For production:

1. Enable HTTPS/TLS
2. Implement OAuth/OIDC for more robust auth
3. Use API key management system
4. Implement advanced rate limiting (token bucket, sliding window)
5. Add request signing for service-to-service communication
6. Enable CORS appropriately
7. Implement DDoS protection
8. Use Kong, AWS API Gateway, or similar managed solution
9. Implement API versioning
10. Add request/response validation and transformation

## Troubleshooting

### Service returning 503

- Check service is running: `docker-compose ps`
- Check logs: `docker-compose logs api-gateway`
- Check circuit breaker state: `curl http://localhost:3000/api/status`

### Rate limit errors

- Check IP is not blocked
- Use different IP for testing (varies by environment)
- Increase `RATE_LIMIT_CONFIG.maxRequests` if needed

### JWT validation errors

- Ensure token hasn't expired
- Verify token is in correct format: `Bearer <token>`
- Check token was issued by Auth Service
