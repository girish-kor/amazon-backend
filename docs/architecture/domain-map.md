# Domain Ownership Map

This document defines which service owns (is the source of truth for) each data entity. This is the most critical artifact for preventing database sharing anti-patterns.

## Entity Ownership Table

| Entity | Owner Service | Owns | Does NOT Own | Consumers |
|--------|---------------|------|--------------|-----------|
| **User** | Auth | Identity, credentials, password hash, sessions, refresh tokens | Order history, cart state | All services (read-only) |
| **Password Reset Token** | Auth | Reset token generation, expiry, revocation | User password (only Auth can update) | Auth |
| **RefreshToken** | Auth | Storage, revocation, rotation strategy | Access token contents | Auth |
| **Product** | Catalog | Product metadata, name, description, SKU, attributes, images, pricing, categories | Stock levels, search index | Search, Inventory (consumers), Cart, Order |
| **Category** | Catalog | Category tree, names, hierarchy | Product assignment | Catalog API consumer |
| **Stock Level** | Inventory | Current inventory, reserved amounts, warehouse locations | Product description | Cart, Order (readers), Search (reader for "in stock" flag) |
| **Reservation** | Inventory | Reservation state (pending/committed/released), expiry, order linkage | Order total amount | Order (via events), Payment (via events) |
| **Cart** | Cart | Cart items, quantities, total amount, expiry (30 days) | Order creation (order service owns that) | Cart API consumer |
| **Order** | Order | Order lifecycle, status, items, timestamps, audit log | Inventory decisions (reads inventory), Payment status (reads via events) | Order API consumer, fulfillment system |
| **Order Item** | Order | Item quantity, unit price at order time, product link | Current product price (read from Catalog at order time) | Order, Fulfillment |
| **Payment Intent** | Payment | Transaction records, status, provider reference IDs | Order state (reads from Order) | Payment API consumer, webhook handler |
| **Transaction** | Payment | Financial transaction log (append-only), refund records, amounts | Business decisions about payment (those are in Order) | Payment API consumer |
| **Search Index** | Search | Elasticsearch index (derived projection) | Product source of truth (Catalog owns that) | Search API consumer |
| **Kafka Event Log** | Event Stream | Event immutability, topic configuration, retention | Business state (that lives in service databases) | All services (async readers) |
| **API Request Log** | Gateway | Request metadata, response codes, latencies | Business logic results (those owned by domain services) | Observability stack |
| **Trace** | Observability | Distributed trace storage and retrieval | Business logic state | Operations team |

## Data Flow by Entity

### User Registration Flow
```
1. Auth Service receives POST /auth/register
2. Auth validates email uniqueness (queries Auth DB)
3. Auth creates user record in users table (Auth DB)
4. Auth emits user.registered event to Kafka
5. Catalog Service (or other services) consumes event for any one-time setup
   - Services do NOT store copies of user profile — they keep user_id only
```

**Rule:** No other service has a `users` table. All user lookups go through Auth Service API or cache Auth's public key for JWT validation.

### Product Creation Flow
```
1. Admin calls POST /catalog/products on Catalog Service
2. Catalog creates product in MongoDB (Catalog DB owns this)
3. Catalog emits product.created event
4. Search Service consumes event, indexes product in Elasticsearch (Search index is derived)
5. Inventory Service consumes event, creates inventory row for that product_id
```

**Rule:** Inventory has a foreign key to Product.id but does NOT copy product data. Inventory service queries Catalog API if it needs product details (name, price).

### Order Placement Flow
```
1. Cart Service receives POST /cart/checkout
2. Cart calls Inventory Service to check availability (sync HTTP)
3. Cart emits cart.checkout_initiated event
4. Order Service consumes event, creates order with snapshot of cart items + prices
5. Order Service emits order.placed event
6. Inventory Service consumes event, creates reservations (reserves stock)
7. Order Service consumes inventory.reserved event, updates order status
8. Order Service emits order.payment_requested event
9. Payment Service consumes event, creates payment intent
10. Payment Service emits payment.succeeded (or payment.failed) event
11. Order Service consumes payment.succeeded, updates order status
12. Inventory Service consumes payment.succeeded, commits reservations (actual deduction)
```

**Rule:** Order Service stores a snapshot of item prices (immutable). It does NOT call Catalog for current prices — the cart already validated those. Inventory is single source of truth for stock counts (owns the numbers).

### Search Index Flow (Eventual Consistency)
```
1. Catalog Service updates product (PUT /catalog/products/:id)
2. Catalog updates MongoDB (Catalog DB)
3. Catalog emits product.updated event to Kafka
4. Search Service consumes event (possibly 100ms–1 second delay)
5. Search Service updates Elasticsearch index
6. User searches via GET /search?q=...
7. If user needs real-time product price/stock, Search redirects to Catalog/Inventory APIs
   (Search is optimized for text matching, not price changes)
```

**Rule:** Search index is a read-only cache of Catalog. It is not authoritative — product.description in Search may be stale by 1 second.

## Boundaries (Explicit Non-Ownership)

| Service | Does NOT Own |
|---------|--------------|
| Auth | Orders, Products, Inventory, Cart contents |
| Catalog | User data, Stock levels, Orders, Search index |
| Inventory | Product descriptions, Pricing, User preferences |
| Cart | Orders, Final payment records, Product stock commitment |
| Order | Payment authorization decisions (Payment owns that), Inventory operations (Inventory owns that) |
| Payment | Order state, Refund decisions tied to order (Order service initiates refunds via API call to Payment) |
| Search | Product source of truth, Stock authoritative counts |
| Gateway | Any business logic (it is routing/middleware only) |

## Query Patterns

### When Service A Needs Data Owned by Service B

**Pattern 1: Synchronous HTTP (when you need immediate consistency)**
- Cart Service needs current Product price → calls Catalog API `GET /catalog/products/:id`
- Handles failures: return error to user, do not cache stale data

**Pattern 2: Kafka Events (when eventual consistency acceptable)**
- Search Service needs to know about new products → listens to `product.created` event from Catalog
- Search indexes product asynchronously

**Pattern 3: Cache (when data is read-heavy, acceptable staleness)**
- Auth Service caches user roles (short TTL: 5 min) → Redis
- On role change, event emitted to invalidate cache

**Pattern 4: Snapshot at Write (when capturing a point-in-time state)**
- Order Service captures product prices when order is placed
- Prices are immutable in Order (for billing accuracy)
- Order does NOT read current prices from Catalog

## Forbidden Patterns

❌ **Service A directly querying Service B's database** (e.g., Order Service doing `SELECT * FROM catalog.products`)
- Violates encapsulation
- Creates tight coupling
- Makes it impossible to change Service B's schema or DB type

❌ **Circular dependencies** (e.g., Catalog calls Order API, Order calls Catalog API)
- Design issue: one direction should be implied
- If both services need to coordinate, use Kafka events or external orchestration

❌ **Shared database between services** (e.g., Auth and Cart both reading/writing `users` table)
- Prevents independent scaling
- Makes deployment coordination mandatory
- Creates implicit coupling through schema

❌ **Data duplication without event-driven sync** (e.g., Order Service manually copying user_id AND email into orders table)
- Risk: emails get out of sync if Auth updates email
- Solution: Store only user_id in Order; read email from Auth API if needed

## Audit Trail

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-04-17 | Initial domain map created for Phase 1 |
