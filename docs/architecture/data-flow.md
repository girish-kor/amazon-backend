# Data Flow Documentation

This document describes the happy-path data flows for all critical user journeys through the e-commerce system.

## Flow 1: User Registration & Authentication

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ FLOW 1: USER REGISTRATION & LOGIN                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

REGISTRATION:
1. User → [POST /api/v1/auth/register] → Gateway
2. Gateway validates JWT required = false (public endpoint)
3. Gateway → [POST /auth/register] → Auth Service
4. Auth Service:
   - Validate email format (Zod schema)
   - Query Auth DB: SELECT * FROM users WHERE email = ?
   - If exists: return 409 Conflict
   - Generate password hash (argon2id, cost=3)
   - INSERT INTO users (id, email, password_hash, created_at)
   - INSERT INTO outbox (event_type='user.registered', payload={userId, email})
5. Outbox Relay detects new outbox row
6. Outbox Relay → [Kafka] → user.registered event
7. Response → [201 Created] → User

LOGIN:
1. User → [POST /api/v1/auth/login] → Gateway
2. Gateway → [POST /auth/login] → Auth Service
3. Auth Service:
   - Validate email, password (Zod schema)
   - Query: SELECT * FROM users WHERE email = ?
   - If not found: return 401 Unauthorized
   - Compare password with stored hash (constant-time comparison)
   - If mismatch: increment failed_attempts in Redis
   - If failed_attempts > 5: return 429 Too Many Requests (locked for 15 min)
   - If match:
     a. Generate access token (RS256, exp=15min, payload={userId, email})
     b. Generate refresh token (random 32-byte string)
     c. Hash refresh token (SHA-256)
     d. INSERT INTO refresh_tokens (user_id, token_hash, expires_at=7days)
     e. Return { accessToken, refreshToken (httpOnly cookie) }

SUBSEQUENT REQUESTS:
1. User sends every request with: Authorization: Bearer {accessToken}
2. Gateway:
   - Extract JWT from header
   - Fetch public key from Auth Service (/auth/.well-known/jwks.json) or Redis cache
   - Verify JWT signature (RS256)
   - If invalid: return 401 Unauthorized
   - If expired: return 401 Unauthorized (user must call /refresh)
   - If valid: decode payload, set X-User-Id header to downstream service
   - All downstream services receive X-User-Id header (trust gateway validation)

REFRESH TOKEN:
1. User → [POST /api/v1/auth/refresh] → Gateway
2. Gateway extracts refreshToken from httpOnly cookie
3. Gateway → [POST /auth/refresh] → Auth Service
4. Auth Service:
   - Extract user_id from refresh token cookie
   - Query: SELECT token_hash FROM refresh_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
   - Hash provided token (SHA-256), compare to token_hash (constant-time)
   - If invalid: return 401 Unauthorized
   - If valid:
     a. Generate new access token
     b. Generate new refresh token (rotate refresh token)
     c. Hash new refresh token
     d. INSERT new row in refresh_tokens table
     e. Mark old refresh_tokens row as revoked_at = NOW()
     f. Return new { accessToken, refreshToken }

LOGOUT:
1. User → [POST /api/v1/auth/logout] → Gateway
2. Gateway → [POST /auth/logout] → Auth Service
3. Auth Service:
   - Update refresh_tokens SET revoked_at = NOW() WHERE user_id = ?
   - Return 200 OK
4. User discards tokens
```

---

## Flow 2: Browse Products & Add to Cart

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ FLOW 2: BROWSE PRODUCTS & ADD TO CART                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

BROWSE PRODUCTS:
1. User → [GET /api/v1/catalog/products?category=Electronics&limit=20] → Gateway
2. Gateway → [GET /catalog/products?...] → Catalog Service
3. Catalog Service:
   - Parse query params (Zod validation)
   - Build MongoDB query: { category: 'Electronics', is_active: true }
   - Query MongoDB (with skip/limit pagination)
   - Response: [{ id, name, price, images, description, inStock }, ...]
4. Response → [200 OK] → User

SEARCH PRODUCTS:
1. User → [GET /api/v1/search?q=laptop&minPrice=500&maxPrice=2000] → Gateway
2. Gateway → [GET /search?q=laptop&...] → Search Service
3. Search Service:
   - Parse query (Zod)
   - Query Elasticsearch:
     GET /products/_search {
       "query": {
         "bool": {
           "must": [{ "match": { "name": "laptop" } }],
           "filter": [{ "range": { "price": { "gte": 500, "lte": 2000 } } }]
         }
       },
       "size": 20
     }
   - Response: [{ productId, name, price, category, inStock }, ...]
4. Response → [200 OK] → User

ADD TO CART:
1. User → [POST /api/v1/cart/items] → Gateway (with JWT)
   Payload: { productId: "abc123", quantity: 2 }
2. Gateway extracts user_id from JWT, passes as header X-User-Id
3. Gateway → [POST /cart/items] → Cart Service
4. Cart Service:
   - Validate productId, quantity (Zod)
   - Call Catalog Service (HTTP): GET /catalog/products/abc123
     - Catalog responds: { id, name, price: 899.99, inStock: true }
   - Update Redis:
     HGETALL cart:{userId} → current cart items
     Add new item: { productId: "abc123", name: "Laptop Pro", quantity: 2, unitPrice: 899.99 }
     Recalculate totalAmount: sum of (quantity * unitPrice)
     HSET cart:{userId} items=[...], totalAmount=1799.98, updatedAt=NOW()
     EXPIRE cart:{userId} 30days
   - Response: { items: [...], totalAmount: 1799.98 }
5. Response → [200 OK] → User

UPDATE CART QUANTITY:
1. User → [PUT /api/v1/cart/items/abc123] → Gateway
   Payload: { quantity: 5 }
2. Gateway → [PUT /cart/items/abc123] → Cart Service
3. Cart Service:
   - Fetch cart from Redis
   - Update item quantity
   - Recalculate total
   - HSET cart:{userId} (update)
   - Response: { items: [...], totalAmount: 4499.95 }

REMOVE ITEM FROM CART:
1. User → [DELETE /api/v1/cart/items/abc123] → Gateway
2. Gateway → [DELETE /cart/items/abc123] → Cart Service
3. Cart Service:
   - Fetch cart from Redis
   - Remove item from list
   - Recalculate total
   - Response: { items: [...], totalAmount: 0 } (if last item removed)
```

---

## Flow 3: Order Placement (Saga: Happy Path)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ FLOW 3: ORDER PLACEMENT (CHOREOGRAPHY SAGA - HAPPY PATH)                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

STEP 1: CHECKOUT INITIATION (Cart Service)
  User → [POST /api/v1/cart/checkout] → Gateway
  Payload: { shippingAddress: {...} }
  
  Gateway → [POST /cart/checkout] → Cart Service
  
  Cart Service:
    - Validate shipping address (Zod)
    - Fetch cart from Redis: cart:{userId}
    - For each item in cart:
      - Call Inventory Service: GET /inventory/{productId}
      - Inventory responds: { quantity_available: 100, quantity_reserved: 50 }
      - If available >= item.quantity: ✓ ok
      - Else: return 409 Conflict (out of stock)
    - Snapshot cart data (immutable copy)
    - INSERT INTO outbox (event='cart.checkout_initiated', payload={userId, items, total, address})
    - Outbox Relay publishes event to Kafka
    - Response: { orderId: "ord-123", status: "pending", items: [...], total: 1799.98 }

STEP 2: ORDER CREATION (Order Service)
  Kafka: cart.checkout_initiated event published
  
  Order Service subscribes to topic (consumer group: order-service-1)
  
  Order Service:
    - Parse Kafka event (JSON schema validation)
    - Check idempotency: SELECT * FROM order_events WHERE event_id = ?
      - If exists: already processed, skip
      - Else: continue
    - BEGIN TRANSACTION
    - INSERT INTO orders (id=ord-123, user_id, status='PENDING', total_amount, currency, shipping_address)
    - INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) [for each item]
    - INSERT INTO order_events (order_id, event_type='cart.checkout_initiated', event_id, payload)
    - INSERT INTO outbox (event='order.placed', payload={orderId, userId, items, total})
    - COMMIT
    - Outbox Relay publishes order.placed event

STEP 3: INVENTORY RESERVATION (Inventory Service)
  Kafka: order.placed event published
  
  Inventory Service subscribes to order.placed
  
  Inventory Service:
    - Parse event
    - Check idempotency: SELECT * FROM order_events WHERE event_id = ?
    - BEGIN TRANSACTION
    - For each item in order:
      - SELECT * FROM inventory WHERE product_id = ? FOR UPDATE (pessimistic lock)
      - quantity_available_after = quantity_available - item.quantity
      - If quantity_available_after < 0:
        - ROLLBACK
        - INSERT INTO outbox (event='inventory.reservation_failed', payload={orderId, reason: 'insufficient_stock'})
        - BREAK (don't process further items)
      - Else:
        - UPDATE inventory SET quantity_reserved += item.quantity WHERE product_id = ?
        - INSERT INTO reservations (order_id, product_id, quantity, status='PENDING', expires_at=NOW+30min)
        - INSERT INTO inventory_ledger (product_id, delta=-quantity, reason='reserved', reference_id=orderId)
    - COMMIT
    - INSERT INTO outbox (event='inventory.reserved', payload={orderId, items})
    - Outbox Relay publishes event

STEP 4A: ORDER CONFIRMATION (Order Service - Happy Path)
  Kafka: inventory.reserved event published
  
  Order Service subscribes to inventory.reserved
  
  Order Service:
    - Parse event, check idempotency
    - BEGIN TRANSACTION
    - UPDATE orders SET status='CONFIRMED' WHERE id = orderId
    - INSERT INTO order_events (event='inventory.reserved')
    - INSERT INTO outbox (event='order.payment_requested', payload={orderId, amount, userId})
    - COMMIT
    - Outbox Relay publishes payment_requested event

STEP 4B: ORDER CANCELLATION (Order Service - Failure Path if Inventory.ReservationFailed)
  Kafka: inventory.reservation_failed event published
  
  Order Service:
    - UPDATE orders SET status='CANCELLED' WHERE id = orderId
    - Response to user: order cancelled, insufficient stock

STEP 5: PAYMENT PROCESSING (Payment Service)
  Kafka: order.payment_requested event published
  
  Payment Service subscribes
  
  Payment Service:
    - Parse event
    - Check idempotency: SELECT * FROM payment_intents WHERE order_id = ?
      - If exists: return existing intent (idempotent)
    - CREATE payment intent with Stripe API
      - POST https://api.stripe.com/v1/payment_intents
      - Payload: { amount, currency, metadata: { orderId } }
      - Stripe responds: { id: 'pi_...', status: 'requires_payment_method', client_secret: '...' }
    - INSERT INTO payment_intents (order_id, provider_intent_id='pi_...', amount, status='PENDING')
    - INSERT INTO outbox (event='payment.awaiting_method', payload={orderId, clientSecret})
    - User confirms payment on frontend using client_secret
    - User → Stripe → POST https://api.stripe.com/v1/payment_intents/{intent_id}/confirm
    - Stripe → Webhook to Payment Service: event='charge.succeeded'
    - Payment Service webhook handler:
      - Verify webhook signature (HMAC-SHA256)
      - BEGIN TRANSACTION
      - INSERT INTO transactions (payment_intent_id, type='charge', amount, status='SUCCESS', provider_response={...})
      - UPDATE payment_intents SET status='SUCCEEDED' WHERE order_id = ?
      - INSERT INTO outbox (event='payment.succeeded', payload={orderId})
      - COMMIT

STEP 6: ORDER CONFIRMATION (Order Service)
  Kafka: payment.succeeded event published
  
  Order Service:
    - UPDATE orders SET status='PROCESSING' WHERE id = orderId
    - INSERT INTO order_events (event='payment.succeeded')

STEP 7: INVENTORY COMMIT (Inventory Service)
  Kafka: payment.succeeded event published (or order.confirmed might emit this)
  
  Inventory Service:
    - SELECT * FROM reservations WHERE order_id = ? FOR UPDATE
    - UPDATE inventory SET quantity_reserved -= quantity, updated_at=NOW() WHERE product_id = ?
    - UPDATE reservations SET status='COMMITTED' WHERE order_id = ?
    - INSERT INTO inventory_ledger (delta=-quantity, reason='committed', reference_id=orderId)
    - Stock is now permanently deducted

FINAL STATE:
  Order Status: PROCESSING (ready for fulfillment)
  Inventory: Stock permanently deducted
  Payment: Charged successfully
  User: Receives order confirmation email
```

---

## Flow 4: Search Product in Elasticsearch

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ FLOW 4: PRODUCT INDEXING (ASYNC VIA KAFKA EVENTS)                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

WHEN PRODUCT IS CREATED OR UPDATED:

1. Catalog Service:
   - Admin → [POST /api/v1/catalog/products] → Catalog
   - Catalog inserts/updates product in MongoDB
   - Catalog inserts event in outbox table (event='product.created')
   - Outbox Relay publishes to Kafka: product.created

2. Search Service subscribes to product.created:
   - Receive event: { productId, name, description, category, price, attributes }
   - Call Catalog API if more details needed: GET /catalog/products/{id}
   - Prepare Elasticsearch document:
     {
       "productId": "abc123",
       "name": "Laptop Pro",
       "description": "High-performance laptop",
       "category": "Electronics",
       "price": 899.99,
       "inStock": true,  ← fetched from Inventory API or cached flag
       "attributes": { "cpu": "Apple M2", "ram": "16GB" },
       "suggest": {
         "input": ["Laptop Pro", "Laptop", "Pro", "Apple"],
         "weight": 10
       }
     }
   - POST to Elasticsearch: PUT /products/_doc/{productId}
   - Index document

3. Inventory Service updates stock:
   - Inventory reserves or commits stock
   - Publishes inventory.reserved or inventory.committed event
   - Search Service listens for events, updates inStock flag
   - Elasticsearch document updated with new inStock=false (if stock exhausted)

SEARCHING:

1. User → [GET /api/v1/search?q=laptop&category=Electronics] → Gateway
2. Gateway → Search Service
3. Search Service builds Elasticsearch query:
   {
     "query": {
       "bool": {
         "must": [{ "multi_match": { "query": "laptop", "fields": ["name^2", "description"] } }],
         "filter": [{ "term": { "category": "Electronics" } }]
       }
     },
     "size": 20,
     "from": 0,
     "highlight": { "fields": { "name": {}, "description": {} } }
   }
4. Query Elasticsearch
5. Return results with highlighted matched fields
```

---

## Flow 5: Product Returns & Refunds

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ FLOW 5: PAYMENT REFUND (INITIATED BY ORDER SERVICE OR ADMIN)                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

SCENARIO: Order returned, admin initiates refund

1. Admin → [POST /api/v1/orders/ord-123/refund] → Gateway
2. Gateway → Order Service (checks admin role from JWT)
3. Order Service:
   - SELECT * FROM orders WHERE id = ord-123
   - If status not in [PROCESSING, SHIPPED, DELIVERED]: return 409 Conflict (refundable status required)
   - UPDATE orders SET status='REFUND_REQUESTED' WHERE id = ord-123
   - Call Payment Service API: POST /payments/refund
     Payload: { orderId: 'ord-123', amount: 1799.98 }

4. Payment Service:
   - Idempotency check: SELECT * FROM transactions WHERE order_id = ? AND type='REFUND'
     - If exists: return existing result
   - SELECT * FROM payment_intents WHERE order_id = ?
   - Call Stripe API: POST /v1/refunds { payment_intent: 'pi_...', amount: 179998 (in cents) }
   - Stripe responds: { id: 're_...', status: 'succeeded' }
   - BEGIN TRANSACTION
   - INSERT INTO transactions (payment_intent_id, type='REFUND', amount, status='SUCCESS', provider_response={...})
   - INSERT INTO outbox (event='payment.refunded', payload={orderId, amount})
   - COMMIT

5. Inventory Service listens for order.refunded event:
   - RELEASE reserved stock OR unreserve already-committed stock
   - UPDATE inventory SET quantity_available += quantity WHERE product_id IN (...)
   - UPDATE reservations SET status='RELEASED' WHERE order_id = ?
   - INSERT INTO inventory_ledger (delta=+quantity, reason='refunded', reference_id=orderId)

6. Order Service updates order status:
   - UPDATE orders SET status='REFUNDED' WHERE id = ord-123

FINAL STATE:
  Order Status: REFUNDED
  Inventory: Stock returned to available pool
  Payment: Refunded to customer's payment method
```

---

## Data Consistency Guarantees

| Operation | Consistency | Guarantee |
|-----------|-------------|-----------|
| User reads product | Eventual (1 sec) | Elasticsearch may lag Catalog by up to 1 second |
| User places order → stock reserved | Strong (synchronous) | Inventory reserve is pessimistically locked; fails immediately if insufficient stock |
| Stock committed after payment | Eventual (1-5 sec) | Inventory commits after payment.succeeded event (Kafka propagation + Inventory processing) |
| Search results updated | Eventual (1-2 sec) | Elasticsearch indexed asynchronously after product.updated event |
| User sees refund in account | Eventual (1-3 sec) | Stripe webhook → Payment → Inventory → Order state updates |

---

## Updated: April 17, 2026
